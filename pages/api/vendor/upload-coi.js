// pages/api/vendor/upload-coi.js
import formidable from "formidable";
import fs from "fs";
import { sql } from "../../../lib/db";
import { supabase } from "../../../lib/supabaseClient";
import { openai } from "../../../lib/openaiClient"; // <-- add your OpenAI client

export const config = {
  api: {
    bodyParser: false,
  },
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

    /* -----------------------------------------
       2. Upload PDF → Supabase storage
    ----------------------------------------- */
    const fileBuffer = fs.readFileSync(file.filepath);
    const fileName = `vendor-coi-${vendor.id}-${Date.now()}.pdf`;

    const { error: uploadErr } = await supabase.storage
      .from("uploads")
      .upload(fileName, fileBuffer, {
        contentType: "application/pdf",
      });

    if (uploadErr) throw uploadErr;

    const { data: urlData } = supabase.storage
      .from("uploads")
      .getPublicUrl(fileName);

    const fileUrl = urlData.publicUrl;

    /* -----------------------------------------
       3. AI EXTRACT COI → real parsing
    ----------------------------------------- */
    const ai = await openai.responses.parseCOI(fileUrl);  
    // Structure example:
    // {
    //   policies: [...],
    //   missing: [...],
    //   endorsements: [...],
    //   summary: "string",
    //   limits: {...}
    // }

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

    const hasCritical = alerts.some((a) => a.severity === "critical");
    const hasMissing = alerts.some((a) => a.code === "missing_policy");

    const status = hasCritical
      ? "non_compliant"
      : hasMissing
      ? "pending"
      : "compliant";

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
    return res.status(500).json({ ok: false, error: err.message });
  }
}
