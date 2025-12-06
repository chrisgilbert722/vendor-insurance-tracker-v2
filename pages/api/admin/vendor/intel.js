// pages/api/admin/vendor/intel.js
// Vendor Intelligence Graph API — Step 1
// GET /api/admin/vendor/intel?orgId=...&vendorId=...

import { computeVendorIntelligence } from "../../../../lib/vendorIntelligence";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res
        .status(405)
        .json({ ok: false, error: "Method not allowed" });
    }

    const { orgId, vendorId } = req.query;

    const orgIdInt = orgId ? parseInt(orgId, 10) : null;
    const vendorIdInt = vendorId ? parseInt(vendorId, 10) : null;

    if (!orgIdInt || !vendorIdInt) {
      return res.status(400).json({
        ok: false,
        error: "Missing or invalid orgId/vendorId.",
      });
    }

    const intel = await computeVendorIntelligence(orgIdInt, vendorIdInt);

    return res.status(200).json({
      ok: true,
      data: intel,
    });
  } catch (err) {
    console.error("[admin/vendor/intel] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Internal error",
    });
  }
}
