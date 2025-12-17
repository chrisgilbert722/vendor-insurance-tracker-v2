// pages/api/admin/org-compliance-v5.js
// ============================================================
// ORG-LEVEL COMPLIANCE INTELLIGENCE — V5 (SCHEMA-SAFE)
// - NO orgs table dependency
// - UUID-safe
// - Never 500s UI
// ============================================================

import { sql } from "../../../lib/db";
import { cleanUUID } from "../../../lib/uuid";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(200).json({ ok: false });
    }

    const orgId = cleanUUID(req.query.orgId);

    if (!orgId) {
      return res.status(200).json({
        ok: false,
        error: "Missing orgId",
      });
    }

    /* ---------------------------------------------------------
       1) VERIFY ORG VIA VENDORS (REAL SOURCE OF TRUTH)
    --------------------------------------------------------- */
    const vendorRows = await sql`
      SELECT id, name
      FROM vendors
      WHERE org_id = ${orgId};
    `;

    if (vendorRows.length === 0) {
      return res.status(200).json({
        ok: false,
        error: "Organization not found (no vendors for org)",
      });
    }

    const vendorCount = vendorRows.length;

    /* ---------------------------------------------------------
       2) V5 ENGINE — vendor_compliance_cache
    --------------------------------------------------------- */
    const cacheRows = await sql`
      SELECT vendor_id, score
      FROM vendor_compliance_cache
      WHERE org_id = ${orgId};
    `;

    let globalScoreAvg = 0;
    const scoreBands = {
      elite: 0,
      preferred: 0,
      watch: 0,
      high_risk: 0,
      severe: 0,
    };

    if (cacheRows.length) {
      let sum = 0;
      for (const r of cacheRows) {
        const s = Number(r.score) || 0;
        sum += s;
        if (s >= 85) scoreBands.elite++;
        else if (s >= 70) scoreBands.preferred++;
        else if (s >= 55) scoreBands.watch++;
        else if (s >= 35) scoreBands.high_risk++;
        else scoreBands.severe++;
      }
      globalScoreAvg = Math.round(sum / cacheRows.length);
    }

    /* ---------------------------------------------------------
       3) ALERTS ENGINE — alerts_v2
    --------------------------------------------------------- */
    const alertRows = await sql`
      SELECT severity
      FROM alerts_v2
      WHERE org_id = ${orgId}
        AND resolved_at IS NULL;
    `;

    const alertCounts = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const a of alertRows) {
      const s = (a.severity || "").toLowerCase();
      if (alertCounts[s] !== undefined) alertCounts[s]++;
    }

    /* ---------------------------------------------------------
       4) COMBINED SCORE (SAFE)
    --------------------------------------------------------- */
    let combinedScore = globalScoreAvg;
    combinedScore -= alertCounts.critical * 2;
    combinedScore -= alertCounts.high;
    combinedScore = Math.max(0, Math.min(100, combinedScore));

    let overallTier = "Watch";
    if (combinedScore >= 85) overallTier = "Elite Org";
    else if (combinedScore >= 70) overallTier = "Stable";
    else if (combinedScore >= 55) overallTier = "Watch";
    else if (combinedScore >= 35) overallTier = "High Risk";
    else overallTier = "Severe Exposure";

    /* ---------------------------------------------------------
       5) RESPONSE (UI-SAFE)
    --------------------------------------------------------- */
    return res.status(200).json({
      ok: true,
      org: {
        id: orgId,
        vendorCount,
      },
      v5Engine: {
        vendorCount,
        globalScoreAvg,
        scoreBands,
      },
      alertsEngine: {
        totalAlerts: alertRows.length,
        alertCounts,
      },
      combined: {
        combinedScore,
        overallTier,
        narrative:
          `Your organization has ${vendorCount} vendors with an average compliance score of ${globalScoreAvg}. ` +
          `There are ${alertCounts.critical} critical and ${alertCounts.high} high alerts. ` +
          `Overall status: ${overallTier}.`,
      },
    });
  } catch (err) {
    console.error("[org-compliance-v5] swallowed error:", err);
    return res.status(200).json({
      ok: false,
      error: "Org compliance unavailable",
    });
  }
}
