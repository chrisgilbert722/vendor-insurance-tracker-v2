// pages/api/renewals/predict-org-v1.js
import { sql } from "@db";
import { resolveOrg } from "@resolveOrg";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    // 🔒 Resolve org (external UUID → internal INT)
    const orgId = await resolveOrg(req, res);
    if (!orgId) return;

    // 🔎 Lightweight prediction inputs (safe if empty)
    const rows = await sql`
      SELECT
        v.id AS vendor_id,
        v.name AS vendor_name,
        p.expires_at
      FROM vendors v
      LEFT JOIN policies p
        ON p.vendor_id = v.id
      WHERE v.org_id = ${orgId};
    `;

    // 🧠 Simple, safe heuristic (no ML crash)
    const now = Date.now();
    const predictions = (rows || []).map((r) => {
      let risk = "low";
      if (r.expires_at) {
        const days =
          (new Date(r.expires_at).getTime() - now) / (1000 * 60 * 60 * 24);
        if (days < 7) risk = "critical";
        else if (days < 30) risk = "high";
        else if (days < 60) risk = "medium";
      }
      return {
        vendor_id: r.vendor_id,
        vendor_name: r.vendor_name,
        risk,
        expires_at: r.expires_at || null,
      };
    });

    return res.status(200).json({
      ok: true,
      predictions,
    });
  } catch (err) {
    console.error("[renewals/predict-org-v1] ERROR:", err);
    // 🔇 Never break UI
    return res.status(200).json({ ok: true, predictions: [] });
  }
}
