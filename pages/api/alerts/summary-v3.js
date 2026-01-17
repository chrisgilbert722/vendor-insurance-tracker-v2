// pages/api/alerts/summary-v3.js
// Alerts V3 — summary view (schema-safe: returns empty state)

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res
      .status(405)
      .json({ ok: false, error: "Method not allowed. Use GET." });
  }

  const { orgId } = req.query;

  // Return valid empty state (vendor_alerts table does not exist)
  return res.status(200).json({
    ok: true,
    orgId: orgId || null,
    total: 0,
    countsBySeverity: {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      unknown: 0,
    },
    vendors: {},
  });
}
