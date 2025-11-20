// pages/api/requirements/check.js
import { Client } from "pg";

/**
 * REAL Requirements Engine (V2 only, Neon-backed)
 *
 * Called like:
 *   /api/requirements/check?vendorId=2&orgId=1
 *
 * Reads:
 *   - vendors
 *   - policies
 *   - requirements_groups_v2
 *   - requirements_rules_v2
 *
 * Returns:
 * {
 *   ok: true,
 *   summary: string,
 *   status: "ok" | "attention" | "fail",
 *   missing: [{ ruleId, groupId, coverage_type, requirement_text, severity, detail }],
 *   failing: [{ ...same shape }],
 *   passing: [{ ...same shape }]
 * }
 */

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res
      .status(405)
      .json({ ok: false, error: "Method not allowed" });
  }

  const { vendorId, orgId } = req.query;

  const numericVendorId = Number(vendorId);
  const numericOrgId = orgId ? Number(orgId) : null;

  if (!numericVendorId || Number.isNaN(numericVendorId)) {
    return res.status(400).json({
      ok: false,
      error: "vendorId must be a numeric ID",
    });
  }

  const connectionString =
    process.env.POSTGRES_URL_NO_SSL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL;

  const client = new Client({ connectionString });

  try {
    await client.connect();

    // 1) Verify vendor exists
    const vendorResult = await client.query(
      `
      SELECT id, org_id, name
      FROM vendors
      WHERE id = $1
      LIMIT 1;
      `,
      [numericVendorId]
    );

    if (vendorResult.rows.length === 0) {
      return res
        .status(404)
        .json({ ok: false, error: "Vendor not found" });
    }

    const vendor = vendorResult.rows[0];

    // 2) Load policies for this vendor
    const policiesResult = await client.query(
      `
      SELECT
        id,
        coverage_type,
        status,
        policy_number,
        carrier,
        effective_date,
        expiration_date,
        org_id
      FROM policies
      WHERE vendor_id = $1
        ${numericOrgId ? "AND org_id = $2" : ""}
      ORDER BY created_at DESC, id DESC;
      `,
      numericOrgId ? [numericVendorId, numericOrgId] : [numericVendorId]
    );

    const policies = policiesResult.rows;

    // 3) Load active requirement groups for this org (or global ones if org_id is null)
    const groupsResult = await client.query(
      `
      SELECT id, org_id, name, description, is_active
      FROM requirements_groups_v2
      WHERE is_active = TRUE
        AND (org_id IS NULL OR org_id = $1)
      ORDER BY id ASC;
      `,
      [vendor.org_id || numericOrgId || 0]
    );
    const groups = groupsResult.rows;

    if (groups.length === 0) {
      // No V2 groups defined yet — return "no requirements" but don't crash.
      return res.status(200).json({
        ok: true,
        summary: "No V2 requirements defined for this organization yet.",
        status: "ok",
        missing: [],
        failing: [],
        passing: [],
      });
    }

    const groupIds = groups.map((g) => g.id);

    // 4) Load active rules for these groups
    const rulesResult = await client.query(
      `
      SELECT
        id,
        group_id,
        is_active,
        created_at,
        expected_value,
        severity,
        requirement_text,
        internal_note,
        field_key,
        operator
      FROM requirements_rules_v2
      WHERE is_active = TRUE
        AND group_id = ANY($1::bigint[])
      ORDER BY group_id ASC, id ASC;
      `,
      [groupIds]
    );

    const rules = rulesResult.rows;

    // Map groups by id for easy lookup
    const groupById = new Map();
    groups.forEach((g) => groupById.set(g.id, g));

    // 5) Evaluate rules against policies
    const missing = [];
    const failing = [];
    const passing = [];

    for (const rule of rules) {
      const group = groupById.get(rule.group_id);
      const evaluation = evaluateRuleAgainstPolicies(rule, group, policies);

      if (evaluation.result === "passing") {
        passing.push(evaluation.entry);
      } else if (evaluation.result === "missing") {
        missing.push(evaluation.entry);
      } else if (evaluation.result === "failing") {
        failing.push(evaluation.entry);
      }
    }

    // 6) Build summary + status
    let status = "ok";
    if (failing.length > 0) status = "fail";
    else if (missing.length > 0) status = "attention";

    const summaryParts = [];
    if (policies.length === 0) {
      summaryParts.push(
        "No policies found on file for this vendor. All coverage is effectively missing until a COI is uploaded."
      );
    } else {
      summaryParts.push(
        `Found ${policies.length} policy${policies.length === 1 ? "" : "ies"} on file.`
      );
    }

    if (failing.length > 0) {
      summaryParts.push(
        `${failing.length} requirement${failing.length === 1 ? "" : "s"} failing.`
      );
    }
    if (missing.length > 0) {
      summaryParts.push(
        `${missing.length} requirement${missing.length === 1 ? "" : "s"} missing coverage or data.`
      );
    }
    if (failing.length === 0 && missing.length === 0) {
      summaryParts.push("All active requirements currently satisfied.");
    }

    const summary = summaryParts.join(" ");

    // (Optional) — you *could* write to vendor_compliance_cache here later.
    // For now we just return the evaluation in the response.

    return res.status(200).json({
      ok: true,
      summary,
      status,
      missing,
      failing,
      passing,
    });
  } catch (err) {
    console.error("requirements/check error:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Server error",
    });
  } finally {
    try {
      await client.end();
    } catch {
      // ignore
    }
  }
}

/**
 * Evaluate a single V2 requirement rule against all policies.
 *
 * Rule fields:
 * - field_key: which policy field to look at (coverage_type, status, carrier, policy_number, effective_date, expiration_date)
 * - operator: equals | not_equals | contains | missing | exists
 * - expected_value: string to compare against
 *
 * Returns:
 *   { result: "passing" | "missing" | "failing", entry: {...} }
 */
function evaluateRuleAgainstPolicies(rule, group, policies) {
  const fieldKey = (rule.field_key || "").trim() || "coverage_type";
  const operator = (rule.operator || "equals").toLowerCase().trim();
  const expected = (rule.expected_value || "").trim();

  const groupName = group?.name || "";
  const coverageLabel = fieldKey === "coverage_type" ? expected : "";

  // Pull all values from policies for this field
  const values = policies.map((p) => {
    switch (fieldKey) {
      case "coverage_type":
        return p.coverage_type || "";
      case "status":
        return p.status || "";
      case "carrier":
        return p.carrier || "";
      case "policy_number":
        return p.policy_number || "";
      case "effective_date":
        return p.effective_date || "";
      case "expiration_date":
        return p.expiration_date || "";
      default:
        return "";
    }
  });

  const hasAnyPolicy = policies.length > 0;
  const hasAnyValue = values.some((v) => v && v.length > 0);

  let rulePassed = false;
  let ruleMissing = false;

  if (!hasAnyPolicy) {
    // No policies at all: treat as missing coverage in general.
    ruleMissing = true;
  } else {
    switch (operator) {
      case "equals":
        if (!expected) {
          // can't evaluate meaningful equals without expected value
          ruleMissing = !hasAnyValue;
        } else {
          rulePassed = values.some((v) => v === expected);
          ruleMissing = !rulePassed && !hasAnyValue;
        }
        break;
      case "not_equals":
        if (!expected) {
          rulePassed = hasAnyValue;
        } else {
          rulePassed = values.some((v) => v !== expected && v !== "");
          ruleMissing = !hasAnyValue;
        }
        break;
      case "contains":
        if (!expected) {
          ruleMissing = !hasAnyValue;
        } else {
          rulePassed = values.some((v) =>
            String(v).toLowerCase().includes(expected.toLowerCase())
          );
          ruleMissing = !rulePassed && !hasAnyValue;
        }
        break;
      case "missing":
        // requirement is: field should be missing (rare, but possible)
        rulePassed = !hasAnyValue;
        ruleMissing = false;
        break;
      case "exists":
        rulePassed = hasAnyValue;
        ruleMissing = !hasAnyValue;
        break;
      default:
        // unsupported operator -> treat as "unknown", don't fail vendor, mark as missing
        ruleMissing = true;
        break;
    }
  }

  let result = "failing";
  if (rulePassed) result = "passing";
  else if (ruleMissing) result = "missing";

  const baseDetail = rule.requirement_text || "Requirement check.";
  const detail = buildDetailMessage({
    baseDetail,
    fieldKey,
    operator,
    expected,
    hasAnyPolicy,
    hasAnyValue,
    rulePassed,
  });

  const entry = {
    ruleId: rule.id,
    groupId: rule.group_id,
    groupName,
    coverage_type: coverageLabel,
    severity: rule.severity || "Medium",
    requirement_text: rule.requirement_text || "",
    internal_note: rule.internal_note || "",
    field_key: fieldKey,
    operator,
    expected_value: expected,
    detail,
  };

  return { result, entry };
}

function buildDetailMessage({
  baseDetail,
  fieldKey,
  operator,
  expected,
  hasAnyPolicy,
  hasAnyValue,
  rulePassed,
}) {
  const pieces = [];

  if (!hasAnyPolicy) {
    pieces.push(
      "No policies are on file for this vendor, so this requirement could not be satisfied."
    );
  } else if (!hasAnyValue && operator !== "missing") {
    pieces.push(
      `No value found for field "${fieldKey}" on any policy.`
    );
  } else {
    if (operator === "equals" && expected) {
      pieces.push(
        `Looking for at least one policy where "${fieldKey}" equals "${expected}".`
      );
    } else if (operator === "contains" && expected) {
      pieces.push(
        `Looking for at least one policy where "${fieldKey}" contains "${expected}".`
      );
    } else if (operator === "exists") {
      pieces.push(
        `At least one policy should have a non-empty value for "${fieldKey}".`
      );
    } else if (operator === "missing") {
      pieces.push(
        `No policy should have a value for "${fieldKey}".`
      );
    } else {
      pieces.push(
        `Operator "${operator}" used for field "${fieldKey}".`
      );
    }

    pieces.push(rulePassed ? "Requirement is currently satisfied." : "Requirement is not satisfied.");
  }

  if (baseDetail) {
    return baseDetail + " " + pieces.join(" ");
  }
  return pieces.join(" ");
}
