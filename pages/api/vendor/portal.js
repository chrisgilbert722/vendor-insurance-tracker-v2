// pages/api/vendor/portal.js
// Vendor Portal V4 — Fully Upgraded API
// Returns vendor info, alerts, policies, AI extraction, requirements (fallback), status (derived).

import { sql } from "../../../lib/db";

export const config = {
  api: {
    bodyParser: { sizeLimit: "2mb" },
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
      return res.status(400).json({ ok: false, error: "Missing vendor token." });
    }

    // ----------------------------------------------------------
    // 1) Find vendor + org from portal token
    // ----------------------------------------------------------
    const portalRows = await sql`
      SELECT vendor_id, org_id, expires_at
      FROM vendor_portal_tokens
      WHERE token = ${token}
      LIMIT 1
    `;

    if (!portalRows.length) {
      return res.status(404).json({
        ok: false,
        error: "Invalid vendor portal link.",
      });
    }

    const { vendor_id: vendorId, org_id: orgId, expires_at } = portalRows[0];

    // Expired?
    if (expires_at && new Date(expires_at) < new Date()) {
      return res.status(410).json({
        ok: false,
        error: "This vendor portal link has expired.",
      });
    }

    // ----------------------------------------------------------
    // 2) Load vendor
    // ----------------------------------------------------------
    const vendorRows = await sql`
      SELECT id, vendor_name, email, phone, category
      FROM vendors
      WHERE id = ${vendorId}
      LIMIT 1
    `;

    if (!vendorRows.length) {
      return res.status(404).json({
        ok: false,
        error: "Vendor not found.",
      });
    }

    const vendor = vendorRows[0];

    // ----------------------------------------------------------
    // 3) Load policies
    // ----------------------------------------------------------
    const policyRows = await sql`
      SELECT
        id,
        policy_number,
        carrier,
        coverage_type,
        expiration_date,
        limit_each_occurrence,
        auto_limit,
        work_comp_limit,
        umbrella_limit
      FROM policies
      WHERE vendor_id = ${vendorId}
      ORDER BY expiration_date ASC NULLS LAST
    `;

    // ----------------------------------------------------------
    // 4) Load alerts
    // ----------------------------------------------------------
    const alertRows = await sql`
      SELECT
        code,
        label,
        message,
        severity,
        created_at
      FROM vendor_alerts
      WHERE vendor_id = ${vendorId}
      ORDER BY severity DESC, created_at DESC
      LIMIT 50
    `;

    // ----------------------------------------------------------
    // 5) Load AI extraction (optional)
    // ----------------------------------------------------------
    let aiData = null;

    try {
      const aiRows = await sql`
        SELECT ai_json
        FROM vendor_ai_cache
        WHERE vendor_id = ${vendorId}
        ORDER BY created_at DESC
        LIMIT 1
      `;
      if (aiRows.length) {
        aiData = aiRows[0].ai_json;
      }
    } catch {
      // optional table — ignore missing
    }

    // ----------------------------------------------------------
    // 6) Derive status (your portal needs this)
    // ----------------------------------------------------------
    function deriveStatus(alerts, policies) {
      if (alerts?.some(a => ["critical", "high"].includes(String(a.severity).toLowerCase()))) {
        return { state: "non_compliant", label: "Non-Compliant" };
      }

      if (Array.isArray(policies) && policies.length > 0) {
        return { state: "compliant", label: "Compliant" };
      }

      return { state: "pending", label: "Pending Review" };
    }

    const status = deriveStatus(alertRows, policyRows);

    // ----------------------------------------------------------
    // 7) Requirements fallback (until Rule Engine V3 powers it)
    // ----------------------------------------------------------
    const requirements = {
      coverages: [] // Safe fallback so UI never breaks
    };

    // ----------------------------------------------------------
    // 8) Optional: update token usage timestamp
    // ----------------------------------------------------------
    try {
      await sql`
        UPDATE vendor_portal_tokens
        SET used_at = NOW()
        WHERE token = ${token}
      `;
    } catch (err) {
      console.warn("[vendor/portal] failed updating used_at:", err);
    }

    // ----------------------------------------------------------
    // 9) Return vendor portal data (V4-compatible)
    // ----------------------------------------------------------
    return res.status(200).json({
      ok: true,

      // For UI
      vendor,
      org: {
        id: orgId,
        name: "Your Customer" // Safe placeholder; customize later
      },

      // Data the UI expects:
      alerts: alertRows,
      policies: policyRows,
      ai: aiData,
      requirements,
      status,

      // For internal use if needed
      vendorId,
      orgId
    });
  } catch (err) {
    console.error("[vendor/portal] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Vendor portal failed.",
    });
  }
}
