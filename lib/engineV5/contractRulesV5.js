// lib/engineV5/contractRulesV5.js
// ============================================================
// CONTRACT RULES V5 — INTEGRATION LAYER
//
// Uses data written by Contract Matching V3:
//  - vendors.contract_status
//  - vendors.contract_risk_score
//  - vendors.contract_issues_json  (array of issues from matcher)
//
// Exposes a function that converts those into rule-like entries
// that can be merged into Rule Engine V5 results.
// ============================================================

import { sql } from "../db";

/**
 * Get contract rule results for a given vendor/org.
 *
 * @param {number} vendorId
 * @param {number} orgId
 * @returns {Promise<{
 *   ok: boolean;
 *   contractStatus: string;
 *   contractScore: number|null;
 *   contractIssues: any[];
 *   failingContractRules: any[];
 *   passingContractRules: any[];
 * }>}
 */
export async function getContractRuleResultsForVendor(vendorId, orgId) {
  try {
    const rows = await sql`
      SELECT
        contract_status,
        contract_risk_score,
        contract_issues_json
      FROM vendors
      WHERE id = ${vendorId}
        AND org_id = ${orgId}
      LIMIT 1;
    `;

    if (!rows.length) {
      return {
        ok: false,
        contractStatus: "missing",
        contractScore: null,
        contractIssues: [],
        failingContractRules: [],
        passingContractRules: [],
      };
    }

    const v = rows[0];

    const contractStatus = v.contract_status || "missing";
    const contractScore =
      v.contract_risk_score !== null && v.contract_risk_score !== undefined
        ? Number(v.contract_risk_score)
        : null;

    const contractIssuesRaw = Array.isArray(v.contract_issues_json)
      ? v.contract_issues_json
      : [];

    // Convert issues into engine "rule failures"
    const failingContractRules = contractIssuesRaw.map((issue, idx) => {
      const sev = (issue.severity || "high").toLowerCase();

      return {
        rule_id: `contract-${idx}`,
        source: "contract_v3",
        severity: sev,
        message: issue.message || "Contract requirement not met.",
        field_key: issue.fieldKey || "contract",
        operator: issue.operator || "match",
        expected_value: issue.requirement || null,
        actual_value: issue.actual || null,
        code: issue.code || "CONTRACT_MISMATCH",
        type: "Contract",
      };
    });

    // If no issues, we treat contract as "passing" in this layer
    const passingContractRules =
      failingContractRules.length === 0 && contractStatus === "passed"
        ? [
            {
              rule_id: "contract-ok",
              source: "contract_v3",
              severity: "low",
              message: "Contract requirements appear satisfied.",
              field_key: "contract",
              operator: "match",
              expected_value: null,
              actual_value: null,
              code: "CONTRACT_OK",
              type: "Contract",
            },
          ]
        : [];

    return {
      ok: true,
      contractStatus,
      contractScore,
      contractIssues: contractIssuesRaw,
      failingContractRules,
      passingContractRules,
    };
  } catch (err) {
    console.error("[contractRulesV5] ERROR:", err);
    return {
      ok: false,
      contractStatus: "error",
      contractScore: null,
      contractIssues: [],
      failingContractRules: [],
      passingContractRules: [],
    };
  }
}
