// pages/api/vendor/upload-coi.js
// V5 Upload → AI Parse → Store → Auto-Run Engine → Notify
// Now also feeds Document → Alert Intelligence V2.
// NOW ALSO: A5 — Auto-Resolve matching alerts on successful COI upload.
// ===============================================================

import formidable from "formidable";
import fs from "fs";
import { sql } from "../../../lib/db";
import { supabase } from "../../../lib/supabaseClient";
import { openai } from "../../../lib/openaiClient";
import { sendEmail } from "../../../lib/sendEmail";

// NEW: Document → Alert Intelligence V2 engine
import { runDocumentAlertIntelligenceV2 } from "../../../lib/documentAlertIntelligenceV2";

export const config = {
  api: { bodyParser: false },
};

function getBaseUrl(req) {
  // Prefer explicit config
  const envBase =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  if (envBase) return envBase.replace(/\/+$/, "");

  // Fallback (local dev)
  const host =
    req?.headers?.["x-forwarded-host"] || req?.headers?.host || "localhost:3000";
  const proto = req?.headers?.["x-forwarded-proto"] || "http";
  return `${proto}://${host}`;
}

function normalizeCoverageType(v) {
  if (!v) return null;
  return String(v).trim().toLowerCase();
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", ["POST"]);
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
    if (!file)
      return res.status(400).json({ ok: false, error: "No file uploaded." });

    if (!file.originalFilename.toLowerCase().endsWith(".pdf")) {
      return res.status(400).json({
        ok: false,
        error: "Only PDF files allowed.",
      });
    }

    // -------------------------------------------------------------
    // 2) Resolve vendor + org  (NOW INCLUDES requirements_json)
    // -------------------------------------------------------------
    let vendor = null;

    if (token) {
      // Vendor Portal Flow
      const tokenRows = await sql`
        SELECT vendor_id, org_id, expires_at
        FROM vendor_portal_tokens
        WHERE token = ${token}
        LIMIT 1
      `;
      if (!tokenRows.length)
        return res
          .status(404)
          .json({ ok: false, error: "Invalid vendor token." });

      const t = tokenRows[0];

      if (t.expires_at && new Date(t.expires_at) < new Date()) {
        return res.status(410).json({ ok: false, error: "Vendor link expired." });
      }

      const vendorRows = await sql`
        SELECT id, vendor_name, email, phone, category, org_id, requirements_json
        FROM vendors
        WHERE id = ${t.vendor_id}
        LIMIT 1
      `;
      if (!vendorRows.length)
        return res.status(404).json({ ok: false, error: "Vendor not found." });

      // org_id from token remains the source of truth, but we also have vendor.org_id
      vendor = { ...vendorRows[0], org_id: t.org_id };
    } else if (vendorIdField && orgIdField) {
      // Admin Upload Flow
      const vendorRows = await sql`
        SELECT id, vendor_name, email, phone, category, org_id, requirements_json
        FROM vendors
        WHERE id = ${vendorIdField} AND org_id = ${orgIdField}
      `;
      if (!vendorRows.length)
        return res.status(404).json({ ok: false, error: "Vendor not found." });

      vendor = vendorRows[0];
    } else {
      return res.status(400).json({
        ok: false,
        error: "Missing token OR vendorId + orgId.",
      });
    }

    const vendorId = vendor.id;
    const orgId = vendor.org_id;
    const requirementsProfile = vendor.requirements_json || {};

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

    const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(fileName);

    const fileUrl = urlData.publicUrl;

    await sql`
      INSERT INTO system_timeline (org_id, vendor_id, action, message, severity)
      VALUES (${orgId}, ${vendorId}, 'vendor_uploaded_coi', ${"Uploaded COI: " + fileName}, 'info')
    `;

    // -------------------------------------------------------------
    // 4) AI Extraction of COI → Safe wrapper
    // -------------------------------------------------------------
    let ai = null;
    try {
      ai = await openai.responses.parseCOI(fileUrl);

      await sql`
        INSERT INTO system_timeline (org_id, vendor_id, action, message, severity)
        VALUES (${orgId}, ${vendorId}, 'ai_parse_success', 'AI parsed COI', 'info')
      `;
    } catch (err) {
      console.error("[AI Parse ERROR]:", err);

      ai = { error: true, message: "AI failed to parse COI." };

      await sql`
        INSERT INTO system_timeline (org_id, vendor_id, action, message, severity)
        VALUES (${orgId}, ${vendorId}, 'ai_parse_failed', ${"AI failed: " + err.message}, 'critical')
      `;
    }

    // -------------------------------------------------------------
    // 5) Save COI metadata + vendor fields
    // -------------------------------------------------------------
    await sql`
      UPDATE vendors
      SET
        last_uploaded_coi = ${fileUrl},
        last_uploaded_at = NOW(),
        last_coi_json = ${ai},
        updated_at = NOW()
      WHERE id = ${vendorId};
    `;

    // -------------------------------------------------------------
    // 6) Document → Alert Intelligence V2 (NEW)
    // -------------------------------------------------------------
    let intelResult = null;
    let coverageTypeForResolve = null;

    try {
      // Normalize AI output into a document object the engine understands
      const docForIntel = {
        // Common fields your engine expects
        carrier: ai?.carrier ?? ai?.carrier_name ?? null,
        policyNumber: ai?.policy_number ?? ai?.policyNumber ?? null,
        coverageType: ai?.coverage_type ?? ai?.coverageType ?? null,
        effectiveDate: ai?.effective_date ?? ai?.effectiveDate ?? null,
        expirationDate: ai?.expiration_date ?? ai?.expirationDate ?? null,
        // Include full parsed payload + file URL for context
        ...ai,
        fileUrl,
      };

      coverageTypeForResolve = normalizeCoverageType(docForIntel.coverageType);

      intelResult = await runDocumentAlertIntelligenceV2({
        orgId,
        vendorId,
        document: docForIntel,
        requirementsProfile,
        source: token ? "vendor_portal_upload" : "admin_upload",
      });

      await sql`
        INSERT INTO system_timeline (org_id, vendor_id, action, message, severity)
        VALUES (${orgId}, ${vendorId}, 'document_intel_v2_success', 'Document Intelligence V2 analysis complete', 'info')
      `;
    } catch (err) {
      console.error("[Document Intelligence V2 ERROR]:", err);

      await sql`
        INSERT INTO system_timeline (org_id, vendor_id, action, message, severity)
        VALUES (${orgId}, ${vendorId}, 'document_intel_v2_failed', ${"Intelligence V2 error: " + err.message}, 'critical')
      `;
    }

    // -------------------------------------------------------------
    // 7) AUTO-RUN RULE ENGINE V5  (unchanged)
    // -------------------------------------------------------------
    try {
      const baseUrl = getBaseUrl(req);

      await fetch(`${baseUrl}/api/engine/run-v3`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId,
          orgId,
          dryRun: false,
        }),
      });

      await sql`
        INSERT INTO system_timeline (org_id, vendor_id, action, message, severity)
        VALUES (${orgId}, ${vendorId}, 'engine_v5_auto_run', 'V5 engine auto-evaluation complete', 'info')
      `;
    } catch (err) {
      console.error("[AUTO ENGINE RUN ERROR]:", err);

      await sql`
        INSERT INTO system_timeline (org_id, vendor_id, action, message, severity)
        VALUES (${orgId}, ${vendorId}, 'engine_v5_auto_run_failed', ${err.message}, 'critical')
      `;
    }

    // -------------------------------------------------------------
    // 7.5) A5 — AUTO-RESOLVE MATCHING ALERTS ON UPLOAD
    // -------------------------------------------------------------
    let autoResolved = { attempted: 0, resolved: 0, ids: [] };

    try {
      const baseUrl = getBaseUrl(req);

      // Find candidate alerts for this vendor/org that are still open or in_review.
      // If we can infer coverageType from AI/Intel, use it to narrow.
      const coverageNorm = coverageTypeForResolve;

      const candidateAlerts = coverageNorm
        ? await sql`
            SELECT id
            FROM alerts_v2
            WHERE org_id = ${orgId}
              AND vendor_id = ${vendorId}
              AND status IN ('open', 'in_review')
              AND (
                LOWER(COALESCE(metadata->>'coverage_type', metadata->>'coverageType', '')) = ${coverageNorm}
                OR LOWER(COALESCE(metadata->>'coverage', '')) = ${coverageNorm}
              )
            ORDER BY id DESC
            LIMIT 50
          `
        : await sql`
            SELECT id
            FROM alerts_v2
            WHERE org_id = ${orgId}
              AND vendor_id = ${vendorId}
              AND status IN ('open', 'in_review')
            ORDER BY id DESC
            LIMIT 50
          `;

      if (candidateAlerts?.length) {
        autoResolved.attempted = candidateAlerts.length;

        for (const row of candidateAlerts) {
          const alertId = row.id;

          const r = await fetch(`${baseUrl}/api/alerts-v2/resolve`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              alertId,
              resolvedBy: "system",
              resolutionNote: "Auto-resolved via COI upload",
            }),
          });

          const j = await r.json().catch(() => ({}));
          if (j?.ok) {
            autoResolved.resolved += 1;
            autoResolved.ids.push(alertId);
          }
        }

        if (autoResolved.resolved > 0) {
          await sql`
            INSERT INTO system_timeline (org_id, vendor_id, action, message, severity)
            VALUES (
              ${orgId},
              ${vendorId},
              'alerts_auto_resolved',
              ${`Auto-resolved ${autoResolved.resolved}/${autoResolved.attempted} alerts via COI upload`},
              'info'
            )
          `;
        }
      }
    } catch (err) {
      console.error("[A5 auto-resolve ERROR]:", err);

      await sql`
        INSERT INTO system_timeline (org_id, vendor_id, action, message, severity)
        VALUES (${orgId}, ${vendorId}, 'alerts_auto_resolve_failed', ${"Auto-resolve error: " + err.message}, 'critical')
      `;
    }

    // -------------------------------------------------------------
    // 8) SEND VENDOR CONFIRMATION EMAIL
    // -------------------------------------------------------------
    try {
      if (vendor?.email) {
        await sendEmail({
          to: vendor.email,
          subject: `Your COI Was Received`,
          body: `
Hi ${vendor.vendor_name || "there"},

We successfully received your Certificate of Insurance.

Our automated system is now reviewing it.

Thank you!
– Compliance Team
          `,
        });

        await sql`
          INSERT INTO system_timeline (org_id, vendor_id, action, message, severity)
          VALUES (${orgId}, ${vendorId}, 'vendor_email_sent', ${"Confirmation sent to " + vendor.email}, 'info')
        `;
      }
    } catch (err) {
      console.error("[Vendor Email Error]:", err);
    }

    // -------------------------------------------------------------
    // 9) SEND ADMIN NOTIFICATION EMAIL
    // -------------------------------------------------------------
    try {
      const ADMIN_EMAILS = process.env.ADMIN_NOTIFICATION_EMAILS
        ? process.env.ADMIN_NOTIFICATION_EMAILS.split(",")
        : ["admin@yourapp.com"];

      for (const adminEmail of ADMIN_EMAILS) {
        if (!adminEmail) continue;

        await sendEmail({
          to: adminEmail.trim(),
          subject: `New COI Uploaded — Vendor #${vendorId}`,
          body: `
A vendor uploaded a new COI.

Vendor: ${vendor.vendor_name}
Vendor ID: ${vendorId}
Org ID: ${orgId}

COI URL:
${fileUrl}

This COI has been automatically processed by the V5 Rule Engine and Document Intelligence V2.

Auto-resolved alerts:
${autoResolved?.resolved || 0}
          `,
        });
      }
    } catch (err) {
      console.error("[Admin Email Error]:", err);
    }

    // -------------------------------------------------------------
    // 10) FINAL RETURN PAYLOAD
    // -------------------------------------------------------------
    return res.status(200).json({
      ok: true,
      vendorId,
      orgId,
      fileUrl,
      ai,
      intelligence: intelResult,
      engine: "auto-run V5 executed",
      mode: token ? "vendor_portal" : "admin",
      autoResolve: autoResolved,
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
