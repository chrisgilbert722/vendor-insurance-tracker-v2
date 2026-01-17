// pages/api/alerts/vendor-v3.js
// Vendor-level Alerts V3 — schema-safe: returns empty state

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res
      .status(405)
      .json({ ok: false, error: "Method not allowed. Use GET." });
  }

  const { vendorId, orgId } = req.query;

  // Return valid empty state (vendor_alerts table does not exist)
  return res.status(200).json({
    ok: true,
    vendorId: vendorId || null,
    orgId: orgId || null,
    alerts: [],
  });
}
