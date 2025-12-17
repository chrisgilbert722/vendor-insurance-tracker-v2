// pages/api/admin/org-compliance-v5.js
// ============================================================
// ORG-LEVEL COMPLIANCE INTELLIGENCE ENGINE — V5 (FINAL)
// UUID-safe • Schema-correct • Build-safe • Non-blocking
// ============================================================

import { sql } from "../../../lib/db";
import { cleanUUID } from "../../../lib/uuid";
import { openai } from "../../../lib/openaiClient";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(200).json({ ok: false, error: "GET only" });
  }

  try {
    const orgId = cleanUUID(req.query.orgId);

    // HARD GUARD — UI safe
    if (!orgId) {
      return res.status(200).json({
        ok: false,
        skipped: true,
        error: "Invalid orgId",
      });
    }

    /* ============================================================
       1) ORG LOOKUP (CORRECT TABLE)
    ============================================================ */
    const orgRows = await sql`
      SELECT id, name
      FROM orgs
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
      SELECT id
      FROM vendors
      WHERE org_id = ${orgId};
    `;
    const vendorCount = vendors.length;

    /* ============================================================
       3) COMPLIANCE SCORE CACHE
    ============================================================ */
    const cacheRows = await sql`
      SELECT score
      FROM vendor_compliance_cache
      WHERE org_id = ${orgId};
    `;

    let avgScore = 0;
    if (cacheRows.length) {
      avgScore = Math.round(
        cacheRows.reduce((s, r) => s + (Number(r.score) || 0), 0) /
          cacheRows.length
      );
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
    let combinedScore = avgScore;
    combinedScore -= alertCounts.critical * 2;
    combinedScore -= alertCounts.high;
    combinedScore = Math.max(0, Math.min(100, Math.round(combinedScore)));

    let tier = "Watch";
    if (combinedScore >= 85) tier = "Elite Org";
    else if (combinedScore >= 70) tier = "Stable";
    else if (combinedScore >= 55) tier = "Watch";
    else if (combinedScore >= 35) tier = "High Risk";
    else tier = "Severe Exposure";

    /* ============================================================
       6) AI EXEC SUMMARY (NON-BLOCKING)
    ============================================================ */
    let narrative = "";
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        temperature: 0.3,
        messages: [
          {
            role: "user",
            content: `Write a concise executive compliance summary (4–6 sentences).

Org: ${org.name}
Vendors: ${vendorCount}
Avg score: ${avgScore}
Alerts: ${JSON.stringify(alertCounts)}
Overall tier: ${tier}`,
          },
        ],
      });

      narrative = completion.choices?.[0]?.message?.content || "";
    } catch {
      // AI failure must NEVER break UI
      narrative = "";
    }

    return res.status(200).json({
      ok: true,
      org,
      metrics: {
        vendorCount,
        avgScore,
        alertCounts,
        combinedScore,
        tier,
      },
      narrative,
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
