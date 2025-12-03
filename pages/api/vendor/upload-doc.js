// pages/api/vendor/upload-doc.js
//
// Multi-Document Upload Endpoint (W9, License, Contract, Other)
// NOTE: COIs are still handled by /api/vendor/upload-coi.
//

import formidable from "formidable";
import fs from "fs";
import { supabase } from "../../../lib/supabaseClient";
import { sql } from "../../../lib/db";
import { classifyDocument } from "../../../lib/docClassifier";
import { normalizeW9 } from "../../../lib/w9Normalizer";
import { normalizeLicense } from "../../../lib/licenseNormalizer";
import { normalizeContract } from "../../../lib/contractNormalizer";

// Disable Next.js default body parser for file upload
export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    const form = new formidable.IncomingForm();

    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error("[upload-doc] parse error", err);
        return res.status(500).json({ ok: false, error: "Upload parse failed" });
      }

      const vendorId = Number(fields.vendorId);
      const orgId = Number(fields.orgId);
      const docTypeHint = fields.docType || null;

      if (!vendorId || !orgId) {
        return res.status(400).json({
          ok: false,
          error: "Missing vendorId or orgId",
        });
      }

      const file = files.file;
      if (!file) {
        return res.status(400).json({
          ok: false,
          error: "Missing file",
        });
      }

      const filepath = file.filepath || file.path;
      const filename = file.originalFilename || file.name;
      const mimetype = file.mimetype || file.type || "application/octet-stream";

      // TODO: integrate real AI extraction later
      const aiExtracted = {};

      const textSample = ""; // placeholder for classifier (can enhance later)

      // Classify doc type
      let docType = docTypeHint || classifyDocument({ filename, mimetype, textSample });

      // COIs belong in upload-coi
      if (docType === "coi") {
        return res.status(400).json({
          ok: false,
          error: "COI detected — use /api/vendor/upload-coi instead.",
        });
      }

      /* ----------------------------------------------------------
         Upload raw PDF to Supabase Storage
      ---------------------------------------------------------- */
      let storageKey = null;

      if (filepath) {
        const fileBuffer = fs.readFileSync(filepath);
        const bucket = "vendor-docs";
        const uploadPath = `${vendorId}/${Date.now()}-${filename}`;

        const { error: uploadErr } = await supabase.storage
          .from(bucket)
          .upload(uploadPath, fileBuffer, {
            contentType: mimetype,
            upsert: false,
          });

        if (uploadErr) {
          console.error("[upload-doc] supabase upload error", uploadErr);
          return res.status(500).json({
            ok: false,
            error: "Failed to store document.",
          });
        }

        storageKey = `${bucket}/${uploadPath}`;
      }

      /* ----------------------------------------------------------
         Normalize based on docType
      ---------------------------------------------------------- */
      let normalized = null;

      if (docType === "w9") {
        normalized = normalizeW9(aiExtracted);
      } else if (docType === "license") {
        normalized = normalizeLicense(aiExtracted);
      } else if (docType === "contract") {
        normalized = normalizeContract(aiExtracted);
      } else {
        normalized = { raw: aiExtracted, doc_type: "other" };
      }

      /* ----------------------------------------------------------
         Store in vendor_documents table
      ---------------------------------------------------------- */
      const inserted = await sql`
        INSERT INTO vendor_documents (vendor_id, org_id, doc_type, filename, mimetype, storage_key, ai_json)
        VALUES (
          ${vendorId},
          ${orgId},
          ${docType},
          ${filename},
          ${mimetype},
          ${storageKey},
          ${JSON.stringify(normalized)}
        )
        RETURNING id;
      `;

      const documentId = inserted[0]?.id;

      /* ==========================================================
         🚀 NEW: AUTO-PROCESS CONTRACTS
         Calls:
           1. /api/admin/rules-v3/auto-process-contract
           2. auto-infers rules
           3. auto-creates rule group
           4. auto-runs rule engine v3
           5. auto-updates vendor alerts
      ========================================================== */
      if (docType === "contract") {
        try {
          await fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL}/api/admin/rules-v3/auto-process-contract`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ documentId }),
            }
          );
        } catch (autoErr) {
          console.error("[AUTO CONTRACT PROCESS FAILED]", autoErr);
          // Do not block response — upload still succeeds even if automation fails
        }
      }

      /* ----------------------------------------------------------
         FINAL RESPONSE
      ---------------------------------------------------------- */
      return res.status(200).json({
        ok: true,
        docId: documentId,
        docType,
        filename,
      });
    });
  } catch (err) {
    console.error("[upload-doc] ERROR", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Server error",
    });
  }
}
