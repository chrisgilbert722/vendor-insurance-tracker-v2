// pages/api/admin/org-compliance-v5.js
// ============================================================
// ORG-LEVEL COMPLIANCE INTELLIGENCE ENGINE — V5 (FIXED)
// - Correct import paths
// - UUID-safe
// - Build-safe on Vercel
// ============================================================

import { sql } from "../../../lib/db";
import { cleanUUID } from "../../../lib/uuid";
import { openai } from "../../../lib/openaiClient";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const orgId = cleanUUID(req.query.orgId);

    if (!orgId) {
      return res.status(200).json({
        ok: false,
        error: "Organization not found",
        reason: "missing-org-id",
      });
    }

    // ============================================================
    // ORG LOOKUP (SAFE)
    // ============================================================
    let orgRow;
    try {
      const orgRows = await sql`
        SELECT id, name
        FROM orgs
        WHERE id = ${orgId}
        LIMIT 1;
      `;
      orgRow = orgRows?.[0];
    } catch (e) {
      console.error("[org-compliance] org lookup failed:", e);
      return res.status(200).json({
        ok: false,
        error: "Organization not found (or org table missing)",
      });
    }

    if (!orgRow) {
      return res.status(200).json({
        ok: false,
        error: "Organization not found",
      });
    }

    // ============================================================
    // VENDORS
    // ============================================================
    const vendors = await sql`
      SELECT id, name
      FROM vendors
      WHERE org_id = ${orgId};
    `;

    const vendorCount = vendors.length;

    // ============================================================
    // COMPLIANCE CACHE (V5)
    // ============================================================
    const cacheRows = await sql`
      SELECT vendor_id, score
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

    // ============================================================
    // ALERTS (V5)
    // ============================================================
    const alerts = await sql`
      SELECT severity
      FROM alerts_v2
      WHERE org_id = ${orgId}
        AND resolved_at IS NULL;
    `;

    const alertCounts = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const a of alerts) {
      const sev = (a.severity || "").toLowerCase();
      if (alertCounts[sev] !== undefined) alertCounts[sev]++;
    }

    // ============================================================
    // COMBINED SCORE
    // ============================================================
    let combinedScore = avgScore;
    combinedScore -= alertCounts.critical * 2;
    combinedScore -= alertCounts.high;

    combinedScore = Math.max(0, Math.min(100, Math.round(combinedScore)));

    let tier = "Watch";
    if (combinedScore >= 85) tier = "Elite";
    else if (combinedScore >= 70) tier = "Stable";
    else if (combinedScore >= 55) tier = "Watch";
    else if (combinedScore >= 35) tier = "High Risk";
    else tier = "Severe";

    // ============================================================
    // AI EXEC SUMMARY (NON-BLOCKING)
    // ============================================================
    let narrative = "";
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        temperature: 0.3,
        messages: [
          {
            role: "user",
            content: `Write a concise executive summary (4–6 sentences)
for an insurance compliance dashboard.

Org: ${orgRow.name}
Vendors: ${vendorCount}
Avg score: ${avgScore}
Alerts: ${JSON.stringify(alertCounts)}
Overall tier: ${tier}`,
          },
        ],
      });

      narrative = completion.choices?.[0]?.message?.content || "";
    } catch (e) {
      console.warn("[org-compliance] AI summary skipped:", e.message);
    }

    return res.status(200).json({
      ok: true,
      org: orgRow,
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
    console.error("[org-compliance-v5] fatal:", err);
    return res.status(200).json({
      ok: false,
      error: "Org compliance unavailable",
    });
  }
}
