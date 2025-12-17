// pages/api/admin/org-compliance-v5.js
// ============================================================
// ORG-LEVEL COMPLIANCE INTELLIGENCE ENGINE — OPTION C (PATCHED)
// GET /api/admin/org-compliance-v5?orgId=...
//
// ✅ FIXES
// - Never queries missing "orgs" table
// - Accepts orgId as integer OR external UUID string (best-effort resolver)
// - Falls back safely (never hard-crashes UI)
// - Uses alerts_v2 (your current platform) instead of legacy "alerts"
// - Returns 200 with ok:false/skipped:true on schema mismatch instead of 500
// ============================================================

import { sql } from "../../../lib/db";
import { openai } from "../../../lib/openaiClient";

// ---------------------------
// Helper: resolve org row safely
// ---------------------------
async function resolveOrgRow(orgIdRaw) {
  // 1) If orgId is numeric, prefer organizations.id = int
  const orgIdInt = Number.parseInt(String(orgIdRaw || ""), 10);
  if (Number.isFinite(orgIdInt) && orgIdInt > 0) {
    try {
      const rows = await sql`
        SELECT id, name
        FROM organizations
        WHERE id = ${orgIdInt}
        LIMIT 1;
      `;
      if (rows?.length) return rows[0];
    } catch (e) {
      // fallthrough
    }

    // Older schemas sometimes use "orgs" — try it, but never require it
    try {
      const rows = await sql`
        SELECT id, name
        FROM orgs
        WHERE id = ${orgIdInt}
        LIMIT 1;
      `;
      if (rows?.length) return rows[0];
    } catch (e) {
      // fallthrough
    }
  }

  // 2) If orgId is UUID-like string, try common external-id columns.
  const orgIdStr = String(orgIdRaw || "").trim();
  if (!orgIdStr) return null;

  // Try organizations.uuid (if exists)
  try {
    const rows = await sql`
      SELECT id, name
      FROM organizations
      WHERE uuid = ${orgIdStr}
      LIMIT 1;
    `;
    if (rows?.length) return rows[0];
  } catch (e) {
    // ignore (column may not exist)
  }

  // Try organizations.external_id (if exists)
  try {
    const rows = await sql`
      SELECT id, name
      FROM organizations
      WHERE external_id = ${orgIdStr}
      LIMIT 1;
    `;
    if (rows?.length) return rows[0];
  } catch (e) {}

  // Try organizations.public_id (if exists)
  try {
    const rows = await sql`
      SELECT id, name
      FROM organizations
      WHERE public_id = ${orgIdStr}
      LIMIT 1;
    `;
    if (rows?.length) return rows[0];
  } catch (e) {}

  // Try organizations.org_uuid (if exists)
  try {
    const rows = await sql`
      SELECT id, name
      FROM organizations
      WHERE org_uuid = ${orgIdStr}
      LIMIT 1;
    `;
    if (rows?.length) return rows[0];
  } catch (e) {}

  // As a last resort, if there IS an orgs table with uuid
  try {
    const rows = await sql`
      SELECT id, name
      FROM orgs
      WHERE uuid = ${orgIdStr}
      LIMIT 1;
    `;
    if (rows?.length) return rows[0];
  } catch (e) {}

  return null;
}

export default async function handler(req, res) {
  // Hard contract: GET only
  if (req.method !== "GET") {
    return res.status(200).json({ ok: false, skipped: true, error: "GET only" });
  }

  const { orgId } = req.query;

  try {
    // ============================================================
    // 1) ORG + VENDORS (SAFE RESOLVE)
    // ============================================================
    const org = await resolveOrgRow(orgId);

    // If we can't resolve org cleanly, do NOT 500 (dashboard-safe)
    if (!org?.id) {
      return res.status(200).json({
        ok: false,
        skipped: true,
        error: 'Organization not found (or org lookup table/columns missing).',
        org: null,
        v5Engine: { vendorCount: 0, globalScoreAvg: 0, scoreBands: {}, failingVendorCount: 0, ruleFailureCounts: {}, scoreByVendor: {} },
        alertsEngine: { totalAlerts: 0, alertCounts: {}, alertsByVendor: {} },
        eliteEngine: { scoreBands: {}, estimatedEliteVendors: 0, estimatedPreferredVendors: 0, estimatedHighRiskVendors: 0 },
        coverageBreakdown: [],
        topRiskVendors: [],
        combined: { combinedScore: 0, overallTier: "Unknown", narrative: "" },
      });
    }

    const orgIdInt = Number(org.id);

    const vendors = await sql`
      SELECT id, name
      FROM vendors
      WHERE org_id = ${orgIdInt}
      ORDER BY id ASC;
    `;
    const vendorCount = Array.isArray(vendors) ? vendors.length : 0;

    // ============================================================
    // 2) V5 ENGINE DIMENSION (vendor_compliance_cache + rule_results_v3)
    // ============================================================
    const cacheRows = await sql`
      SELECT vendor_id, score, last_run_at
      FROM vendor_compliance_cache
      WHERE org_id = ${orgIdInt};
    `.catch(() => []);

    let globalScoreAvg = 0;
    const scoreBands = {
      elite: 0,
      preferred: 0,
      watch: 0,
      high_risk: 0,
      severe: 0,
    };
    const scoreByVendor = {};

    if (Array.isArray(cacheRows) && cacheRows.length) {
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
    `.catch(() => []);

    const ruleFailureCounts = {
      totalFailures: Array.isArray(failureRows) ? failureRows.length : 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };
    const failingVendors = new Set();

    for (const f of Array.isArray(failureRows) ? failureRows : []) {
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
    // 3) ALERTS ENGINE DIMENSION (CURRENT: alerts_v2)
    // ============================================================
    const alertRows = await sql`
      SELECT vendor_id, severity
      FROM alerts_v2
      WHERE org_id = ${orgIdInt}
        AND resolved_at IS NULL;
    `.catch(() => []);

    const alertCounts = { critical: 0, high: 0, medium: 0, low: 0 };
    const alertsByVendor = {};

    for (const a of Array.isArray(alertRows) ? alertRows : []) {
      const sev = (a.severity || "").toLowerCase();
      const vid = a.vendor_id;

      if (!alertsByVendor[vid]) {
        alertsByVendor[vid] = { total: 0, critical: 0, high: 0, medium: 0, low: 0 };
      }

      alertsByVendor[vid].total++;

      if (sev === "critical") { alertCounts.critical++; alertsByVendor[vid].critical++; }
      else if (sev === "high") { alertCounts.high++; alertsByVendor[vid].high++; }
      else if (sev === "medium") { alertCounts.medium++; alertsByVendor[vid].medium++; }
      else { alertCounts.low++; alertsByVendor[vid].low++; }
    }

    const alertsEngine = {
      totalAlerts: Array.isArray(alertRows) ? alertRows.length : 0,
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
    `.catch(() => []);

    const coverageMap = {};
    let expiredPolicies = 0;

    for (const p of Array.isArray(policyRows) ? policyRows : []) {
      const key = (p.coverage_type || "Unknown").toLowerCase();
      if (!coverageMap[key]) coverageMap[key] = { coverage: key, count: 0, expired: 0 };
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
    // ============================================================
    const eliteEngine = {
      scoreBands,
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
    `.catch(() => []);

    // ============================================================
    // 7) COMBINED SCORE & TIER
    // ============================================================
    let combinedScore = globalScoreAvg;

    combinedScore -= ruleFailureCounts.critical * 2;
    combinedScore -= ruleFailureCounts.high;
    combinedScore -= alertCounts.critical * 1.5;
    combinedScore -= alertCounts.high * 0.75;
    combinedScore -= expiredPolicies * 0.5;

    combinedScore = Math.round(Math.max(0, Math.min(100, combinedScore)));

    let overallTier = "Unknown";
    if (combinedScore >= 85) overallTier = "Elite Org";
    else if (combinedScore >= 70) overallTier = "Stable";
    else if (combinedScore >= 55) overallTier = "Watch";
    else if (combinedScore >= 35) overallTier = "High Risk";
    else overallTier = "Severe Exposure";

    // ============================================================
    // 8) AI NARRATIVE (EXEC SUMMARY) — SAFE
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

      narrative = completion.choices?.[0]?.message?.content?.trim() || "";
    } catch (err) {
      console.error("[org-compliance-v5] AI narrative error:", err);
      narrative = "";
    }

    const combined = { combinedScore, overallTier, narrative };

    // ============================================================
    // 9) RETURN SNAPSHOT
    // ============================================================
    return res.status(200).json({
      ok: true,
      org,
      v5Engine,
      alertsEngine,
      eliteEngine,
      coverageBreakdown,
      topRiskVendors: Array.isArray(topRiskRows) ? topRiskRows : [],
      combined,
    });
  } catch (err) {
    console.error("[admin/org-compliance-v5] ERROR", err);
    // Dashboard-safe: never hard 500 for schema drift
    return res.status(200).json({
      ok: false,
      skipped: true,
      error: "Server error: " + (err?.message || "Unknown"),
      org: null,
      v5Engine: { vendorCount: 0, globalScoreAvg: 0, scoreBands: {}, failingVendorCount: 0, ruleFailureCounts: {}, scoreByVendor: {} },
      alertsEngine: { totalAlerts: 0, alertCounts: {}, alertsByVendor: {} },
      eliteEngine: { scoreBands: {}, estimatedEliteVendors: 0, estimatedPreferredVendors: 0, estimatedHighRiskVendors: 0 },
      coverageBreakdown: [],
      topRiskVendors: [],
      combined: { combinedScore: 0, overallTier: "Unknown", narrative: "" },
    });
  }
}
