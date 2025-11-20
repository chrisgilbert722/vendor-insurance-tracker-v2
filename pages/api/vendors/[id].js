// pages/api/vendors/[id].js
import { Client } from "pg";

/**
 * Real vendor API — Neon Postgres
 *
 * Returns:
 * {
 *   ok: true,
 *   vendor: { ... },
 *   organization: { ... } | null,
 *   policies: [ ... ]
 * }
 *
 * Works for:
 *  - /pages/vendor/[id].js   (old simple view)
 *  - /pages/admin/vendor/[id].js (cinematic profile)
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res
      .status(405)
      .json({ ok: false, error: "Method not allowed" });
  }

  const { id } = req.query;

  // If id like "summit-roofing" (not numeric), we can't hit DB yet.
  // In that case, return 404 and let the front-end fallback to mock.
  const numericId = Number(id);
  if (!numericId || Number.isNaN(numericId)) {
    return res
      .status(404)
      .json({ ok: false, error: "Vendor id must be numeric for DB lookup" });
  }

  // Pick the best connection string available from your Neon env vars
  const connectionString =
    process.env.POSTGRES_URL_NO_SSL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL;

  const client = new Client({ connectionString });

  try {
    await client.connect();

    // 1) Load vendor
    const vendorResult = await client.query(
      `
      SELECT id, org_id, name, email, phone, address, created_at
      FROM vendors
      WHERE id = $1
      LIMIT 1;
      `,
      [numericId]
    );

    if (vendorResult.rows.length === 0) {
      return res
        .status(404)
        .json({ ok: false, error: "Vendor not found" });
    }

    const vendor = vendorResult.rows[0];

    // 2) Load organization (simple; adjust columns as needed)
    let organization = null;
    if (vendor.org_id != null) {
      const orgResult = await client.query(
        `
        SELECT *
        FROM orgs
        WHERE id = $1
        LIMIT 1;
        `,
        [vendor.org_id]
      );
      organization = orgResult.rows[0] || null;
    }

    // 3) Load policies for this vendor
    const policiesResult = await client.query(
      `
      SELECT
        id,
        created_at,
        vendor_id,
        org_id,
        expiration_date,
        coverage_type,
        status,
        vendor_name,
        policy_number,
        carrier,
        effective_date
      FROM policies
      WHERE vendor_id = $1
      ORDER BY created_at DESC, id DESC;
      `,
      [numericId]
    );

    const policies = policiesResult.rows;

    // You can later also join in compliance cache, alerts, etc.
    return res.status(200).json({
      ok: true,
      vendor,
      organization,
      policies,
    });
  } catch (err) {
    console.error("Vendor API error:", err);
    return res
      .status(500)
      .json({ ok: false, error: err.message || "Server error" });
  } finally {
    await client.end().catch(() => {});
  }
}
