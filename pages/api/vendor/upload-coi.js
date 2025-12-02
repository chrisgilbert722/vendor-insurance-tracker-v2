// pages/api/vendor/upload-coi.js
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
    const form = formidable({ multiples: false });
    const [fields, files] = await form.parse(req);

    const token = fields.token?.[0];
    const file = files.file?.[0];

    if (!token) {
      return res.status(400).json({ ok: false, error: "Missing token" });
    }
    if (!file) {
      return res.status(400).json({ ok: false, error: "No file uploaded" });
    }
    if (!file.originalFilename.toLowerCase().endsWith(".pdf")) {
      return res.status(400).json({ ok: false, error: "Only PDF files allowed." });
    }

    /* -----------------------------------------
       1. Validate vendor magic-link token
    ----------------------------------------- */
    const rows = await sql`
      SELECT id, org_id, name
      FROM vendors
      WHERE magic_link_token = ${token}
      LIMIT 1;
    `;

    if (rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Invalid vendor access link." });
    }

    const vendor = rows[0];

    // ⭐ LOG: vendor accessed upload endpoint
    await logVendorActivity(vendor.id, "access_upload", "Vendor accessed upload endpoint");

    /* -----------------------------------------
       2. Upload PDF → Supabase storage
    ----------------------------------------- */
    const buffer = fs.readFileSync(file.filepath);
    const fileName = `vendor-coi-${vendor.id}-${Date.now()}.pdf`;

    const { error: uploadErr } = await supabase.storage
      .from("uploads")
      .upload(fileName, buffer, { contentType: "application/pdf" });

    if (uploadErr) throw uploadErr;

    const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(fileName);
    const fileUrl = urlData.publicUrl;

    // ⭐ LOG
    await logVendorActivity(
      vendor.id,
      "uploaded_coi",
      `Vendor uploaded COI: ${fileName}`,
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
      "AI successfully parsed COI data",
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
       5. Compare → generate alerts
    ----------------------------------------- */
    const alerts = [];

    for (const req of requirements) {
      const match = ai.policies?.find(
        (p) => p.type.toLowerCase() === req.coverage_type.toLowerCase()
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
        `${alerts.length} compliance issues detected`,
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
      `Vendor status updated: ${status}`,
      status === "compliant" ? "info" : "warning"
    );

    /* -----------------------------------------
       6. Save parsed AI + status to DB
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
       7. Save alerts
    ----------------------------------------- */
    await sql`
      DELETE FROM vendor_alerts WHERE vendor_id = ${vendor.id};
    `;

    for (const a of alerts) {
      await sql`
        INSERT INTO vendor_alerts (vendor_id, severity, code, message, created_at)
        VALUES (${vendor.id}, ${a.severity}, ${a.code}, ${a.message}, NOW());
      `;
    }

    /* -----------------------------------------
       8. Return final payload
    ----------------------------------------- */
    return res.status(200).json({
      ok: true,
      fileUrl,
      ai,
      alerts,
      status,
    });
  } catch (err) {
    console.error("[vendor/upload-coi] ERROR:", err);

    // ⭐ LOG error event
    try {
      await logVendorActivity(null, "error", `Upload failed: ${err.message}`, "critical");
    } catch (_) {}

    return res.status(500).json({ ok: false, error: err.message });
  }
}
