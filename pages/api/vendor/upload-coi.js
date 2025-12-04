// pages/api/renewals/upload.js
// Renewal-aware COI upload endpoint (can be used by vendors or admins)
//
// Supports two modes:
// 1) Vendor magic-link: multipart/form-data with `token` + `file`
// 2) Admin portal: multipart/form-data with `vendorId`, `orgId` + `file`

import formidable from "formidable";
import fs from "fs";
import { sql } from "../../../lib/db";
import { supabase } from "../../../lib/supabaseClient";
import { openai } from "../../../lib/openaiClient";
import { logVendorActivity } from "../../../lib/vendorActivity";

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", ["POST"]);
      return res
        .status(405)
        .json({ ok: false, error: "Method not allowed. Use POST." });
    }

    const form = formidable({ multiples: false });
    const [fields, files] = await form.parse(req);

    const token = fields.token?.[0]; // vendor magic link flow
    const vendorIdField = fields.vendorId?.[0]; // admin flow
    const orgIdField = fields.orgId?.[0]; // admin flow

    const file = files.file?.[0];

    if (!file) {
      return res
        .status(400)
        .json({ ok: false, error: "No file uploaded" });
    }
    if (!file.originalFilename.toLowerCase().endsWith(".pdf")) {
      return res
        .status(400)
        .json({ ok: false, error: "Only PDF files allowed." });
    }

    /* -----------------------------------------
       1. Resolve vendor (token or vendorId/orgId)
    ----------------------------------------- */
    let vendor = null;

    if (token) {
      // Magic-link vendor upload
      const rows = await sql`
        SELECT id, org_id, name
        FROM vendors
        WHERE magic_link_token = ${token}
        LIMIT 1;
      `;
      if (!rows.length) {
        return res.status(404).json({
          ok: false,
          error: "Invalid vendor access link.",
        });
      }
      vendor = rows[0];
    } else if (vendorIdField && orgIdField) {
      // Admin-upload flow (no magic link)
      const rows = await sql`
        SELECT id, org_id, name
        FROM vendors
        WHERE id = ${vendorIdField}
        AND org_id = ${orgIdField}
        LIMIT 1;
      `;
      if (!rows.length) {
        return res.status(404).json({
          ok: false,
          error: "Vendor not found for given vendorId/orgId.",
        });
      }
      vendor = rows[0];
    } else {
      return res.status(400).json({
        ok: false,
        error: "Missing vendor identity. Provide either token OR vendorId + orgId.",
      });
    }

    // ⭐ LOG: vendor accessed renewal upload endpoint
    await logVendorActivity(
      vendor.id,
      "access_upload",
      "Vendor accessed renewal upload endpoint"
    );

    /* -----------------------------------------
       2. Upload PDF → Supabase storage
    ----------------------------------------- */
    const buffer = fs.readFileSync(file.filepath);
    const fileName = `vendor-coi-renewal-${vendor.id}-${Date.now()}.pdf`;

    const { error: uploadErr } = await supabase.storage
      .from("uploads")
      .upload(fileName, buffer, { contentType: "application/pdf" });

    if (uploadErr) throw uploadErr;

    const { data: urlData } = supabase.storage
      .from("uploads")
      .getPublicUrl(fileName);
    const fileUrl = urlData.publicUrl;

    // ⭐ LOG
    await logVendorActivity(
      vendor.id,
      "uploaded_coi",
      `Vendor uploaded renewal COI: ${fileName}`,
      "info"
    );

    /* -----------------------------------------
       3. AI EXTRACT COI → real parsing
    ----------------------------------------- */
    const ai = await openai.responses.parseCOI(fileUrl);

    // ⭐ LOG
    await logVendorActivity(
      vendor.id,
      "parsed_ai",
      "AI successfully parsed renewal COI data",
      "info"
    );

    /* -----------------------------------------
       4. Load org coverage requirements
    ----------------------------------------- */
    const reqRows = await sql`
      SELECT *
      FROM requirements_v5
      WHERE org_id = ${vendor.org_id};
    `;

    const requirements = reqRows || [];

    /* -----------------------------------------
       5. Compare → generate alerts (simple requirements-based)
       NOTE: This mirrors your existing upload-coi alerts logic
    ----------------------------------------- */
    const alerts = [];

    for (const req of requirements) {
      const match = ai.policies?.find(
        (p) => p.type?.toLowerCase() === req.coverage_type?.toLowerCase()
      );

      if (!match) {
        alerts.push({
          code: "missing_policy",
          severity: req.severity || "high",
          message: `Missing ${req.coverage_type} coverage.`,
        });
        continue;
      }

      if (req.min_limit && Number(match.limit) < Number(req.min_limit)) {
        alerts.push({
          code: "low_limit",
          severity: "medium",
          message: `${req.coverage_type} limit too low.`,
        });
      }

      if (match.expired) {
        alerts.push({
          code: "expired_policy",
          severity: "critical",
          message: `${req.coverage_type} is expired.`,
        });
      }
    }

    // ⭐ LOG every issue detected
    if (alerts.length > 0) {
      await logVendorActivity(
        vendor.id,
        "issues_detected",
        `${alerts.length} renewal compliance issues detected`,
        "warning"
      );
    }

    const hasCritical = alerts.some((a) => a.severity === "critical");
    const hasMissing = alerts.some((a) => a.code === "missing_policy");

    const status = hasCritical
      ? "non_compliant"
      : hasMissing
      ? "pending"
      : "compliant";

    // ⭐ LOG status update
    await logVendorActivity(
      vendor.id,
      "status_update",
      `Vendor renewal status updated: ${status}`,
      status === "compliant" ? "info" : "warning"
    );

    /* -----------------------------------------
       6. Save parsed AI + status to DB
       (mirrors vendor/upload-coi.js)
    ----------------------------------------- */
    await sql`
      UPDATE vendors
      SET
        last_uploaded_coi = ${fileUrl},
        last_uploaded_at = NOW(),
        last_coi_json = ${ai},
        compliance_status = ${status},
        updated_at = NOW()
      WHERE id = ${vendor.id};
    `;

    /* -----------------------------------------
       7. Save alerts (and implicitly clear renewal alerts)
       We clear all vendor_alerts for this vendor and reinsert.
       That nukes RENEWAL_7D / 3D / 1D alerts after a successful upload.
    ----------------------------------------- */
    await sql`
      DELETE FROM vendor_alerts 
      WHERE vendor_id = ${vendor.id};
    `;

    for (const a of alerts) {
      await sql`
        INSERT INTO vendor_alerts (vendor_id, severity, code, message, created_at)
        VALUES (
          ${vendor.id},
          ${a.severity},
          ${a.code},
          ${a.message},
          NOW()
        );
      `;
    }

    /* -----------------------------------------
       8. Return final payload
    ----------------------------------------- */
    return res.status(200).json({
      ok: true,
      mode: token ? "magic_link" : "admin",
      vendorId: vendor.id,
      orgId: vendor.org_id,
      fileUrl,
      ai,
      alerts,
      status,
    });
  } catch (err) {
    console.error("[renewals/upload] ERROR:", err);

    try {
      await logVendorActivity(
        null,
        "error",
        `Renewal upload failed: ${err.message}`,
        "critical"
      );
    } catch (_) {}

    return res.status(500).json({ ok: false, error: err.message });
  }
}
