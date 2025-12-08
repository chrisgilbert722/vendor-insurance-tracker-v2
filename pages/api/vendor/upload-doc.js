// pages/api/vendor/upload-doc.js
// MULTI-DOCUMENT UPLOAD ENGINE — Vendor Portal V4/V5 + Admin
//
// Supports:
// ✔ Vendor Portal Token (?token=...)
// ✔ Admin Upload (vendorId + orgId)
//
// Handles:
// ✔ W9
// ✔ Business License
// ✔ Contracts (auto-rule processing + Contract Intelligence V3 + Sync Requirements + V5 Engine Auto-Run)
// ✔ Endorsements
// ✔ Binders / Dec Pages
// ✔ Entity Certificates
// ✔ Other documents
//
// Provides:
// ✔ Supabase Storage Upload
// ✔ Document Classification
// ✔ Normalization via AI Parsers
// ✔ AI Summary (GPT-4.1)
// ✔ system_timeline Logging
// ✔ Vendor + Admin Email Notifications
// ✔ vendor_documents insert
//

import formidable from "formidable";
import fs from "fs";
import { sql } from "../../../lib/db";
import { supabase } from "../../../lib/supabaseClient";
import { openai } from "../../../lib/openaiClient";
import { sendEmail } from "../../../lib/sendEmail";
import { classifyDocument } from "../../../lib/docClassifier";

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    const form = formidable({ multiples: false });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error("[upload-doc] parse error:", err);
        return res
          .status(500)
          .json({ ok: false, error: "Upload parse failed." });
      }

      const token = fields.token?.[0] || null;
      const vendorIdField = fields.vendorId?.[0] || null;
      const orgIdField = fields.orgId?.[0] || null;
      let docTypeHint = fields.docType?.[0] || null;

      const file = files.file;
      if (!file) {
        return res
          .status(400)
          .json({ ok: false, error: "Missing file." });
      }

      const filepath = file.filepath;
      const filename = file.originalFilename;
      const mimetype = file.mimetype;

      if (!filename) {
        return res
          .status(400)
          .json({ ok: false, error: "Invalid file." });
      }

      const ext = filename.toLowerCase().split(".").pop();
      const allowed = ["pdf", "png", "jpg", "jpeg"];
      if (!allowed.includes(ext)) {
        return res.status(400).json({
          ok: false,
          error: "Only PDF, PNG, JPG, JPEG are allowed.",
        });
      }

      // ---------------------------------------------------------
      // 1) Resolve vendor + org (Token or Admin)
      // ---------------------------------------------------------
      let vendor = null;

      if (token) {
        const tokenRows = await sql`
          SELECT vendor_id, org_id, expires_at
          FROM vendor_portal_tokens
          WHERE token = ${token}
          LIMIT 1
        `;
        if (!tokenRows.length) {
          return res
            .status(404)
            .json({ ok: false, error: "Invalid vendor link." });
        }

        const t = tokenRows[0];
        if (t.expires_at && new Date(t.expires_at) < new Date()) {
          return res
            .status(410)
            .json({ ok: false, error: "Vendor link expired." });
        }

        const vendorRows = await sql`
          SELECT id, vendor_name, email, org_id
          FROM vendors
          WHERE id = ${t.vendor_id}
          LIMIT 1
        `;
        if (!vendorRows.length) {
          return res
            .status(404)
            .json({ ok: false, error: "Vendor not found." });
        }

        vendor = vendorRows[0];
      } else if (vendorIdField && orgIdField) {
        const vendorRows = await sql`
          SELECT id, vendor_name, email, org_id
          FROM vendors
          WHERE id = ${vendorIdField}
            AND org_id = ${orgIdField}
        `;
        if (!vendorRows.length) {
          return res
            .status(404)
            .json({ ok: false, error: "Vendor not found." });
        }

        vendor = vendorRows[0];
      } else {
        return res.status(400).json({
          ok: false,
          error: "Must provide token OR vendorId + orgId.",
        });
      }

      const vendorId = vendor.id;
      const orgId = vendor.org_id;

      // ---------------------------------------------------------
      // 2) Upload file → Supabase Storage
      // ---------------------------------------------------------
      const buffer = fs.readFileSync(filepath);
      const bucket = "vendor-docs";
      const uploadPath = `${vendorId}/${Date.now()}-${filename}`;

      const { error: uploadErr } = await supabase.storage
        .from(bucket)
        .upload(uploadPath, buffer, {
          contentType: mimetype,
        });

      if (uploadErr) {
        console.error("[upload-doc] storage error:", uploadErr);
        return res.status(500).json({
          ok: false,
          error: "Failed to upload document to storage.",
        });
      }

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(uploadPath);
      const fileUrl = urlData.publicUrl;

      await sql`
        INSERT INTO system_timeline (org_id, vendor_id, action, message, severity)
        VALUES (
          ${orgId},
          ${vendorId},
          'vendor_uploaded_document',
          ${"Uploaded document: " + filename},
          'info'
        )
      `;

      // ---------------------------------------------------------
      // 3) Classification
      // ---------------------------------------------------------
      const docType =
        (docTypeHint || classifyDocument({ filename, mimetype })) ||
        "other";

      if (docType === "coi") {
        return res.status(400).json({
          ok: false,
          error: "COIs must be uploaded through /api/vendor/upload-coi.",
        });
      }

      // ---------------------------------------------------------
      // BASE URL FOR INTERNAL API CALLS
      // ---------------------------------------------------------
      const BASE_URL =
        process.env.NEXT_PUBLIC_BASE_URL ||
        process.env.APP_URL ||
        "http://localhost:3000";

      // ---------------------------------------------------------
      // 4) AI Summary (GPT-4.1)
      // ---------------------------------------------------------
      let aiSummary = null;

      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4.1",
          temperature: 0.2,
          max_tokens: 300,
          messages: [
            {
              role: "system",
              content: "Summarize vendor compliance documents.",
            },
            {
              role: "user",
              content: `A vendor uploaded a ${docType} document:\n${fileUrl}\n\nSummarize key information and relevance to compliance.`,
            },
          ],
        });

        aiSummary = completion.choices[0]?.message?.content || "";

        await sql`
          INSERT INTO system_timeline (org_id, vendor_id, action, message, severity)
          VALUES (
            ${orgId},
            ${vendorId},
            'vendor_document_ai_summary',
            ${"AI summary generated for " + docType},
            'info'
          )
        `;
      } catch (err) {
        console.error("[AI SUMMARY ERROR]", err);
      }

      // ---------------------------------------------------------
      // 5) NORMALIZATION — CALL MULTI-DOC PARSERS
      // ---------------------------------------------------------
      let normalized = { docType, note: "no parser used" };

      try {
        let parserUrl = null;

        if (docType === "w9") {
          parserUrl = `${BASE_URL}/api/documents/parse-w9`;
        } else if (docType === "license") {
          parserUrl = `${BASE_URL}/api/documents/parse-license`;
        } else if (docType === "contract") {
          parserUrl = `${BASE_URL}/api/documents/parse-contract`;
        } else if (docType === "endorsement") {
          parserUrl = `${BASE_URL}/api/documents/parse-endorsement`;
        } else if (docType === "binder") {
          parserUrl = `${BASE_URL}/api/documents/parse-binder`;
        } else if (
          docType === "entity_certificate" ||
          docType === "entity" ||
          docType === "good_standing"
        ) {
          parserUrl = `${BASE_URL}/api/documents/parse-entity-certificate`;
        }

        if (parserUrl) {
          const parserRes = await fetch(parserUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileUrl, vendorId, orgId }),
          });

          const parserJson = await parserRes.json();

          if (parserJson.ok) {
            if (docType === "w9") {
              normalized = {
                docType,
                source: "w9Parser",
                w9: parserJson.w9 || null,
              };
            } else if (docType === "license") {
              normalized = {
                docType,
                source: "licenseParser",
                license: parserJson.license || null,
              };
            } else if (docType === "contract") {
              normalized = {
                docType,
                source: "contractParser",
                contract: parserJson.contract || null,
              };
            } else if (docType === "endorsement") {
              normalized = {
                docType,
                source: "endorsementParser",
                endorsement: parserJson.endorsement || null,
              };
            } else if (docType === "binder") {
              normalized = {
                docType,
                source: "binderParser",
                binder: parserJson.binder || null,
              };
            } else if (
              docType === "entity_certificate" ||
              docType === "entity" ||
              docType === "good_standing"
            ) {
              normalized = {
                docType,
                source: "entityCertificateParser",
                entityCertificate: parserJson.entityCertificate || null,
              };
            }
          } else {
            normalized = {
              docType,
              parserError: parserJson.error || "Parser returned !ok",
              rawParser: parserJson,
            };
          }
        } else {
          normalized = { docType, note: "No specific parser for this docType." };
        }
      } catch (e) {
        console.error("[upload-doc] normalization error:", e);
        normalized = {
          docType,
          error: "Normalization failed",
          message: e.message,
        };
      }

      // ---------------------------------------------------------
      // 6) Insert into vendor_documents
      // ---------------------------------------------------------
      const inserted = await sql`
        INSERT INTO vendor_documents (
          vendor_id,
          org_id,
          document_type,
          file_url,
          ai_json,
          uploaded_at
        )
        VALUES (
          ${vendorId},
          ${orgId},
          ${docType},
          ${fileUrl},
          ${JSON.stringify({ summary: aiSummary, normalized })},
          NOW()
        )
        RETURNING id
      `;

      const documentId = inserted[0]?.id;

      // ---------------------------------------------------------
      // 7) CONTRACT PIPELINE — Matching V3 + Sync Requirements + AUTO Rule Engine V5 + Legacy
      // ---------------------------------------------------------
      if (docType === "contract") {
        try {
          if (BASE_URL) {
            // 7A — Contract Matching V3
            try {
              await fetch(`${BASE_URL}/api/contracts/apply-matching`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ vendorId }),
              });

              await sql`
                INSERT INTO system_timeline (org_id, vendor_id, action, message, severity)
                VALUES (
                  ${orgId},
                  ${vendorId},
                  'contract_matching_v3_applied',
                  'Contract Matching V3 applied (coverage extraction + mismatch detection).',
                  'info'
                )
              `;
            } catch (err) {
              console.error("[upload-doc] Contract Matching V3 ERROR:", err);
            }

            // 7B — Contract → Requirements Sync Engine (V1)
            try {
              await fetch(`${BASE_URL}/api/contracts/sync-requirements`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ vendorId, orgId }),
              });

              await sql`
                INSERT INTO system_timeline (org_id, vendor_id, action, message, severity)
                VALUES (
                  ${orgId},
                  ${vendorId},
                  'contract_sync_requirements_v1',
                  'Contract → Requirements Sync Engine updated vendor requirements_json.',
                  'info'
                )
              `;
            } catch (err) {
              console.error("[upload-doc] Contract Sync Engine ERROR:", err);
            }

            // 7C — AUTO-RUN RULE ENGINE V5 (run-v3 endpoint)
            try {
              await fetch(`${BASE_URL}/api/engine/run-v3`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ vendorId, orgId, dryRun: false }),
              });

              await sql`
                INSERT INTO system_timeline (org_id, vendor_id, action, message, severity)
                VALUES (
                  ${orgId},
                  ${vendorId},
                  'rule_engine_v5_auto_run',
                  'Rule Engine V5 auto-run after contract sync.',
                  'info'
                )
              `;
            } catch (err) {
              console.error("[upload-doc] Auto-run V5 Engine ERROR:", err);
            }

            // 7D — LEGACY rules-v3 auto-process (optional)
            try {
              await fetch(
                `${BASE_URL}/api/admin/rules-v3/auto-process-contract`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ documentId }),
                }
              );

              await sql`
                INSERT INTO system_timeline (org_id, vendor_id, action, message, severity)
                VALUES (
                  ${orgId},
                  ${vendorId},
                  'contract_auto_process_triggered',
                  'Legacy rules-v3 auto-process triggered.',
                  'info'
                )
              `;
            } catch (err) {
              console.error("[contract auto-process ERROR]", err);
            }
          }
        } catch (err) {
          console.error("[CONTRACT V3 PIPELINE ERROR]", err);
        }
      }

      // ---------------------------------------------------------
      // 8) Notify Admin(s)
      // ---------------------------------------------------------
      try {
        const ADMINS = process.env.ADMIN_NOTIFICATION_EMAILS
          ? process.env.ADMIN_NOTIFICATION_EMAILS.split(",")
          : [];

        for (const email of ADMINS) {
          if (!email) continue;

          await sendEmail({
            to: email.trim(),
            subject: `New ${docType.toUpperCase()} Uploaded — Vendor #${vendorId}`,
            body: `
A vendor uploaded a new ${docType.toUpperCase()} document.

Vendor: ${vendor.vendor_name}
Vendor ID: ${vendorId}
Org ID: ${orgId}

Document URL:
${fileUrl}

AI Summary:
${aiSummary || "No summary generated."}

You can review this document in your admin dashboard.
            `,
          });
        }
      } catch (err) {
        console.error("[ADMIN EMAIL ERROR]", err);
      }

      // ---------------------------------------------------------
      // 9) Success Response
      // ---------------------------------------------------------
      return res.status(200).json({
        ok: true,
        documentId,
        vendorId,
        orgId,
        docType,
        fileUrl,
      });
    });
  } catch (err) {
    console.error("[upload-doc ERROR]", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Upload failed.",
    });
  }
}
