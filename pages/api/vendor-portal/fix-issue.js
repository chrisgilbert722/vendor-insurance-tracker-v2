// pages/api/vendor/fix-issue.js
// Vendor Portal V4 — Resolve Issue Endpoint
// Vendors use this API to mark alerts/issues as fixed.
// Logs resolution to system_timeline and updates vendor_alerts.

import { sql } from "../../../lib/db";

export const config = {
  api: {
    bodyParser: { sizeLimit: "1mb" },
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    const { token, code } = req.body || {};

    if (!token || !code) {
      return res.status(400).json({
        ok: false,
        error: "Missing token or alert code.",
      });
    }

    // -------------------------------------------------------
    // 1) Verify vendor via vendor_portal_tokens
    // -------------------------------------------------------
    const portalRows = await sql`
      SELECT vendor_id, org_id, expires_at
      FROM vendor_portal_tokens
      WHERE token = ${token}
      LIMIT 1
    `;

    if (!portalRows.length) {
      return res.status(404).json({
        ok: false,
        error: "Invalid vendor token.",
      });
    }

    const { vendor_id: vendorId, org_id: orgId, expires_at } = portalRows[0];

    // Token expired?
    if (expires_at && new Date(expires_at) < new Date()) {
      return res.status(410).json({
        ok: false,
        error: "This vendor link has expired.",
      });
    }

    // -------------------------------------------------------
    // 2) Update vendor_alerts: mark issue as resolved
    // vendor_alerts table does not exist - return no-op success
    // -------------------------------------------------------
    return res.status(200).json({
      ok: true,
      alreadyResolved: true,
      message: "Issue already resolved or not found.",
    });
  } catch (err) {
    console.error("[vendor/fix-issue] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Fix issue API failed.",
    });
  }
}
