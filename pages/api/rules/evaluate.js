// pages/api/rules/evaluate.js
import { Client } from "pg";

/**
 * Rule Engine V2 — Neon-backed
 *
 * Called like:
 *   /api/rules/evaluate?vendorId=2&orgId=2
 *
 * Reads:
 *   - vendors
 *   - policies
 *   - requirements_groups_v2
 *   - requirements_rules_v2
 *
 * Writes:
 *   - alerts (for failing rules)
 *   - risk_history (snapshot based on rule severity)
 *
 * Returns:
 * {
 *   ok: true,
 *   summary: string,
 *   status: "ok" | "attention" | "fail",
 *   counts: { Critical, High, Medium, Low },
 *   events: [
 *     {
 *       ruleId,
 *       groupId,
 *       groupName,
 *       severity,
 *       result: "passing" | "failing" | "missing",
 *       field_key,
 *       operator,
 *       expected_value,
 *       detail
 *     }
 *   ]
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
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL;

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();

    // 1) Load vendor
    const vendorResult = await client.query(
      `
      SELECT *
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

    // 2) Load policies
    const policiesResult = await client.query(
      `
      SELECT *
      FROM policies
      WHERE vendor_id = $1
        ${numericOrgId ? "AND org_id = $2" : ""}
      ORDER BY created_at DESC, id DESC;
      `,
      numericOrgId ? [numericVendorId, numericOrgId] : [numericVendorId]
    );
    const policies = policiesResult.rows;

    // 3) Load groups + rules (V2)
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
      return res.status(200).json({
        ok: true,
        summary: "No Rule Engine V2 groups defined for this organization yet.",
        status: "ok",
        counts: { Critical: 0, High: 0, Medium: 0, Low: 0 },
        events: [],
      });
    }

    const groupIds = groups.map((g) => g.id);

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

    const groupById = new Map();
    groups.forEach((g) => groupById.set(g.id, g));

    // 4) Evaluate rules
    const events = [];
    const counts = { Critical: 0, High: 0, Medium: 0, Low: 0 };

    for (const rule of rules) {
      const group = groupById.get(rule.group_id);
      const ev = evaluateRule(rule, group, { vendor, policies });

      events.push(ev);

      if (ev.result === "failing") {
        const sev = ev.severity || "Medium";
        if (counts[sev] != null) counts[sev] += 1;
      }
    }

    // 5) Compute status + summary
    let status = "ok";
    const totalFailing =
      counts.Critical + counts.High + counts.Medium + counts.Low;

    if (counts.Critical > 0 || counts.High > 0) status = "fail";
    else if (totalFailing > 0) status = "attention";

    const summaryParts = [];
    if (policies.length === 0) {
      summaryParts.push(
        "No policies found on file; many rules may be indeterminate or treated as missing."
      );
    } else {
      summaryParts.push(
        `Evaluated ${rules.length} rule${
          rules.length === 1 ? "" : "s"
        } against ${policies.length} policy${
          policies.length === 1 ? "" : "ies"
        }.`
      );
    }

    if (totalFailing > 0) {
      summaryParts.push(
        `${totalFailing} rule${
          totalFailing === 1 ? "" : "s"
        } failing (${counts.Critical} Critical, ${counts.High} High, ${counts.Medium} Medium, ${counts.Low} Low).`
      );
    } else {
      summaryParts.push("No rules currently failing.");
    }

    const summary = summaryParts.join(" ");

    // 6) Write alerts & risk snapshot
    await writeRuleAlertsAndRiskHistory(client, {
      orgId: numericOrgId || vendor.org_id || null,
      vendorId: numericVendorId,
      status,
      counts,
      events,
    });

    return res.status(200).json({
      ok: true,
      summary,
      status,
      counts,
      events,
    });
  } catch (err) {
    console.error("rules/evaluate error:", err);
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
 * Evaluate a rule against vendor + policies.
 * Supports field_key prefixes:
 *   - "policy."  e.g. policy.coverage_type, policy.carrier, policy.status
 *   - "vendor."  e.g. vendor.name, vendor.category, vendor.address
 *   - "doc." or "endorsement." -> currently treated as "missing" (until we wire docs/endorsements)
 */
function evaluateRule(rule, group, context) {
  const { vendor, policies } = context;

  const fieldKeyRaw = (rule.field_key || "").trim();
  const operator = (rule.operator || "equals").toLowerCase().trim();
  const expected = (rule.expected_value || "").trim();

  const groupName = group?.name || "";
  const severity = rule.severity || "Medium";

  // Default: treat as policy.coverage_type if no prefix
  let scope = "policy";
  let fieldPath = "coverage_type";

  if (fieldKeyRaw.includes(".")) {
    const [sc, path] = fieldKeyRaw.split(".", 2);
    scope = sc.toLowerCase();
    fieldPath = path;
  } else if (fieldKeyRaw) {
    fieldPath = fieldKeyRaw;
  }

  let result = "missing";
  let detail = "";

  // GET VALUES
  const values = [];
  if (scope === "policy") {
    for (const p of policies) {
      values.push(readField(p, fieldPath));
    }
  } else if (scope === "vendor") {
    values.push(readField(vendor, fieldPath));
  } else if (scope === "doc" || scope === "endorsement") {
    // Not wired yet — treat as missing, explain in detail
    result = "missing";
    detail =
      (rule.requirement_text || "Document / endorsement check.") +
      " This rule targets docs/endorsements, but the document engine is not yet wired, so it is treated as missing.";
    return buildRuleEvent(rule, groupName, severity, fieldKeyRaw, operator, expected, result, detail);
  } else {
    // Unknown scope
    detail =
      (rule.requirement_text || "Requirement check.") +
      ` Unsupported scope "${scope}" in field_key "${fieldKeyRaw}".`;
    result = "missing";
    return buildRuleEvent(rule, groupName, severity, fieldKeyRaw, operator, expected, result, detail);
  }

  const hasAny = values.some((v) => v !== null && v !== undefined && String(v).trim() !== "");

  // EVALUATION
  if (!hasAny && operator !== "missing") {
    result = "missing";
    detail =
      (rule.requirement_text || "Requirement check.") +
      ` No value found for field "${fieldKeyRaw}" in the evaluated context.`;
  } else {
    const passed = evaluateOperator(values, operator, expected);
    if (passed === null) {
      result = "missing";
      detail =
        (rule.requirement_text || "Requirement check.") +
        ` Operator "${operator}" with expected="${expected}" could not be evaluated against current values.`;
    } else if (passed === true) {
      result = "passing";
      detail =
        (rule.requirement_text || "Requirement check.") +
        " Rule conditions are currently satisfied.";
    } else {
      result = "failing";
      detail =
        (rule.requirement_text || "Requirement check.") +
        " Rule conditions are not satisfied.";
    }
  }

  return buildRuleEvent(
    rule,
    groupName,
    severity,
    fieldKeyRaw || "policy.coverage_type",
    operator,
    expected,
    result,
    detail
  );
}

function readField(obj, key) {
  if (!obj) return "";
  const v = obj[key];
  if (v === undefined || v === null) return "";
  return String(v);
}

/**
 * Evaluate an operator against an array of values.
 * Returns:
 *   true  -> passes
 *   false -> fails
 *   null  -> cannot evaluate
 */
function evaluateOperator(values, operator, expected) {
  const clean = values
    .map((v) => (v == null ? "" : String(v)))
    .filter((v) => v.length > 0);

  if (clean.length === 0 && operator !== "missing") return null;

  switch (operator) {
    case "equals":
      if (!expected) return null;
      return clean.some((v) => v === expected);

    case "not_equals":
      if (!expected) return null;
      return clean.some((v) => v !== expected);

    case "contains":
      if (!expected) return null;
      return clean.some((v) =>
        v.toLowerCase().includes(expected.toLowerCase())
      );

    case "exists":
      return clean.length > 0;

    case "missing":
      return clean.length === 0;

    case "gt":
    case "gte":
    case "lt":
    case "lte": {
      if (!expected) return null;
      const expectedNum = Number(expected);
      if (Number.isNaN(expectedNum)) return null;
      const nums = clean.map((v) => Number(v.replace(/[^0-9.]/g, ""))).filter((n) => !Number.isNaN(n));
      if (nums.length === 0) return null;
      if (operator === "gt") return nums.some((n) => n > expectedNum);
      if (operator === "gte") return nums.some((n) => n >= expectedNum);
      if (operator === "lt") return nums.some((n) => n < expectedNum);
      if (operator === "lte") return nums.some((n) => n <= expectedNum);
      return null;
    }

    default:
      return null;
  }
}

function buildRuleEvent(
  rule,
  groupName,
  severity,
  field_key,
  operator,
  expected_value,
  result,
  detail
) {
  return {
    ruleId: rule.id,
    groupId: rule.group_id,
    groupName,
    severity,
    result, // "passing" | "failing" | "missing"
    field_key,
    operator,
    expected_value,
    requirement_text: rule.requirement_text || "",
    internal_note: rule.internal_note || "",
    detail,
  };
}

/**
 * Write alerts + risk history based on rule evaluation results.
 */
async function writeRuleAlertsAndRiskHistory(client, { orgId, vendorId, status, counts, events }) {
  const now = new Date().toISOString();

  // Alerts for failing rules only
  const failingEvents = events.filter((e) => e.result === "failing");

  for (const ev of failingEvents) {
    await client.query(
      `
      INSERT INTO alerts (
        id, created_at, is_read, org_id, vendor_id, type, message
      ) VALUES (
        gen_random_uuid(), $1, FALSE, $2, $3, $4, $5
      );
      `,
      [
        now,
        orgId || null,
        vendorId,
        "rule_failure",
        ev.detail ||
          `Rule ${ev.ruleId} in group ${ev.groupName || ""} is failing.`,
      ]
    );
  }

  // Risk score based on failing counts & severity
  let riskScore = 100;
  riskScore -= (counts.Critical || 0) * 25;
  riskScore -= (counts.High || 0) * 15;
  riskScore -= (counts.Medium || 0) * 10;
  riskScore -= (counts.Low || 0) * 5;
  if (riskScore < 0) riskScore = 0;

  await client.query(
    `
    INSERT INTO risk_history (
      id, created_at, vendor_id, org_id, risk_score, days_left, elite_status
    ) VALUES (
      gen_random_uuid(), $1, $2, $3, $4, $5, $6
    );
    `,
    [
      now,
      vendorId,
      orgId || null,
      riskScore,
      0,
      riskScore >= 90 ? "Elite" : riskScore >= 70 ? "Preferred" : "Watch",
    ]
  );
}
