// pages/api/vendors/[id].js
import { sql } from "../../../src/lib/db";

export default async function handler(req, res) {
  const { id } = req.query;
  const vendorId = parseInt(id, 10);

  if (!vendorId || Number.isNaN(vendorId)) {
    return res
      .status(400)
      .json({ ok: false, error: "Invalid vendor id." });
  }

  try {
    // 1) Vendor
    const vendorRows =
      await sql`SELECT * FROM public.vendors WHERE id = ${vendorId}`;
    if (!vendorRows || vendorRows.length === 0) {
      return res
        .status(404)
        .json({ ok: false, error: "Vendor not found." });
    }
    const vendor = vendorRows[0];

    // 2) Organization (optional)
    let organization = null;
    if (vendor.org_id) {
      const orgRows =
        await sql`SELECT * FROM public.organizations WHERE id = ${vendor.org_id}`;
      organization = orgRows[0] || null;
    }

    // 3) Policies
    const policyRows =
      await sql`SELECT * FROM public.policies WHERE vendor_id = ${vendorId} ORDER BY id DESC`;

    return res.status(200).json({
      ok: true,
      vendor,
      organization,
      policies: policyRows || [],
    });
  } catch (err) {
    console.error("[api/vendors/[id]] error:", err);
    return res
      .status(500)
      .json({ ok: false, error: err.message || "Server error" });
  }
}
