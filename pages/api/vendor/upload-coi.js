// pages/api/vendor/upload-coi.js
// Vendor Portal V4 — COI Upload + AI Parse + Alerts + Confirmation Email
// Supports:
// • Vendor portal token (Option 2 ?token=...)
// • Admin upload (vendorId + orgId)

import formidable from "formidable";
import fs from "fs";
import { sql } from "../../../lib/db";
import { supabase } from "../../../lib/supabaseClient";
import { openai } from "../../../lib/openaiClient";
import { sendEmail } from "../../../lib/sendEmail";

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Use POST method." });
    }

    // -------------------------------------------------------------
    // 1) Parse multipart form-data (PDF + token or vendorId/orgId)
    // -------------------------------------------------------------
    const form = formidable({ multiples: false });
    const [fields, files] = await form.parse(req);

    const token = fields.token?.[0] || null;
    const vendorIdField = fields.vendorId?.[0] || null;
    const orgIdField = fields.orgId?.[0] || null;

    const file = files.file?.[0];
    if (!file) {
      return res.status(400).json({ ok: false, error: "No file uploaded." });
    }
    if (!file.originalFilename.toLowerCase().endsWith(".pdf")) {
      return res.status(400).json({ ok: false, error: "Only PDF files allowed." });
    }

    // -------------------------------------------------------------
    // 2) Resolve vendor + org (Portal Token Flow OR Admin Flow)
    // -------------------------------------------------------------
    let vendor = null;

    if (token) {
      // Vendor Portal Token Flow
      const tokenRows = await sql`
        SELECT vendor_id, org_id, expires_at
        FROM vendor_portal_tokens
        WHERE token = ${token}
        LIMIT 1
      `;

      if (!tokenRows.length) {
        return res.status(404).json({ ok: false, error: "Invalid vendor token." });
      }

      const t = tokenRows[0];

      if (t.expires_at && new Date(t.expires_at) < new Date()) {
        return res.status(410).json({ ok: false, error: "Vendor link expired." });
      }

      const vendorRows = await sql`
        SELECT id, vendor_name, email, phone, category
        FROM vendors
        WHERE id = ${t.vendor_id}
        LIMIT 1
      `;

      if (!vendorRows.length) {
        return res.status(404).json({ ok: false, error: "Vendor not found." });
      }

      vendor = { ...vendorRows[0], org_id: t.org_id };
    }

    else if (vendorIdField && orgIdField) {
      // Admin Upload Flow
      const vendorRows = await sql`
        SELECT id, vendor_name, email, phone, category, org_id
        FROM vendors
        WHERE id = ${vendorIdField} AND org_id = ${orgIdField}
      `;
      if (!vendorRows.length) {
        return res.status(404).json({ ok: false, error: "Vendor not found." });
      }
      vendor = vendorRows[0];
    }

    else {
      return res.status(400).json({
        ok: false,
        error: "Missing vendor identity: must provide token or vendorId + orgId",
      });
    }

    const vendorId = vendor.id;
    const orgId = vendor.org_id;

    // -------------------------------------------------------------
    // 3) Upload PDF → Supabase storage
    // -------------------------------------------------------------
    const pdfBuffer = fs.readFileSync(file.filepath);
    const fileName = `vendor-coi-${vendorId}-${Date.now()}.pdf`;

    const { error: uploadErr } = await supabase.storage
      .from("uploads")
      .upload(fileName, pdfBuffer, {
        contentType: "application/pdf",
      });

    if (uploadErr) throw uploadErr;

    const { data: urlData } = supabase.storage
      .from("uploads")
      .getPublicUrl(fileName);

    const fileUrl = urlData.publicUrl;

    // Log upload event
    await sql`
      INSERT INTO system_timeline (org_id, vendor_id, action, message, severity)
      VALUES (
        ${orgId}, ${vendorId},
        'vendor_uploaded_coi',
        ${'Vendor uploaded COI: ' + fileName},
        'info'
      )
    `;

    // -------------------------------------------------------------
    // 4) AI Extraction of COI
    // -------------------------------------------------------------
    let ai = null;
    try {
      ai = await openai.responses.parseCOI(fileUrl);

      await sql`
        INSERT INTO system_timeline (org_id, vendor_id, action, message, severity)
        VALUES (${orgId}, ${vendorId}, 'ai_parse_success', 'AI parsed COI successfully', 'info')
      `;
    } catch (err) {
      console.error("[AI Parse ERROR]:", err);

      await sql`
        INSERT INTO system_timeline (org_id, vendor_id, action, message, severity)
        VALUES (${orgId}, ${vendorId}, 'ai_parse_failed', 'AI failed to parse COI', 'critical')
      `;

      ai = { error: true, message: "Failed to parse COI" };
    }

    // -------------------------------------------------------------
    // 5) Load Requirements (fallback empty)
    // -------------------------------------------------------------
    let requirements = [];
    try {
      const reqRows = await sql`
        SELECT coverage_type, severity, min_limit
        FROM requirements_v5
        WHERE org_id = ${orgId}
      `;
      requirements = reqRows || [];
    } catch (_) {
      requirements = [];
    }

    // -------------------------------------------------------------
    // 6) Simple Alert Generator (V4-safe)
    // -------------------------------------------------------------
    const alerts = [];

    for (const req of requirements) {
      const match = ai?.policies?.find(
        (p) =>
          p.type?.toLowerCase() === req.coverage_type?.toLowerCase()
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
          message: `${req.coverage_type} limit below required minimum.`,
        });
      }

      if (match.expired) {
        alerts.push({
          code: "expired_policy",
          severity: "critical",
          message: `${req.coverage_type} policy is expired.`,
        });
      }
    }

    // Log alert count
    if (alerts.length) {
      await sql`
        INSERT INTO system_timeline (org_id, vendor_id, action, message, severity)
        VALUES (
          ${orgId}, ${vendorId},
          'coi_issues_detected',
          ${alerts.length + ' issues detected during COI review'},
          'warning'
        )
      `;
    }

    // -------------------------------------------------------------
    // 7) Compute status (fallback-safe)
    // -------------------------------------------------------------
    const hasCritical = alerts.some((a) => a.severity === "critical");
    const hasMissing = alerts.some((a) => a.code === "missing_policy");

    const status = hasCritical
      ? "non_compliant"
      : hasMissing
      ? "pending"
      : "compliant";

    await sql`
      INSERT INTO system_timeline (org_id, vendor_id, action, message, severity)
      VALUES (
        ${orgId}, ${vendorId},
        'coi_status_updated',
        ${'Status updated to ' + status},
        ${status === "compliant" ? "info" : "warning"}
      )
    `;

    // -------------------------------------------------------------
    // 8) Save AI + status → vendors
    // -------------------------------------------------------------
    await sql`
      UPDATE vendors
      SET
        last_uploaded_coi = ${fileUrl},
        last_uploaded_at = NOW(),
        last_coi_json = ${ai},
        compliance_status = ${status},
        updated_at = NOW()
      WHERE id = ${vendorId};
    `;

    // -------------------------------------------------------------
    // 9) Rewrite vendor_alerts
    // -------------------------------------------------------------
    await sql`
      DELETE FROM vendor_alerts
      WHERE vendor_id = ${vendorId};
    `;

    for (const a of alerts) {
      await sql`
        INSERT INTO vendor_alerts (vendor_id, severity, code, message, created_at)
        VALUES (${vendorId}, ${a.severity}, ${a.code}, ${a.message}, NOW());
      `;
    }

    // -------------------------------------------------------------
    // 10) SEND VENDOR CONFIRMATION EMAIL  (NEW)
    // -------------------------------------------------------------
    try {
      if (vendor?.email) {
        await sendEmail({
          to: vendor.email,
          subject: `Your COI Was Received`,
          body: `
Hi ${vendor.vendor_name || "there"},

We received your Certificate of Insurance and our automated system is now reviewing it.

If anything else is required, you'll receive another message.

Thank you!
– Compliance Team
          `,
        });

        await sql`
          INSERT INTO system_timeline (org_id, vendor_id, action, message, severity)
          VALUES (
            ${orgId}, ${vendorId},
            'vendor_upload_confirmation_sent',
            ${'Upload confirmation email sent to vendor: ' + vendor.email},
            'info'
          )
        `;
      }
    } catch (err) {
      console.error("[upload-coi] Failed sending confirmation email:", err);
    }

    // -------------------------------------------------------------
    // 11) RETURN FINAL PAYLOAD
    // -------------------------------------------------------------
    return res.status(200).json({
      ok: true,
      vendorId,
      orgId,
      fileUrl,
      ai,
      alerts,
      status,
      mode: token ? "vendor_portal" : "admin",
    });

  } catch (err) {
    console.error("[upload-coi ERROR]:", err);

    await sql`
      INSERT INTO system_timeline (action, message, severity)
      VALUES ('upload_error', ${err.message}, 'critical')
    `;

    return res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
}
