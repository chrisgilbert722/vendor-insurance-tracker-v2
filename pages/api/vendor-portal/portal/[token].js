// pages/api/vendor/portal/[token].js
// Vendor Portal Resolver — V3
// Validates vendor portal token + returns vendor profile, policies, alerts, and future doc support.

import { sql } from "../../../../lib/db";

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

    if (!token || typeof token !== "string") {
      return res.status(400).json({
        ok: false,
        error: "Missing or invalid token parameter.",
      });
    }

    // 1) Find token entry
    const tokenRows = await sql`
      SELECT id, org_id, vendor_id, expires_at, used_at
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

    // Check expiration
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

    const orgId = entry.org_id;
    const vendorId = entry.vendor_id;

    // 2) Load vendor profile
    const vendorRows = await sql`
      SELECT id, name, email, org_id, created_at
      FROM vendors
      WHERE id = ${vendorId} AND org_id = ${orgId}
      LIMIT 1
    `;

    if (!vendorRows.length) {
      return res.status(404).json({
        ok: false,
        error: "Vendor profile not found.",
      });
    }

    const vendor = vendorRows[0];

    // 3) Load policies on file (fail-safe)
    let policies = [];
    try {
      policies = await sql`
        SELECT
          id,
          policy_number,
          carrier,
          coverage_type,
          expiration_date
        FROM policies
        WHERE vendor_id = ${vendorId}
        ORDER BY expiration_date DESC NULLS LAST
      `;
    } catch (e) {
      console.warn("[vendor/portal] Policies query failed:", e.message);
    }

    // 4) Load vendor alerts (open issues)
    // vendor_alerts table does not exist - return empty array
    const alerts = [];

    // 5) OPTIONAL — future expansion: load uploaded docs (W9, licenses, etc.)
    let documents = [];
    try {
      documents = await sql`
        SELECT id, document_type, file_url, uploaded_at
        FROM vendor_documents
        WHERE vendor_id = ${vendorId}
        ORDER BY uploaded_at DESC
      `;
    } catch {
      // Ignore for now — table may not exist yet.
    }

    // 6) OPTIONAL — update last accessed timestamp
    try {
      await sql`
        UPDATE vendor_portal_tokens
        SET used_at = NOW()
        WHERE token = ${token}
      `;
    } catch (err) {
      console.warn("[vendor_portal] failed to update used_at:", err);
    }

    // 7) Return complete vendor portal payload
    return res.status(200).json({
      ok: true,
      orgId,
      vendorId,
      vendor,
      policies,
      alerts,
      documents, // for future-proof portal V4
    });
  } catch (err) {
    console.error("[vendor/portal] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Vendor portal failed to load.",
    });
  }
}
