// pages/api/upload-coi.js

export const config = {
  api: { bodyParser: false }
};

import formidable from "formidable";
import fs from "fs";
import pdfParse from "pdf-parse";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { sql } from "../../lib/db"; // Neon client

/* ===========================
   SUPABASE SERVER CLIENT
=========================== */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn(
    "[upload-coi] Supabase env vars missing. File storage will be skipped."
  );
}

const supabase =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey)
    : null;

/* ===========================
   HELPERS
=========================== */

function parseExpiration(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    const [mm, dd, yyyy] = parts;
    if (mm && dd && yyyy) return `${mm}/${dd}/${yyyy}`;
  }
  return dateStr;
}

async function parseForm(req) {
  const form = formidable({ multiples: false });
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}

/* ===========================
   MAIN HANDLER
=========================== */

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { fields, files } = await parseForm(req);
    const uploaded = files.file?.[0] || files.file;

    const vendorIdParam =
      fields.vendorId?.[0] ||
      fields.vendor_id?.[0] ||
      req.query.vendor ||
      req.query.vendorId;

    const vendorId = parseInt(vendorIdParam, 10);

    if (!uploaded || Number.isNaN(vendorId)) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing file or vendor id." });
    }

    /* ===========================
       GET VENDOR (Neon)
=========================== */

    const vendorRows = await sql`
      SELECT id, name, org_id
      FROM public.vendors
      WHERE id = ${vendorId};
    `;

    if (vendorRows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: "Vendor not found for this upload link."
      });
    }

    const vendor = vendorRows[0];

    /* ===========================
       READ PDF
=========================== */

    const buffer = fs.readFileSync(uploaded.filepath);
    const pdfData = await pdfParse(buffer);

    if (!pdfData.text || !pdfData.text.trim()) {
      throw new Error("Uploaded PDF has no readable text.");
    }

    const text = pdfData.text.slice(0, 20000);

    /* ===========================
       SUPABASE STORAGE
=========================== */

    let fileUrl = null;
    if (supabase) {
      const originalName =
        uploaded.originalFilename ||
        uploaded.newFilename ||
        uploaded.filepath.split("/").pop() ||
        "coi.pdf";

      const safeName = originalName.replace(/[^a-zA-Z0-9.\-_]/g, "_");

      const storagePath = `orgs/${vendor.org_id || "no-org"}/vendors/${
        vendor.id
      }/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("coi-files")
        .upload(storagePath, buffer, {
          contentType: "application/pdf",
          upsert: false
        });

      if (uploadError) {
        console.error("[upload-coi] Supabase upload error:", uploadError);
        throw new Error("Supabase upload failed");
      }

      const { data: publicUrlData } = supabase.storage
        .from("coi-files")
        .getPublicUrl(storagePath);

      fileUrl = publicUrlData?.publicUrl || null;
    }

    /* ===========================
       AI EXTRACTION
=========================== */

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const prompt = `
Extract the following JSON ONLY:

{
  "carrier": string|null,
  "policy_number": string|null,
  "coverage_type": string|null,
  "effective_date": string|null,
  "expiration_date": string|null
}

COI TEXT:
${text}
    `.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0,
      messages: [
        { role: "system", content: "You return valid strict JSON only." },
        { role: "user", content: prompt }
      ]
    });

    let raw = completion.choices[0]?.message?.content || "";
    raw = raw.trim();

    const first = raw.indexOf("{");
    const last = raw.lastIndexOf("}");
    if (first === -1 || last === -1)
      throw new Error("AI did not return JSON.");

    const parsed = JSON.parse(raw.slice(first, last + 1));

    const carrier = parsed.carrier ?? null;
    const policyNumber = parsed.policy_number ?? null;
    const coverageType = parsed.coverage_type ?? null;
    const effectiveDate = parsed.effective_date
      ? parseExpiration(parsed.effective_date)
      : null;
    const expirationDate = parsed.expiration_date
      ? parseExpiration(parsed.expiration_date)
      : null;

    /* ===========================
       INSERT POLICY (Neon)
=========================== */

    const policyRows = await sql`
      INSERT INTO public.policies (
        vendor_id,
        vendor_name,
        org_id,
        policy_number,
        carrier,
        effective_date,
        expiration_date,
        coverage_type,
        status
      )
      VALUES (
        ${vendor.id},
        ${vendor.name},
        ${vendor.org_id || null},
        ${policyNumber},
        ${carrier},
        ${effectiveDate},
        ${expirationDate},
        ${coverageType},
        'active'
      )
      RETURNING id;
    `;

    const policyId = policyRows[0].id;

    /* ===========================
       INSERT DOCUMENT RECORD
=========================== */

    if (fileUrl) {
      await sql`
        INSERT INTO public.documents (
          vendor_id,
          org_id,
          document_type,
          file_url,
          raw_text,
          ai_json,
          status
        )
        VALUES (
          ${vendor.id},
          ${vendor.org_id || null},
          'COI',
          ${fileUrl},
          ${text},
          ${parsed},
          'processed'
        );
      `;
    }

    /* ===========================
       BUILD ENTERPRISE ALERTS
=========================== */

    const alertsToInsert = [];

    // Helper: compute days to expire if expirationDate exists
    let daysToExpire = null;
    if (expirationDate) {
      const [mm, dd, yyyy] = expirationDate.split("/");
      const expDate = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
      const now = new Date();
      const diffMs = expDate.getTime() - now.getTime();
      daysToExpire = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (daysToExpire < 0) {
        alertsToInsert.push({
          type: "Document",
          severity: "Critical",
          title: "Primary COI expired",
          message: `Primary certificate for ${vendor.name} expired ${
            Math.abs(daysToExpire) || 0
          } days ago.`,
          rule_label: "Expired / Missing Insurance",
        });
      } else if (daysToExpire <= 30) {
        alertsToInsert.push({
          type: "Document",
          severity: "High",
          title: "COI expiring within 30 days",
          message: `COI for ${vendor.name} expires in ${daysToExpire} days.`,
          rule_label: "COI Expiring Soon",
        });
      } else if (daysToExpire <= 90) {
        alertsToInsert.push({
          type: "Document",
          severity: "Medium",
          title: "COI expiring within 90 days",
          message: `COI for ${vendor.name} expires in ${daysToExpire} days.`,
          rule_label: "COI Expiring Within Quarter",
        });
      }
    }

    // Missing core policy details
    if (!carrier || !policyNumber) {
      alertsToInsert.push({
        type: "Coverage",
        severity: "High",
        title: "Missing core policy details",
        message: `Carrier or policy number is missing in the extracted COI for ${vendor.name}.`,
        rule_label: "Missing Policy Metadata",
      });
    }

    if (!coverageType) {
      alertsToInsert.push({
        type: "Coverage",
        severity: "Medium",
        title: "Coverage type not detected",
        message: `Coverage type could not be clearly detected in the COI for ${vendor.name}.`,
        rule_label: "Coverage Type Unknown",
      });
    }

    if (!effectiveDate || !expirationDate) {
      alertsToInsert.push({
        type: "Document",
        severity: "Medium",
        title: "Missing policy dates",
        message: `Effective or expiration date is missing for the COI tied to ${vendor.name}.`,
        rule_label: "Missing Policy Dates",
      });
    }

    // Example "enterprise" rule: if coverage_type is not GL-like, flag it
    if (
      coverageType &&
      !/general liability|gl|commercial general liability/i.test(coverageType)
    ) {
      alertsToInsert.push({
        type: "Coverage",
        severity: "High",
        title: "Coverage type may not meet GL requirement",
        message: `Coverage type "${coverageType}" may not satisfy General Liability requirement for ${vendor.name}.`,
        rule_label: "Coverage Type Mismatch",
      });
    }

    // Shared extracted payload for the alerts viewer
    const baseExtracted = {
      vendor_id: vendor.id,
      vendor_name: vendor.name,
      policy_id: policyId,
      policy_number: policyNumber,
      carrier,
      coverage_type: coverageType,
      effective_date: effectiveDate,
      expiration_date: expirationDate,
      days_to_expire: daysToExpire,
    };

    // Insert all alerts into public.alerts
    for (const alert of alertsToInsert) {
      await sql`
        INSERT INTO public.alerts (
          created_at,
          is_read,
          org_id,
          vendor_id,
          type,
          message,
          severity,
          title,
          rule_label,
          file_url,
          policy_id,
          status,
          extracted
        )
        VALUES (
          NOW(),
          false,
          ${vendor.org_id || null},
          ${vendor.id},
          ${alert.type},
          ${alert.message},
          ${alert.severity},
          ${alert.title},
          ${alert.rule_label},
          ${fileUrl},
          ${policyId},
          'Open',
          ${baseExtracted}
        );
      `;
    }

    /* ===========================
       RETURN CLEAN RESPONSE
=========================== */

    return res.status(200).json({
      ok: true,
      policyId,
      vendor: {
        id: vendor.id,
        name: vendor.name
      },
      fileUrl,
      extracted: {
        carrier,
        policy_number: policyNumber,
        coverage_type: coverageType,
        effective_date: effectiveDate,
        expiration_date: expirationDate
      }
    });
  } catch (err) {
    console.error("[upload-coi ERROR]", err);
    return res.status(500).json({
      ok: false,
      error: err.message
    });
  }
}
