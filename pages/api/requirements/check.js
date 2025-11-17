// pages/api/requirements/check.js
import { Client } from "pg";

/**
 * Endpoint: /api/requirements/check?vendorId=123&orgId=456
 */

export default async function handler(req, res) {
  let db = null;

  try {
    const { vendorId, orgId } = req.query;

    if (!vendorId || !orgId) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing vendorId or orgId" });
    }

    // Connect to database
    db = new Client({
      connectionString: process.env.DATABASE_URL,
    });
    await db.connect();

    // 1️⃣ Load org-wide requirements
    const reqResult = await db.query(
      `SELECT *
       FROM public.requirements
       WHERE org_id = $1
       ORDER BY created_at ASC`,
      [orgId]
    );

    const requirements = reqResult.rows;

    // 2️⃣ Load vendor policies
    const policyResult = await db.query(
      `SELECT *
       FROM public.policies
       WHERE vendor_id = $1
       ORDER BY created_at DESC`,
      [vendorId]
    );

    const policies = policyResult.rows;

    // 3️⃣ Evaluate compliance
    const missing = [];
    const failing = [];
    const passing = [];

    for (const rule of requirements) {
      const match = policies.find(
        (p) =>
          p.coverage_type?.toLowerCase().trim() ===
          rule.coverage_type?.toLowerCase().trim()
      );

      // ❌ Missing coverage
      if (!match) {
        missing.push({
          coverage_type: rule.coverage_type,
          reason: "Missing required coverage",
        });
        continue;
      }

      // ❌ Each Occurrence
      if (
        rule.min_limit_each_occurrence &&
        (!match.limit_each_occurrence ||
          match.limit_each_occurrence < rule.min_limit_each_occurrence)
      ) {
        failing.push({
          coverage_type: rule.coverage_type,
          reason: `Each Occurrence too low (${match.limit_each_occurrence} < ${rule.min_limit_each_occurrence})`,
        });
        continue;
      }

      // ❌ Aggregate
      if (
        rule.min_limit_aggregate &&
        (!match.limit_aggregate ||
          match.limit_aggregate < rule.min_limit_aggregate)
      ) {
        failing.push({
          coverage_type: rule.coverage_type,
          reason: `Aggregate too low (${match.limit_aggregate} < ${rule.min_limit_aggregate})`,
        });
        continue;
      }

      // ❌ Additional Insured Required
      if (rule.require_additional_insured && !match.additional_insured) {
        failing.push({
          coverage_type: rule.coverage_type,
          reason: "Missing Additional Insured endorsement",
        });
        continue;
      }

      // ❌ Waiver of Subrogation
      if (rule.require_waiver && !match.waiver_of_subrogation) {
        failing.push({
          coverage_type: rule.coverage_type,
          reason: "Missing Waiver of Subrogation",
        });
        continue;
      }

      // ❌ Risk Score too low
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

      // ✅ Passed everything
      passing.push({
        coverage_type: rule.coverage_type,
        reason: "Compliant",
      });
    }

    // 4️⃣ Summary
    let summary = "Fully compliant";

    if (missing.length > 0) summary = "Missing required coverage";
    if (failing.length > 0) summary = "Coverage failing compliance rules";

    return res.status(200).json({
      ok: true,
      vendorId,
      orgId,
      summary,
      missing,
      failing,
      passing,
      policyCount: policies.length,
      requirementCount: requirements.length,
    });
  } catch (err) {
    console.error("COMPLIANCE CHECK ERROR:", err);
    return res
      .status(500)
      .json({ ok: false, error: err.message || "Compliance check failed" });
  } finally {
    if (db) {
      try {
        await db.end();
      } catch (_) {}
    }
  }
}
