// pages/api/admin/vendors-lite.js
import { sql } from "../../../lib/db";
import { resolveOrg } from "../../../lib/resolveOrg";

export default async function handler(req, res) {
  // Only GET is supported
  if (req.method !== "GET") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  }

  try {
    // =========================================================
    // 🔒 Resolve org (external UUID → internal INT)
    // FAIL-SOFT: never crash UI
    // =========================================================
    const orgId = await resolveOrg(req, res);
    if (!orgId) {
      return; // resolveOrg already responded safely
    }

    // =========================================================
    // 📦 Lightweight vendor list (dashboard-safe)
    // =========================================================
    const rows = await sql`
      SELECT
        id,
        name,
        compliance_status,
        risk_score,
        updated_at
      FROM vendors
      WHERE org_id = ${orgId}
      ORDER BY updated_at DESC
      LIMIT 50;
    `;

    return res.status(200).json({
      ok: true,
      vendors: rows || [],
    });
  } catch (err) {
    console.error("[vendors-lite] fail-soft:", err?.message || err);

    // 🔇 NEVER break UI — empty list is valid
    return res.status(200).json({
      ok: true,
      vendors: [],
    });
  }
}
