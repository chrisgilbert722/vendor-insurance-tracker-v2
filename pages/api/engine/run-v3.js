// pages/api/engine/run-v3.js
// ============================================================
// RULE ENGINE V5 — COVERAGE REQUIREMENTS EVALUATOR + ALERT PIPELINE
//
// POST /api/engine/run-v3
// Body: { vendorId, orgId, dryRun?: boolean }
//
// Does:
// 1) Load vendor policies (policies table)
// 2) Load org V5 rules (requirements_rules_v2)
// 3) Evaluate each rule across ALL policies
//    - A rule PASSES if ANY policy satisfies it
// 4) Writes rule_results_v3 (unless dryRun)
// 5) Logs to system_timeline
// 6) Updates vendor_compliance_cache (best effort)
// 7) V5 ALERT PIPELINE:
//    - Resolves old engine alerts for this vendor/org
//    - Creates new alerts in alerts table for each failing rule
//
// ⭐ Now also integrates CONTRACT RULES V5:
//    - Uses vendors.contract_* fields (populated by Contract Matching V3)
//    - Merges contract failures into failingRules for UI & scoring
//    - Adjusts globalScore to respect contract risk
//    - Does NOT double-insert contract issues into rule_results_v3/alerts
// ============================================================

import { sql } from "../../../lib/db";
import { getContractRuleResultsForVendor } from "../../../lib/engineV5/contractRulesV5";

export const config = {
  api: {
    bodyParser: { sizeLimit: "1mb" },
  },
};

/* ============================================================
   SCORE HELPER (same scale you already use)
============================================================ */
function computeScoreFromFailures(failures = []) {
  let score = 100;

  for (const f of failures) {
    const sev = (f.severity || "").toLowerCase();
    if (sev === "critical") score -= 35;
    else if (sev === "high") score -= 25;
    else if (sev === "medium") score -= 15;
    else if (sev === "low") score -= 5;
    else score -= 5;
  }

  if (score < 0) score = 0;
  if (score > 100) score = 100;
  return Math.round(score);
}

/* ============================================================
   V5 RULE EVALUATION HELPERS
============================================================ */

// Guess type from field_key
function inferType(fieldKey) {
  if (!fieldKey) return "string";
  const key = fieldKey.toLowerCase();
  if (key.includes("date")) return "date";
  if (key.includes("limit") || key.includes("amount") || key.includes("gl"))
    return "number";
  return "string";
}

// Map V5 rule field_key → policy row value
function resolvePolicyValue(policy, fieldKey) {
  if (!fieldKey) return undefined;

  let key = fieldKey;
  if (key.startsWith("policy.")) {
    key = key.split(".").slice(1).join(".");
  }

  // Explicit mappings based on your schema
  if (key === "coverage_type") return policy.coverage_type;
  if (key === "expiration_date") return policy.expiration_date;
  if (key === "effective_date") return policy.effective_date;
  if (key === "carrier") return policy.carrier;
  if (key === "glEachOccurrence") return policy.limit_each_occurrence;
  if (key === "glAggregate") return policy.gl_aggregate; // if you ever add this

  // Fallback: try direct column name
  return policy[key];
}

function normalizeValue(raw, typeHint) {
  if (raw === null || raw === undefined) return null;

  if (typeHint === "number") {
    const n = Number(String(raw).replace(/[^0-9.-]/g, ""));
    return Number.isNaN(n) ? 0 : n;
  }

  if (typeHint === "date") {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  return String(raw).toLowerCase();
}

function evaluateRuleV5(rule, policy) {
  try {
    const typeHint = inferType(rule.field_key);
    const rawValue = resolvePolicyValue(policy, rule.field_key);
    const value = normalizeValue(rawValue, typeHint);
    const expected = normalizeValue(rule.expected_value, typeHint);

    switch (rule.operator) {
      case "equals":
        return value === expected;
      case "not_equals":
        return value !== expected;
      case "gte":
        return Number(value) >= Number(expected);
      case "lte":
        return Number(value) <= Number(expected);
      case "contains":
        return String(value || "").includes(String(expected || ""));
      case "in_list":
        return String(expected || "")
          .split(",")
          .map((v) => v.trim().toLowerCase())
          .includes(String(value || ""));
      case "before":
        return typeHint === "date" && value && expected && value < expected;
      case "after":
        return typeHint === "date" && value && expected && value > expected;
      default:
        return false;
    }
  } catch (err) {
    console.error("[engine/run-v3] evaluateRuleV5 error:", err);
    return false;
  }
}

function buildRuleLabel(rule) {
  const val = rule.expected_value;
  return `${rule.field_key} ${rule.operator} ${val}`;
}

/* ============================================================
   MAIN HANDLER
============================================================ */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    const { vendorId, orgId, dryRun } = req.body || {};

    if (!vendorId || !orgId) {
      return res.status(400).json({
        ok: false,
        error: "Missing vendorId or orgId.",
      });
    }

    // ---------------------------------------------------
    // 1) Load vendor policies
    // ---------------------------------------------------
    const policies = await sql`
      SELECT
        id,
        vendor_id,
        org_id,
        expiration_date,
        effective_date,
        coverage_type,
        status,
        vendor_name,
        policy_number,
        carrier,
        limit_each_occurrence,
        auto_limit,
        work_comp_limit,
        umbrella_limit
      FROM policies
      WHERE vendor_id = ${vendorId} AND org_id = ${orgId}
      ORDER BY expiration_date ASC NULLS LAST;
    `;

    if (!policies.length) {
      return res.status(200).json({
        ok: true,
        vendorId,
        orgId,
        globalScore: 0,
        failedCount: 0,
        totalRules: 0,
        failingRules: [],
        passingRules: [],
        warning: "No policies found for vendor.",
      });
    }

    // ---------------------------------------------------
    // 2) Load org V5 rules (requirements_rules_v2)
    // ---------------------------------------------------
    const rules = await sql`
      SELECT
        id,
        org_id,
        group_id,
        field_key,
        operator,
        expected_value,
        severity,
        requirement_text,
        is_active
      FROM requirements_rules_v2
      WHERE org_id = ${orgId}
      ORDER BY id ASC;
    `;

    const activeRules = rules.filter((r) =>
      r.is_active === null || r.is_active === undefined ? true : !!r.is_active
    );

    if (!activeRules.length) {
      return res.status(200).json({
        ok: true,
        vendorId,
        orgId,
        globalScore: 100,
        failedCount: 0,
        totalRules: 0,
        failingRules: [],
        passingRules: [],
        warning: "No active V5 rules defined for this org.",
      });
    }

    // ---------------------------------------------------
    // 3) Evaluate coverage rules across policies
    // ---------------------------------------------------
    const failures = [];
    const passes = [];

    for (const rule of activeRules) {
      const severity = rule.severity || "medium";

      let passed = false;
      let matchedPolicy = null;

      for (const policy of policies) {
        const ok = evaluateRuleV5(rule, policy);
        if (ok) {
          passed = true;
          matchedPolicy = policy;
          break;
        }
      }

      const label =
        rule.requirement_text || buildRuleLabel(rule) || "Unnamed rule";

      if (passed) {
        passes.push({
          ruleId: rule.id,
          groupId: rule.group_id,
          severity,
          fieldKey: rule.field_key,
          operator: rule.operator,
          expectedValue: rule.expected_value,
          message: `Rule passed: ${label}`,
          policyId: matchedPolicy?.id || null,
          policyNumber: matchedPolicy?.policy_number || null,
          source: "coverage_v5",
        });
      } else {
        failures.push({
          ruleId: rule.id,
          groupId: rule.group_id,
          severity,
          fieldKey: rule.field_key,
          operator: rule.operator,
          expectedValue: rule.expected_value,
          message: `Rule failed: ${label} (no policy satisfied this condition)`,
          source: "coverage_v5",
        });
      }
    }

    // ---------------------------------------------------
    // 3b) MERGE CONTRACT RULES (Contract Intelligence V3)
    // ---------------------------------------------------
    let contractFailCount = 0;
    let contractPassCount = 0;
    let contractScore = null;

    try {
      const contractResult = await getContractRuleResultsForVendor(
        vendorId,
        orgId
      );

      if (contractResult.ok) {
        contractFailCount = contractResult.failingContractRules.length;
        contractPassCount = contractResult.passingContractRules.length;
        contractScore = contractResult.contractScore;

        // Map contract fails into same shape
        for (const cf of contractResult.failingContractRules) {
          failures.push({
            ruleId: cf.rule_id,
            groupId: null,
            severity: cf.severity || "high",
            fieldKey: cf.field_key || "contract",
            operator: cf.operator || "match",
            expectedValue: cf.expected_value || null,
            message: cf.message || "Contract requirement not satisfied.",
            source: "contract_v3",
          });
        }

        // Map contract passes into same shape
        for (const cp of contractResult.passingContractRules) {
          passes.push({
            ruleId: cp.rule_id,
            groupId: null,
            severity: cp.severity || "low",
            fieldKey: cp.field_key || "contract",
            operator: cp.operator || "match",
            expectedValue: cp.expected_value || null,
            message: cp.message || "Contract appears satisfied.",
            source: "contract_v3",
          });
        }
      }
    } catch (contractErr) {
      console.error("[engine/run-v3] ContractRulesV5 error:", contractErr);
    }

    // ---------------------------------------------------
    // 3c) Compute globalScore (Coverage + Contract)
    // ---------------------------------------------------
    let globalScore = computeScoreFromFailures(failures);
    if (contractScore != null) {
      // Conservative: global score cannot exceed contract score
      globalScore = Math.min(globalScore, contractScore);
    }

    const totalRules = activeRules.length + contractFailCount + contractPassCount;

    // Split coverage vs contract for persistence
    const coverageFailures = failures.filter((f) => f.source === "coverage_v5");
    const coveragePasses = passes.filter((p) => p.source === "coverage_v5");

    // ---------------------------------------------------
    // 4) Persist results + alerts (if NOT dryRun)
    // ---------------------------------------------------
    if (!dryRun) {
      // 4a) wipe existing rule_results_v3 for this vendor/org
      await sql`
        DELETE FROM rule_results_v3
        WHERE vendor_id = ${vendorId} AND org_id = ${orgId};
      `;

      // 4b) insert failing coverage rule results (NOT contract)
      for (const f of coverageFailures) {
        await sql`
          INSERT INTO rule_results_v3 (
            org_id,
            vendor_id,
            requirement_id,
            passed,
            severity,
            message
          )
          VALUES (
            ${orgId},
            ${vendorId},
            ${f.ruleId},
            FALSE,
            ${f.severity},
            ${f.message}
          )
        `;
      }

      // 4c) insert passing coverage rule results (NOT contract)
      for (const p of coveragePasses) {
        await sql`
          INSERT INTO rule_results_v3 (
            org_id,
            vendor_id,
            requirement_id,
            passed,
            severity,
            message
          )
          VALUES (
            ${orgId},
            ${vendorId},
            ${p.ruleId},
            TRUE,
            NULL,
            ${p.message}
          )
        `;
      }

      // 4d) system_timeline log
      await sql`
        INSERT INTO system_timeline (org_id, vendor_id, action, message, severity)
        VALUES (
          ${orgId},
          ${vendorId},
          'rule_engine_v5_run',
          ${"Rule Engine V5 evaluated. Score: " + globalScore},
          ${failures.length ? "warning" : "info"}
        )
      `;

      // 4e) vendor_compliance_cache — best-effort
      try {
        await sql`
          INSERT INTO vendor_compliance_cache (
            vendor_id,
            org_id,
            score,
            last_run_at
          )
          VALUES (
            ${vendorId},
            ${orgId},
            ${globalScore},
            NOW()
          )
          ON CONFLICT (vendor_id)
          DO UPDATE SET
            score = EXCLUDED.score,
            last_run_at = EXCLUDED.last_run_at;
        `;
      } catch (cacheErr) {
        console.error(
          "[engine/run-v3] vendor_compliance_cache upsert failed (check columns):",
          cacheErr
        );
      }

      // ---------------------------------------------------
      // 4f) V5 ALERT PIPELINE (COVERAGE ONLY)
      //
      // Contract alerts are already handled by Contract Matching V3
      // and /api/contracts/apply-matching, so we avoid double-alerts
      // here and limit this pipeline to coverage_rule_failure.
      // ---------------------------------------------------
      try {
        // Resolve prior engine alerts of type 'coverage_rule_failure'
        await sql`
          UPDATE alerts
          SET status = 'resolved'
          WHERE vendor_id = ${vendorId}
            AND org_id = ${orgId}
            AND type = 'coverage_rule_failure'
            AND status = 'open';
        `;

        // Insert new alerts for each failing COVERAGE rule
        for (const f of coverageFailures) {
          const severity = (f.severity || "medium").toLowerCase();
          const ruleLabel = `${f.fieldKey} ${f.operator} ${f.expectedValue}`;
          const message = f.message || `Rule failed: ${ruleLabel}`;
          const title = "Coverage requirement not met";
          const code = `RULE_${(severity || "medium").toUpperCase()}_${String(
            f.fieldKey || "field"
          )
            .replace(/[^A-Za-z0-9]/g, "_")
            .toUpperCase()}`;

          await sql`
            INSERT INTO alerts (
              created_at,
              is_read,
              extracted,
              vendor_id,
              policy_id,
              org_id,
              rule_label,
              file_url,
              status,
              type,
              message,
              severity,
              title
            )
            VALUES (
              NOW(),
              FALSE,
              ${JSON.stringify({
                engine_version: "v5",
                rule_id: f.ruleId,
                group_id: f.groupId,
                field_key: f.fieldKey,
                operator: f.operator,
                expected_value: f.expectedValue,
              })}::jsonb,
              ${vendorId},
              ${null},
              ${orgId},
              ${ruleLabel},
              ${null},
              ${"open"},
              ${"coverage_rule_failure"},
              ${message},
              ${severity},
              ${title}
            );
          `;
        }
      } catch (alertErr) {
        console.error("[engine/run-v3] alert pipeline failed:", alertErr);
        // do not throw, engine result should still succeed
      }
    }

    // ---------------------------------------------------
    // 5) Response payload
    // ---------------------------------------------------
    return res.status(200).json({
      ok: true,
      vendorId,
      orgId,
      globalScore,
      failedCount: failures.length,
      totalRules,
      failingRules: failures,
      passingRules: passes,
    });
  } catch (err) {
    console.error("[engine/run-v3] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Rule Engine V5 failed.",
    });
  }
}
