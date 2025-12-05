// pages/api/vendor/timeline.js
// Vendor Portal Timeline API — V4
// Loads all vendor activity grouped by token → vendorId → timeline events.

import { sql } from "../../../lib/db";

export const config = {
  api: {
    bodyParser: { sizeLimit: "1mb" },
  },
};

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ ok: false, error: "GET only" });
  }

  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        ok: false,
        error: "Missing token parameter.",
      });
    }

    // ---------------------------------------------------------
    // 1) VALIDATE TOKEN → find vendor + org
    // ---------------------------------------------------------
    const tokenRows = await sql`
      SELECT vendor_id, org_id, expires_at
      FROM vendor_portal_tokens
      WHERE token = ${token}
      LIMIT 1
    `;

    if (!tokenRows.length) {
      return res.status(404).json({
        ok: false,
        error: "Invalid or unknown vendor portal link.",
      });
    }

    const entry = tokenRows[0];

    // Token expiration check
    if (entry.expires_at) {
      const expires = new Date(entry.expires_at);
      const now = new Date();
      if (expires < now) {
        return res.status(410).json({
          ok: false,
          error: "This vendor portal link has expired.",
        });
      }
    }

    const vendorId = entry.vendor_id;
    const orgId = entry.org_id;

    // ---------------------------------------------------------
    // 2) LOAD TIMELINE EVENTS FOR THIS VENDOR
    // ---------------------------------------------------------
    // system_timeline table structure:
    // (org_id, vendor_id, action, message, severity, created_at)
    const timelineRows = await sql`
      SELECT
        action,
        message,
        severity,
        created_at
      FROM system_timeline
      WHERE vendor_id = ${vendorId}
      AND org_id = ${orgId}
      ORDER BY created_at DESC
      LIMIT 200
    `;

    // Normalize keys for frontend
    const timeline = timelineRows.map((row) => ({
      action: row.action || "",
      message: row.message || "",
      severity: row.severity || "info",
      createdAt: row.created_at,
    }));

    // ---------------------------------------------------------
    // 3) OPTIONAL: update token use timestamp
    // ---------------------------------------------------------
    try {
      await sql`
        UPDATE vendor_portal_tokens
        SET used_at = NOW()
        WHERE token = ${token}
      `;
    } catch (err) {
      console.warn("[vendor timeline] failed to update used_at:", err);
    }

    // ---------------------------------------------------------
    // 4) RESPONSE
    // ---------------------------------------------------------
    return res.status(200).json({
      ok: true,
      vendorId,
      orgId,
      timeline,
    });
  } catch (err) {
    console.error("[vendor/timeline] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Failed to load vendor activity timeline.",
    });
  }
}

