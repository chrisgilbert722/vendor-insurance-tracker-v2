// pages/api/vendors/import-cois.js
// GOD MODE — AI COI Ingestion + Vendor Creation + Policy Creation (V1)

import formidable from "formidable";
import fs from "fs";
import { sql } from "../../../lib/db";
import { openai } from "../../../lib/openaiClient";

export const config = {
  api: {
    bodyParser: false, // ⛔ Needed for file upload
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    // Parse uploaded PDFs
    const form = formidable({});
    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) =>
        err ? reject(err) : resolve({ fields, files })
      );
    });

    const orgId = fields.orgId?.toString();
    if (!orgId) {
      return res.status(400).json({ ok: false, error: "Missing orgId" });
    }

    const uploads = Array.isArray(files?.cois)
      ? files.cois
      : files?.cois
      ? [files.cois]
      : [];

    if (uploads.length === 0) {
      return res.status(400).json({ ok: false, error: "No COI files uploaded" });
    }

    const results = [];
    let createdVendors = 0;
    let createdPolicies = 0;

    // Process each COI file
    for (const file of uploads) {
      const pdfBuffer = fs.readFileSync(file.filepath);

      // 🔥 AI EXTRACTOR PROMPT
      const prompt = `
You are an insurance certificate extraction AI.
Read this COI PDF and return JSON with:

{
  "vendor_name": "",
  "policy_number": "",
  "carrier": "",
  "coverage_type": "",
  "expiration_date": "",
  "limits": {
    "general_liability": "",
    "auto": "",
    "work_comp": "",
    "umbrella": ""
  }
}
`;

      // 🔥 CALL OPENAI VISION
      const completion = await openai.chat.completions.create({
        model: "gpt-4.1",
        max_tokens: 800,
        messages: [
          { role: "system", content: "You extract COI data with accuracy only." },
          {
            role: "user",
            content: prompt,
          },
        ],
        file: [{ name: file.originalFilename, buffer: pdfBuffer }],
      });

      const textResult = completion.choices[0].message.content;
      let json;
      try {
        json = JSON.parse(textResult);
      } catch (err) {
        results.push({
          file: file.originalFilename,
          status: "error",
          error: "AI failed to return valid JSON",
          raw: textResult,
        });
        continue;
      }

      const vendorName = (json.vendor_name || "").trim();
      if (!vendorName) {
        results.push({
          file: file.originalFilename,
          status: "error",
          error: "Missing vendor_name in extracted COI",
          extracted: json,
        });
        continue;
      }

      // Check if vendor already exists
      const exists = await sql`
        SELECT id FROM vendors WHERE org_id = ${orgId} AND name = ${vendorName}
      `;

      let vendorId;
      if (exists.length > 0) {
        vendorId = exists[0].id;
      } else {
        const insertedVendor = await sql`
          INSERT INTO vendors (org_id, name)
          VALUES (${orgId}, ${vendorName})
          RETURNING id
        `;
        vendorId = insertedVendor[0].id;
        createdVendors++;
      }

      // Insert policy
      const p = json;
      const insertedPolicy = await sql`
        INSERT INTO policies (
          vendor_id,
          policy_number,
          carrier,
          coverage_type,
          expiration_date,
          limit_each_occurrence,
          auto_limit,
          work_comp_limit,
          umbrella_limit
        )
        VALUES (
          ${vendorId},
          ${p.policy_number || null},
          ${p.carrier || null},
          ${p.coverage_type || null},
          ${p.expiration_date || null},
          ${p.limits?.general_liability || null},
          ${p.limits?.auto || null},
          ${p.limits?.work_comp || null},
          ${p.limits?.umbrella || null}
        )
        RETURNING id
      `;

      createdPolicies++;

      results.push({
        file: file.originalFilename,
        status: "success",
        vendorName,
        vendorId,
        policyId: insertedPolicy[0].id,
        extracted: json,
      });
    }

    return res.status(200).json({
      ok: true,
      importedVendors: createdVendors,
      importedPolicies: createdPolicies,
      results,
      message: `Processed ${uploads.length} COIs. Created ${createdVendors} vendors and ${createdPolicies} policies.`,
    });
  } catch (err) {
    console.error("[COI IMPORT ERROR]", err);
    return res.status(500).json({
      ok: false,
      error: "COI import failed",
      details: err.message,
    });
  }
}
