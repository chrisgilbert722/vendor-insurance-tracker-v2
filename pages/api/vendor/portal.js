// pages/api/vendor/portal.js
import { sql } from "../../../lib/db";

export default async function handler(req, res) {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ ok: false, error: "Missing token" });
    }

    /* ==========================================================
       1) Look up vendor via magic_link_token
    ========================================================== */
    const vendorRows = await sql`
      SELECT
        v.id,
        v.name,
        v.email,
        v.org_id,
        v.compliance_status,
        v.last_uploaded_coi,
        v.last_coi_json,
        o.name AS org_name
      FROM vendors v
      JOIN organizations o ON o.id = v.org_id
      WHERE v.magic_link_token = ${token}
      LIMIT 1;
    `;

    if (vendorRows.length === 0) {
      return res
        .status(404)
        .json({ ok: false, error: "Invalid or expired vendor link." });
    }

    const v = vendorRows[0];

    /* ==========================================================
       2) Load requirements (coverage requirements for this org)
    ========================================================== */

    let requirements = {
      coverages: [],
    };

    try {
      // You can adapt this to your real requirements table
      const reqRows = await sql`
        SELECT coverage_type, min_limit, severity
        FROM requirements_v5
        WHERE org_id = ${v.org_id};
      `;

      requirements.coverages = reqRows.map((r) => ({
        name: r.coverage_type,
        limit: r.min_limit ? `$${r.min_limit}` : null,
        severity: r.severity || "medium",
      }));
    } catch (err) {
      console.warn("[vendor/portal] No requirements_v5 table or query failed:", err);
    }

    /* ==========================================================
       3) Load vendor alerts (issues to fix)
    ========================================================== */

    let alerts = [];
    try {
      const alertRows = await sql`
        SELECT id, severity, code, message, created_at
        FROM vendor_alerts
        WHERE vendor_id = ${v.id}
        ORDER BY created_at DESC
        LIMIT 20;
      `;

      alerts = alertRows.map((a) => ({
        id: a.id,
        severity: a.severity,
        code: a.code,
        message: a.message,
        createdAt: a.created_at,
        label: a.code?.replace(/_/g, " ").toUpperCase(),
      }));
    } catch (err) {
      console.warn("[vendor/portal] No vendor_alerts table or query failed:", err);
    }

    /* ==========================================================
       4) Compute status label/description from compliance_status
    ========================================================== */
    let statusState = v.compliance_status || "pending";
    let statusLabel = "Pending Review";
    let statusDescription =
      "We have not yet completed review of your uploaded certificate.";

    if (statusState === "compliant") {
      statusLabel = "Compliant";
      statusDescription = "Your COI meets the current requirements.";
    } else if (statusState === "non_compliant") {
      statusLabel = "Non-Compliant";
      statusDescription =
        "There are issues with your coverage that must be addressed.";
    } else if (statusState === "pending") {
      statusLabel = "Pending COI Upload";
      statusDescription = "Please upload your latest COI to begin review.";
    }

    const status = {
      state: statusState,
      label: statusLabel,
      description: statusDescription,
    };

    /* ==========================================================
       5) Extract last AI parse for this vendor, if exists
    ========================================================== */

    let ai = null;
    try {
      if (v.last_coi_json) {
        ai = typeof v.last_coi_json === "string"
          ? JSON.parse(v.last_coi_json)
          : v.last_coi_json;
      }
    } catch (err) {
      console.warn("[vendor/portal] Failed to parse last_coi_json:", err);
    }

    /* ==========================================================
       6) Build response object
    ========================================================== */

    return res.status(200).json({
      ok: true,
      vendor: {
        id: v.id,
        name: v.name,
        email: v.email,
        lastUploadedCoi: v.last_uploaded_coi,
      },
      org: {
        id: v.org_id,
        name: v.org_name,
      },
      requirements,
      status,
      alerts,
      ai,
    });
  } catch (err) {
    console.error("[vendor/portal] ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
