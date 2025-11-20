// pages/api/requirements/check.js
import { Client } from "pg";

/**
 * Requirements / Compliance Check — Neon-backed, safe version
 *
 * Called like:
 *   /api/requirements/check?vendorId=2&orgId=1
 *
 * Returns:
 * {
 *   ok: true,
 *   summary: string,
 *   missing: [{ coverage_type }],
 *   failing: [{ coverage_type, reason }],
 *   passing: [{ coverage_type }]
 * }
 *
 * This is intentionally SIMPLE for now:
 * - It reads real policies from Neon
 * - Treats all existing policies as "passing"
 * - Leaves missing/failing empty until we wire the full rule/requirements engine
 */

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res
      .status(405)
      .json({ ok: false, error: "Method not allowed" });
  }

  const { vendorId, orgId } = req.query;

  const numericVendorId = Number(vendorId);
  if (!numericVendorId || Number.isNaN(numericVendorId)) {
    return res.status(400).json({
      ok: false,
      error: "vendorId must be a numeric ID",
    });
  }

  // Neon connection
  const connectionString =
    process.env.POSTGRES_URL_NO_SSL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL;

  const client = new Client({ connectionString });

  try {
    await client.connect();

    // 1) Load vendor (mainly to verify it exists)
    const vendorResult = await client.query(
      `
      SELECT id, org_id, name
      FROM vendors
      WHERE id = $1
      LIMIT 1;
      `,
      [numericVendorId]
    );

    if (vendorResult.rows.length === 0) {
      return res
        .status(404)
        .json({ ok: false, error: "Vendor not found" });
    }

    const vendor = vendorResult.rows[0];

    // 2) Load policies for this vendor (and org if provided)
    const policiesResult = await client.query(
      `
      SELECT
        id,
        coverage_type,
        status,
        policy_number,
        carrier,
        effective_date,
        expiration_date
      FROM policies
      WHERE vendor_id = $1
        ${orgId ? "AND org_id = $2" : ""}
      ORDER BY created_at DESC, id DESC;
      `,
      orgId ? [numericVendorId, Number(orgId) || null] : [numericVendorId]
    );

    const policies = policiesResult.rows;

    // 3) Build simple compliance object
    const passing = policies.map((p) => ({
      coverage_type: p.coverage_type || "Coverage",
    }));

    const missing = []; // later: derive from requirements table
    const failing = []; // later: derive from min limits / status

    let summary = "";
    if (policies.length === 0) {
      summary = `No active policies found on file for ${vendor.name}.`;
    } else if (policies.length === 1) {
      summary = `Found 1 policy on file for ${vendor.name}. Detailed requirements engine is not wired yet, but coverage is present.`;
    } else {
      summary = `Found ${policies.length} policies on file for ${vendor.name}. Detailed requirements engine is not wired yet, but coverage appears present.`;
    }

    return res.status(200).json({
      ok: true,
      summary,
      missing,
      failing,
      passing,
    });
  } catch (err) {
    console.error("requirements/check error:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Server error",
    });
  } finally {
    try {
      await client.end();
    } catch {
      // ignore
    }
  }
}
