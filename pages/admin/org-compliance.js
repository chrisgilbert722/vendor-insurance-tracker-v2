// pages/api/admin/org-compliance-v5.js
// ============================================================
// ORG-LEVEL COMPLIANCE INTELLIGENCE ENGINE — V5 (UUID SAFE)
// ============================================================

import { sql } from "../../../lib/db";
import { cleanUUID } from "../../../lib/uuid";
import { openai } from "../../../lib/openaiClient";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(200).json({ ok: false, error: "GET only" });
    }

    const orgId = cleanUUID(req.query.orgId);

    // HARD GUARD — never crash UI
    if (!orgId) {
      return res.status(200).json({
        ok: false,
        skipped: true,
        error: "Invalid orgId",
      });
    }

    /* ============================================================
       1) ORG LOOKUP (UUID SAFE)
    ============================================================ */
    const orgRows = await sql`
      SELECT id, name
      FROM organizations
      WHERE id = ${orgId}
      LIMIT 1;
    `;

    if (!orgRows.length) {
      return res.status(200).json({
        ok: false,
        skipped: true,
        error: "Organization not found",
      });
    }

    const org = orgRows[0];

    /* ============================================================
       2) VENDORS
    ============================================================ */
    const vendors = await sql`
      SELECT id, name
      FROM vendors
      WHERE org_id = ${orgId};
    `;
    const vendorCount = vendors.length;

    /* ============================================================
       3) V5 SCORE CACHE
    ============================================================ */
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

    /* ============================================================
       4) ALERTS
    ============================================================ */
    const alertRows = await sql`
      SELECT severity
      FROM alerts_v2
      WHERE org_id = ${orgId}
        AND resolved_at IS NULL;
    `;

    const alertCounts = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const a of alertRows) {
      const sev = (a.severity || "").toLowerCase();
      if (alertCounts[sev] !== undefined) alertCounts[sev]++;
    }

    /* ============================================================
       5) COMBINED SCORE
    ============================================================ */
    let combinedScore = globalScoreAvg;
    combinedScore -= alertCounts.critical * 2;
    combinedScore -= alertCounts.high;

    combinedScore = Math.max(0, Math.min(100, Math.round(combinedScore)));

    let overallTier = "Unknown";
    if (combinedScore >= 85) overallTier = "Elite Org";
    else if (combinedScore >= 70) overallTier = "Stable";
    else if (combinedScore >= 55) overallTier = "Watch";
    else if (combinedScore >= 35) overallTier = "High Risk";
    else overallTier = "Severe Exposure";

    /* ============================================================
       6) AI NARRATIVE (SAFE)
    ============================================================ */
    let narrative = "";
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        temperature: 0.3,
        messages: [
          {
            role: "user",
            content: `Write a concise executive compliance summary for this org:\n\nOrg: ${org.name}\nScore: ${combinedScore}\nTier: ${overallTier}`,
          },
        ],
      });

      narrative =
        completion.choices?.[0]?.message?.content?.trim() || "";
    } catch {
      narrative = "";
    }

    return res.status(200).json({
      ok: true,
      org,
      v5Engine: {
        vendorCount,
        globalScoreAvg,
        scoreBands,
      },
      alertsEngine: {
        alertCounts,
      },
      combined: {
        combinedScore,
        overallTier,
        narrative,
      },
    });
  } catch (err) {
    console.error("[org-compliance-v5] ERROR:", err);
    return res.status(200).json({
      ok: false,
      skipped: true,
      error: "Org compliance unavailable",
    });
  }
}
