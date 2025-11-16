// pages/api/requirements/check.js
import { supabase } from "../../../lib/supabaseClient";

/**
 * Endpoint: /api/requirements/check?vendorId=123&orgId=456
 *
 * Input:
 *  - vendorId
 *  - orgId
 *
 * Output:
 *  {
 *    ok: true,
 *    coverage: [...],
 *    missing: [...],
 *    failing: [...],
 *    passing: [...],
 *    summary: "...",
 *    vendor: {...}
 *  }
 */

export default async function handler(req, res) {
  try {
    const { vendorId, orgId } = req.query;

    if (!vendorId || !orgId) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing vendorId or orgId" });
    }

    // 1️⃣ Load org-wide requirements
    const { data: reqs, error: reqsError } = await supabase
      .from("requirements")
      .select("*")
      .eq("org_id", orgId);

    if (reqsError) {
      console.error("Requirements fetch error:", reqsError);
      return res.status(500).json({
        ok: false,
        error: reqsError.message,
      });
    }

    // 2️⃣ Load vendor policies
    const { data: policies, error: policyErr } = await supabase
      .from("policies")
      .select("*")
      .eq("vendor_id", vendorId);

    if (policyErr) {
      console.error("Policies fetch error:", policyErr);
      return res.status(500).json({
        ok: false,
        error: policyErr.message,
      });
    }

    // 3️⃣ Evaluate compliance
    const missing = [];
    const failing = [];
    const passing = [];

    for (const rule of reqs) {
      // Find matching vendor policy for this coverage type
      const match = policies.find(
        (p) =>
          p.coverage_type?.toLowerCase().trim() ===
          rule.coverage_type?.toLowerCase().trim()
      );

      // If vendor has NO policy of this type → missing
      if (!match) {
        missing.push({
          coverage_type: rule.coverage_type,
          reason: "Missing coverage",
        });
        continue;
      }

      // POLICY MATCHED → check details

      // CHECK MIN EACH OCCURRENCE
      if (
        rule.min_limit_each_occurrence &&
        (!match.limit_each_occurrence ||
          match.limit_each_occurrence < rule.min_limit_each_occurrence)
      ) {
        failing.push({
          coverage_type: rule.coverage_type,
          reason: `Each Occurrence limit too low (${match.limit_each_occurrence} < ${rule.min_limit_each_occurrence})`,
        });
        continue;
      }

      // CHECK MIN AGGREGATE
      if (
        rule.min_limit_aggregate &&
        (!match.limit_aggregate ||
          match.limit_aggregate < rule.min_limit_aggregate)
      ) {
        failing.push({
          coverage_type: rule.coverage_type,
          reason: `Aggregate limit too low (${match.limit_aggregate} < ${rule.min_limit_aggregate})`,
        });
        continue;
      }

      // CHECK ADDITIONAL INSURED
      if (
        rule.require_additional_insured &&
        !match.additional_insured
      ) {
        failing.push({
          coverage_type: rule.coverage_type,
          reason: "Missing Additional Insured endorsement",
        });
        continue;
      }

      // CHECK WAIVER OF SUBROGATION
      if (rule.require_waiver && !match.waiver_of_subrogation) {
        failing.push({
          coverage_type: rule.coverage_type,
          reason: "Missing Waiver of Subrogation",
        });
        continue;
      }

      // CHECK MIN RISK SCORE
      if (
        rule.min_risk_score &&
        match.risk_score &&
        match.risk_score < rule.min_risk_score
      ) {
        failing.push({
          coverage_type: rule.coverage_type,
          reason: `Risk score too low (${match.risk_score} < ${rule.min_risk_score})`,
        });
        continue;
      }

      // PASSED ALL CHECKS
      passing.push({
        coverage_type: rule.coverage_type,
        reason: "Compliant",
      });
    }

    // 4️⃣ Build summary
    let summary = "Fully compliant";

    if (missing.length > 0) summary = "Missing required coverage";
    if (failing.length > 0) summary = "Coverage does not meet requirements";

    return res.status(200).json({
      ok: true,
      summary,
      missing,
      failing,
      passing,
      policyCount: policies.length,
    });
  } catch (err) {
    console.error("COMPLIANCE CHECK ERROR:", err);
    return res
      .status(500)
      .json({ ok: false, error: err.message || "Compliance check failed" });
  }
}
