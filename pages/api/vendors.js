// pages/api/vendors.js
// Simple vendor list API for upload-coi vendor picker

import { sql } from "../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const orgId = Number(req.query.orgId);

    if (!Number.isInteger(orgId) || orgId <= 0) {
      return res.status(200).json({
        ok: true,
        vendors: [],
      });
    }

    const vendors = await sql`
      SELECT
        id,
        name,
        email
      FROM vendors
      WHERE org_id = ${orgId}
      ORDER BY name ASC;
    `;

    return res.status(200).json({
      ok: true,
      vendors: vendors || [],
    });
  } catch (err) {
    console.error("[api/vendors] ERROR:", err);
    return res.status(200).json({
      ok: true,
      vendors: [],
    });
  }
}
