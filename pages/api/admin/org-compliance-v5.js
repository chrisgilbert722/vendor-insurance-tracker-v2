// pages/api/admin/org-compliance-v5.js
// ============================================================
// ORG-LEVEL COMPLIANCE INTELLIGENCE ENGINE — OPTION C
//
// GET /api/admin/org-compliance-v5?orgId=...
//
// This engine aggregates THREE dimensions:
//  1) v5Engine     → Rule Engine V5 results (vendor_compliance_cache + rule_results_v3)
//  2) alertsEngine → Alerts V5 (alerts table) for severity + vendor distribution
//  3) eliteEngine  → Proto-Elite org view using vendor scores as a proxy tier
//
// It returns:
//  {
//    ok: true,
//    org,
//    v5Engine: {...},
//    alertsEngine: {...},
//    eliteEngine: {...},
//    combined: { overallTier, combinedScore, narrative }
//  }
// ============================================================

import { sql } from "../../../lib/db";
import { openai } from "../../../lib/openaiClient";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res
        .status(405)
        .json({ ok: false, error: "Method not allowed" });
    }

    const { orgId } = req.query;
    const orgIdInt = orgId ? parseInt(orgId, 10) : null;

    if (!orgIdInt || Number.isNaN(orgIdInt)) {
      return res.status(400).json({
        ok: false,
        error: "Missing or invalid orgId.",
      });
    }

    // ============================================================
    // 1) ORG + VENDORS
    // ============================================================
    const orgRows = await sql`
      SELECT id, name
      FROM orgs
      WHERE id = ${orgIdInt}
      LIMIT 1;
    `;
    if (!orgRows.length) {
      return res.status(404).json({
        ok: false,
        error: "Org not found.",
      });
    }
    const org = orgRows[0];

    const vendors = await sql`
      SELECT id, name
      FROM vendors
      WHERE org_id = ${orgIdInt}
      ORDER BY id ASC;
    `;
    const vendorCount = vendors.length;

    // ============================================================
    // 2) V5 ENGINE DIMENSION (vendor_compliance_cache + rule_results_v3)
    // ============================================================
    const cacheRows = await sql`
      SELECT vendor_id, score, last_run_at
      FROM vendor_compliance_cache
      WHERE org_id = ${orgIdInt};
    `;

    let globalScoreAvg = 0;
    const scoreBands = {
      elite: 0,
      preferred: 0,
      watch: 0,
      high_risk: 0,
      severe: 0,
    };
    const scoreByVendor = {};

    if (cacheRows.length) {
      let sum = 0;
      for (const row of cacheRows) {
        const s = Number(row.score) || 0;
        sum += s;
        scoreByVendor[row.vendor_id] = s;

        if (s >= 85) scoreBands.elite++;
        else if (s >= 70) scoreBands.preferred++;
        else if (s >= 55) scoreBands.watch++;
        else if (s >= 35) scoreBands.high_risk++;
        else scoreBands.severe++;
      }
      globalScoreAvg = Math.round(sum / cacheRows.length);
    }

    const failureRows = await sql`
      SELECT vendor_id, severity
      FROM rule_results_v3
      WHERE org_id = ${orgIdInt}
        AND passed = FALSE;
    `;

    const ruleFailureCounts = {
      totalFailures: failureRows.length,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };
    const failingVendors = new Set();

    for (const f of failureRows) {
      const sev = (f.severity || "").toLowerCase();
      failingVendors.add(f.vendor_id);

      if (sev === "critical") ruleFailureCounts.critical++;
      else if (sev === "high") ruleFailureCounts.high++;
      else if (sev === "medium") ruleFailureCounts.medium++;
      else ruleFailureCounts.low++;
    }

    const v5Engine = {
      vendorCount,
      globalScoreAvg,
      scoreBands,
      failingVendorCount: failingVendors.size,
      ruleFailureCounts,
      scoreByVendor,
    };

    // ============================================================
    // 3) ALERTS ENGINE DIMENSION (V5 alerts)
    // ============================================================
    const alertRows = await sql`
      SELECT vendor_id, severity
      FROM alerts
      WHERE org_id = ${orgIdInt}
        AND status = 'open';
    `;

    const alertCounts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };
    const alertsByVendor = {};

    for (const a of alertRows) {
      const sev = (a.severity || "").toLowerCase();
      const vid = a.vendor_id;

      if (!alertsByVendor[vid]) {
        alertsByVendor[vid] = {
          total: 0,
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
        };
      }

      alertsByVendor[vid].total++;

      if (sev === "critical") {
        alertCounts.critical++;
        alertsByVendor[vid].critical++;
      } else if (sev === "high") {
        alertCounts.high++;
        alertsByVendor[vid].high++;
      } else if (sev === "medium") {
        alertCounts.medium++;
        alertsByVendor[vid].medium++;
      } else {
        alertCounts.low++;
        alertsByVendor[vid].low++;
      }
    }

    const alertsEngine = {
      totalAlerts: alertRows.length,
      alertCounts,
      alertsByVendor,
    };

    // ============================================================
    // 4) COVERAGE / EXPIRATION DIMENSION (Policies)
    // ============================================================
    const policyRows = await sql`
      SELECT coverage_type, expiration_date
      FROM policies
      WHERE org_id = ${orgIdInt}
      ORDER BY expiration_date ASC NULLS LAST;
    `;

    const coverageMap = {};
    let expiredPolicies = 0;

    for (const p of policyRows) {
      const key = (p.coverage_type || "Unknown").toLowerCase();
      if (!coverageMap[key]) {
        coverageMap[key] = { coverage: key, count: 0, expired: 0 };
      }
      coverageMap[key].count++;

      if (p.expiration_date) {
        const d = new Date(p.expiration_date);
        if (!Number.isNaN(d.getTime()) && d < new Date()) {
          coverageMap[key].expired++;
          expiredPolicies++;
        }
      }
    }

    const coverageBreakdown = Object.values(coverageMap);
    const coverageTypes = coverageBreakdown.length;

    // ============================================================
    // 5) ELITE ENGINE DIMENSION (derived tiers from scores)
    //    This is a proto-Elite org view until a separate table exists.
    // ============================================================
    const eliteEngine = {
      scoreBands,
      // We treat "elite" + "preferred" as "proto-elite-org-health"
      estimatedEliteVendors: scoreBands.elite,
      estimatedPreferredVendors: scoreBands.preferred,
      estimatedHighRiskVendors: scoreBands.high_risk + scoreBands.severe,
    };

    // ============================================================
    // 6) TOP RISK VENDORS (lowest scores)
    // ============================================================
    const topRiskRows = await sql`
      SELECT
        c.vendor_id,
        c.score,
        v.name AS vendor_name
      FROM vendor_compliance_cache c
      LEFT JOIN vendors v
        ON v.id = c.vendor_id
      WHERE c.org_id = ${orgIdInt}
      ORDER BY c.score ASC NULLS LAST
      LIMIT 10;
    `;

    // ============================================================
    // 7) COMBINED SCORE & TIER (V5-only aggregation)
    //    We'll combine V5 score + rule failure pressure + alerts pressure
    // ============================================================
    let combinedScore = globalScoreAvg;

    // Penalty for a lot of critical rule failures
    combinedScore -= ruleFailureCounts.critical * 2;
    combinedScore -= ruleFailureCounts.high;

    // Penalty for many critical alerts
    combinedScore -= alertCounts.critical * 1.5;
    combinedScore -= alertCounts.high * 0.75;

    // Penalty for tons of expired policies
    combinedScore -= expiredPolicies * 0.5;

    // Clamp score
    combinedScore = Math.round(Math.max(0, Math.min(100, combinedScore)));

    let overallTier = "Unknown";
    if (combinedScore >= 85) overallTier = "Elite Org";
    else if (combinedScore >= 70) overallTier = "Stable";
    else if (combinedScore >= 55) overallTier = "Watch";
    else if (combinedScore >= 35) overallTier = "High Risk";
    else overallTier = "Severe Exposure";

    // ============================================================
    // 8) AI NARRATIVE (OPTION C — EXEC SUMMARY)
    // ============================================================
    let narrative = "";
    try {
      const prompt = `
You are an insurance compliance AI. You are given ORG-LEVEL compliance metrics.
Write a concise executive summary (4–7 sentences) for a risk manager.

Org: ${org.name}

V5 Engine:
- Vendor count: ${vendorCount}
- Global V5 score average: ${globalScoreAvg}
- Score bands: ${JSON.stringify(scoreBands)}
- Failing vendors (any failed rules): ${failingVendors.size}
- Rule failures by severity: ${JSON.stringify(ruleFailureCounts)}

Alerts Engine:
- Alert counts: ${JSON.stringify(alertCounts)}

Coverage:
- Coverage types: ${coverageTypes}
- Expired policies: ${expiredPolicies}

Combined score: ${combinedScore}
Overall tier: ${overallTier}

Explain:
- How healthy the org is overall
- Where the biggest risks are (critical rules, alerts, expired policies)
- What 2–4 concrete actions the org should take next.
Keep it plain-language. No fluff. No bullet list in the result.
`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      });

      narrative =
        completion.choices?.[0]?.message?.content?.trim() ||
        "";
    } catch (err) {
      console.error("[org-compliance-v5] AI narrative error:", err);
      narrative = "";
    }

    const combined = {
      combinedScore,
      overallTier,
      narrative,
    };

    // ============================================================
    // 9) RETURN FULL ORG COMPLIANCE INTELLIGENCE SNAPSHOT
    // ============================================================
    return res.status(200).json({
      ok: true,
      org,
      v5Engine,
      alertsEngine,
      eliteEngine,
      coverageBreakdown,
      topRiskVendors: topRiskRows,
      combined,
    });
  } catch (err) {
    console.error("[admin/org-compliance-v5] ERROR", err);
    return res.status(500).json({
      ok: false,
      error: "Server error: " + err.message,
    });
  }
}
