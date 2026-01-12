// pages/api/vendors/index.js
// Vendor Index — UUID SAFE
// Returns raw vendor list for dashboard, dropdowns, vendors page

import { sql } from "@db";
import { resolveOrg } from "@resolveOrg";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "GET only" });
  }

  try {
    // 🔑 Resolve org UUID → internal INT
    const orgId = await resolveOrg(req, res);
    if (!orgId) {
      return res.status(200).json({ ok: true, vendors: [] });
    }

    // Fetch vendors (RAW, no analytics)
    const vendors = await sql`
      SELECT
        id,
        name,
        email,
        category,
        org_id,
        created_at
      FROM vendors
      WHERE org_id = ${orgId}
      ORDER BY name ASC;
    `;

    return res.status(200).json({
      ok: true,
      vendors,
    });
  } catch (err) {
    console.error("[api/vendors/index]", err);
    return res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
}
