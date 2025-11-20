// pages/api/coi/upload.js
import formidable from "formidable";
import fs from "fs";
import pdfParse from "pdf-parse";
import { Client } from "pg";

export const config = {
  api: {
    bodyParser: false, // required for formidable
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const form = formidable({ multiples: false });

  try {
    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, flds, fls) => {
        if (err) reject(err);
        else resolve({ fields: flds, files: fls });
      });
    });

    // Expect vendorId + orgId in the form
    const vendorId = Number(fields.vendorId?.[0] || fields.vendorId);
    const orgId = Number(fields.orgId?.[0] || fields.orgId);

    if (!vendorId || Number.isNaN(vendorId)) {
      return res.status(400).json({ ok: false, error: "Missing vendorId" });
    }

    const file = files.file?.[0] || files.file;
    if (!file) {
      return res.status(400).json({ ok: false, error: "No file uploaded" });
    }

    // Read PDF buffer
    const buffer = fs.readFileSync(file.filepath);
    const pdfData = await pdfParse(buffer);

    // 🧠 Simple text extraction stub
    const text = pdfData.text || "";

    // TODO: improve these with better parsing / regex / model
    const extracted = extractFieldsFromCOI(text);

    // 🔌 Connect to Neon
    const connectionString =
      process.env.POSTGRES_URL_NON_POOLING ||
      process.env.POSTGRES_PRISMA_URL ||
      process.env.POSTGRES_URL ||
      process.env.DATABASE_URL;

    const client = new Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });

    await client.connect();

    // Insert or update policy for this vendor & coverage type
    const policyInsert = await client.query(
      `
      INSERT INTO policies (
        vendor_id,
        org_id,
        coverage_type,
        status,
        vendor_name,
        policy_number,
        carrier,
        effective_date,
        expiration_date
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *;
      `,
      [
        vendorId,
        orgId || null,
        extracted.coverage_type,
        "Active",
        extracted.vendor_name,
        extracted.policy_number,
        extracted.carrier,
        extracted.effective_date,
        extracted.expiration_date,
      ]
    );

    const policy = policyInsert.rows[0];

    // ✅ Run requirements engine for this vendor
    const checkRes = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/requirements/check?vendorId=${vendorId}&orgId=${orgId || ""}`
    );
    const check = await checkRes.json();

    // 🔐 Write to vendor_compliance_cache + alerts + risk_history
    await upsertComplianceCacheAndAlerts(client, {
      vendorId,
      orgId,
      evaluation: check,
    });

    await client.end();

    return res.status(200).json({
      ok: true,
      policy,
      evaluation: check,
    });
  } catch (err) {
    console.error("COI upload error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}

/**
 * SUPER SIMPLE extraction stub from COI text.
 * Replace / extend with better regex or an AI-powered parser later.
 */
function extractFieldsFromCOI(text) {
  // naive defaults
  let coverage_type = "General Liability";
  let vendor_name = "";
  let policy_number = "";
  let carrier = "";
  let effective_date = "";
  let expiration_date = "";

  // VERY rough regexes — you will tune these with your real COI PDFs
  const vendorMatch = text.match(/INSURED\s+([\s\S]*?)\n/);
  if (vendorMatch) vendor_name = vendorMatch[1].trim();

  const policyMatch = text.match(/POLICY NUMBER[:\s]+([A-Z0-9\-]+)/i);
  if (policyMatch) policy_number = policyMatch[1].trim();

  const carrierMatch = text.match(/INSURER [A-Z0-9]+\s+([A-Z0-9 &]+)/i);
  if (carrierMatch) carrier = carrierMatch[1].trim();

  const effExpMatch = text.match(
    /POLICY EFF\s*DATE\s*?\(MM\/DD\/YYYY\)\s*POLICY EXP\s*DATE\s*?\(MM\/DD\/YYYY\)[\s\S]*?(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})/i
  );
  if (effExpMatch) {
    effective_date = effExpMatch[1];
    expiration_date = effExpMatch[2];
  }

  return {
    coverage_type,
    vendor_name,
    policy_number,
    carrier,
    effective_date,
    expiration_date,
  };
}

/**
 * Write the evaluation into vendor_compliance_cache, alerts, risk_history.
 */
async function upsertComplianceCacheAndAlerts(client, { vendorId, orgId, evaluation }) {
  const now = new Date().toISOString();

  // 1) Upsert vendor_compliance_cache
  await client.query(
    `
    INSERT INTO vendor_compliance_cache (
      id, org_id, vendor_id, updated_at, last_checked_at,
      missing, failing, passing, summary, status
    )
    VALUES (
      gen_random_uuid(), $1, $2, $3, $3,
      $4::jsonb, $5::jsonb, $6::jsonb, $7, $8
    )
    ON CONFLICT (vendor_id) DO UPDATE
    SET
      org_id = EXCLUDED.org_id,
      updated_at = EXCLUDED.updated_at,
      last_checked_at = EXCLUDED.last_checked_at,
      missing = EXCLUDED.missing,
      failing = EXCLUDED.failing,
      passing = EXCLUDED.passing,
      summary = EXCLUDED.summary,
      status = EXCLUDED.status;
    `,
    [
      orgId || null,
      vendorId,
      now,
      JSON.stringify(evaluation.missing || []),
      JSON.stringify(evaluation.failing || []),
      JSON.stringify(evaluation.passing || []),
      evaluation.summary || "",
      evaluation.status || "ok",
    ]
  );

  // 2) Alerts for failing requirements
  if (evaluation.failing && evaluation.failing.length > 0) {
    for (const fail of evaluation.failing) {
      await client.query(
        `
        INSERT INTO alerts (
          id, created_at, is_read, org_id, vendor_id, type, message
        )
        VALUES (
          gen_random_uuid(), $1, FALSE, $2, $3, $4, $5
        );
        `,
        [
          now,
          orgId || null,
          vendorId,
          "requirement_failure",
          fail.detail || fail.requirement_text || "Requirement failed",
        ]
      );
    }
  }

  // 3) Risk history snapshot
  let riskScore = 100;
  riskScore -= (evaluation.failing?.length || 0) * 20;
  riskScore -= (evaluation.missing?.length || 0) * 10;
  if (riskScore < 0) riskScore = 0;

  await client.query(
    `
    INSERT INTO risk_history (
      id, created_at, vendor_id, org_id, risk_score, days_left, elite_status
    )
    VALUES (
      gen_random_uuid(), $1, $2, $3, $4, $5, $6
    );
    `,
    [
      now,
      vendorId,
      orgId || null,
      riskScore,
      0,
      riskScore >= 90 ? "Elite" : riskScore >= 70 ? "Preferred" : "Watch",
    ]
  );
}
