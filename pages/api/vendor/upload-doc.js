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

// Disable Next's default body parser for file upload
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

      // Basic file info
      const filepath = file.filepath || file.path;
      const filename = file.originalFilename || file.name;
      const mimetype = file.mimetype || file.type || "application/octet-stream";

      // TODO: You can pass this file to your AI extraction pipeline
      // For now, we pretend we got "ai" JSON from somewhere.
      const aiExtracted = {}; // placeholder (hook real AI later)

      // Light text sampling placeholder
      const textSample = ""; // future: read a few KB & send to AI or lexical hints

      // Classify doc
      let docType = docTypeHint || classifyDocument({ filename, mimetype, textSample });

      // COIs should still be handled by /upload-coi, but we guard against mis-routes
      if (docType === "coi") {
        return res.status(400).json({
          ok: false,
          error: "COI detected — use /api/vendor/upload-coi instead.",
        });
      }

      // Upload raw file to Supabase Storage (if you're using it)
      let storageKey = null;
      if (filepath) {
        const fileBuffer = fs.readFileSync(filepath);
        const bucket = "vendor-docs"; // make sure this bucket exists in Supabase

        const uploadPath = `${vendorId}/${Date.now()}-${filename}`;

        const { error: uploadErr } = await supabase.storage
          .from(bucket)
          .upload(uploadPath, fileBuffer, {
            contentType: mimetype,
            upsert: false,
          });

        if (uploadErr) {
          console.error("[upload-doc] supabase upload error", uploadErr);
          // Not fatal if you want to continue, but we bail for safety.
          return res.status(500).json({
            ok: false,
            error: "Failed to store document.",
          });
        }

        storageKey = `${bucket}/${uploadPath}`;
      }

      // Normalize based on docType
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

      // Store metadata + normalized AI JSON in Neon
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

      // TODO: In future we can trigger specialized rule engines here:
      // - W9 rule group
      // - License expiration checks
      // - Contract → rule inference

      return res.status(200).json({
        ok: true,
        docId: inserted[0]?.id,
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
