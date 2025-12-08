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
    // -------------------------------------------------------
    const updateResult = await sql`
      UPDATE vendor_alerts
      SET resolved = TRUE,
          resolved_at = NOW()
      WHERE vendor_id = ${vendorId}
        AND code = ${code}
        AND (resolved IS NOT TRUE)
      RETURNING id;
    `;

    const resolvedRow = updateResult[0];

    if (!resolvedRow) {
      // Either already resolved or not found
      return res.status(200).json({
        ok: true,
        alreadyResolved: true,
        message: "Issue already resolved or not found.",
      });
    }

    // -------------------------------------------------------
    // 3) Log resolution into system_timeline
    // -------------------------------------------------------
    await sql`
      INSERT INTO system_timeline (org_id, vendor_id, action, message, severity)
      VALUES (
        ${orgId},
        ${vendorId},
        'vendor_issue_resolved',
        ${'Vendor resolved issue: ' + code},
        'info'
      );
    `;

    // -------------------------------------------------------
    // 4) Return success response
    // -------------------------------------------------------
    return res.status(200).json({
      ok: true,
      vendorId,
      orgId,
      resolved: true,
      code,
      message: "Issue marked as resolved.",
    });
  } catch (err) {
    console.error("[vendor/fix-issue] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Fix issue API failed.",
    });
  }
}
