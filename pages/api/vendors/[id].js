// pages/api/vendors/[id].js
import { Client } from "pg";

export default async function handler(req, res) {
  const { id } = req.query;
  const vendorId = parseInt(id, 10);

  if (Number.isNaN(vendorId)) {
    return res
      .status(400)
      .json({ ok: false, error: "Invalid vendor id" });
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    // Load vendor (includes org_id)
    const vendorRes = await client.query(
      `SELECT id, org_id, name, email, phone, address, created_at
       FROM public.vendors
       WHERE id = $1`,
      [vendorId]
    );

    if (vendorRes.rows.length === 0) {
      return res
        .status(404)
        .json({ ok: false, error: "Vendor not found" });
    }

    // Load vendor's policies
    const policiesRes = await client.query(
      `SELECT id,
              vendor_id,
              vendor_name,
              policy_number,
              carrier,
              coverage_type,
              expiration_date,
              effective_date,
              status,
              created_at
       FROM public.policies
       WHERE vendor_id = $1
       ORDER BY created_at DESC`,
      [vendorId]
    );

    const vendor = vendorRes.rows[0];
    const policies = policiesRes.rows;

    return res.status(200).json({
      ok: true,
      vendor,
      policies,
    });
  } catch (err) {
    console.error("API /vendors/[id] error:", err);
    return res
      .status(500)
      .json({ ok: false, error: err.message || "Server error" });
  } finally {
    try {
      await client.end();
    } catch (_) {}
  }
}
