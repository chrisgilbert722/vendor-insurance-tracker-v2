// pages/api/admin/vendors-lite.js
import { sql } from "../../../lib/db";
import { resolveOrg } from "../../../lib/resolveOrg";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    // 🔒 Resolve org (external UUID → internal INT)
    const orgId = await resolveOrg(req, res);
    if (!orgId) return;

    // 🧠 Lightweight vendor list for dashboards / side panels
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
    console.error("[VENDORS-LITE ERROR]", err);

    // 🔇 Never break dashboard — return empty safe response
    return res.status(200).json({
      ok: true,
      vendors: [],
    });
  }
}
