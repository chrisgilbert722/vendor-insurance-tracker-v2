// pages/api/admin/vendors-lite.js
import { sql } from "@db";
import { resolveOrg } from "@resolveOrg";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    // 🔒 Resolve external UUID → internal numeric org_id
    const orgId = await resolveOrg(req, res);
    if (!orgId) return;

    const vendors = await sql`
      SELECT
        id,
        name AS vendor_name
      FROM vendors
      WHERE org_id = ${orgId}
      ORDER BY name ASC;
    `;

    return res.status(200).json({
      ok: true,
      vendors: vendors || [],
    });
  } catch (err) {
    console.error("[vendors-lite] ERROR:", err);
    return res.status(200).json({
      ok: true,
      vendors: [], // 🔇 never break UI
    });
  }
}
