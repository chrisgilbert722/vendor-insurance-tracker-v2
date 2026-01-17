// pages/api/contracts/apply-matching.js
// ============================================================
// CONTRACT MATCHING ENGINE V3 — WITH SEVERITY + RECOMMENDED FIX
//
// Triggered when:
//   • A contract is uploaded (/api/vendor/upload-doc.js)
//   • Admin manually re-runs matching from the Contract Review UI
//
// Does:
// 1. Load vendor + contract normalized JSON
// 2. Extract key coverage requirements from contract
// 3. Compare contract requirements → vendor policies
// 4. Generate mismatch objects:
//      { label, message, severity, recommended_fix }
// 5. Compute contract risk score
// 6. Write results to vendors table
// 7. Create V5 alerts for each mismatch
// ============================================================

import { sql } from "../../../lib/db";
import { openai } from "../../../lib/openaiClient";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "POST only" });
    }

    const { vendorId } = req.body || {};
    if (!vendorId) {
      return res.status(400).json({ ok: false, error: "Missing vendorId" });
    }

    // -----------------------------------------------------------
    // 1) LOAD VENDOR + CONTRACT DOCS
    // -----------------------------------------------------------
    const vendorRows = await sql`
      SELECT id, name AS vendor_name, org_id
      FROM vendors
      WHERE id = ${vendorId}
      LIMIT 1;
    `;
    if (!vendorRows.length) {
      return res.status(404).json({ ok: false, error: "Vendor not found" });
    }

    const vendor = vendorRows[0];

    // Load newest contract from vendor_documents
    const contractRows = await sql`
      SELECT id, ai_json
      FROM vendor_documents
      WHERE vendor_id = ${vendorId}
        AND document_type = 'contract'
      ORDER BY uploaded_at DESC
      LIMIT 1;
    `;

    if (!contractRows.length) {
      return res.status(400).json({
        ok: false,
        error: "No contract document found for vendor.",
      });
    }

    const contract = contractRows[0];
    const normalized = contract.ai_json?.normalized?.contract || {};

    // -----------------------------------------------------------
    // 2) Load vendor policies for comparison
    // -----------------------------------------------------------
    const policyRows = await sql`
      SELECT coverage_type, limit_each_occurrence, auto_limit, work_comp_limit, umbrella_limit, expiration_date
      FROM policies
      WHERE vendor_id = ${vendorId} AND org_id = ${vendor.org_id};
    `;

    const policies = policyRows || [];

    // Helper: get first policy of type
    function findPolicy(type) {
      return policies.find(p =>
        (p.coverage_type || "").toLowerCase() === type.toLowerCase()
      );
    }

    // -----------------------------------------------------------
    // 3) Build CONTRACT REQUIREMENTS (from normalized contract parser)
    // -----------------------------------------------------------
    const required = {
      gl: normalized.coverage_minimums?.general_liability || null,
      auto: normalized.coverage_minimums?.auto || null,
      wc: normalized.coverage_minimums?.workers_comp || null,
      umbrella: normalized.coverage_minimums?.umbrella || null,
    };

    // -----------------------------------------------------------
    // 4) Compare → build mismatches
    // each mismatch: { label, message, severity, recommended_fix }
    // -----------------------------------------------------------
    const mismatches = [];

    function addMismatch(label, message, severity, fix) {
      mismatches.push({
        label,
        message,
        severity,
        recommended_fix: fix,
      });
    }

    // --- General Liability ---
    if (required.gl) {
      const policy = findPolicy("GL");
      const requiredLimit = Number(required.gl) || 0;

      if (!policy) {
        addMismatch(
          "General Liability",
          "Vendor does not have a General Liability policy on file.",
          "high",
          "Request a current GL policy meeting the minimum limits specified in the contract."
        );
      } else if (policy.limit_each_occurrence < requiredLimit) {
        addMismatch(
          "General Liability",
          `GL limit is ${policy.limit_each_occurrence}, but contract requires ${requiredLimit}.`,
          "high",
          `Ask the vendor/broker to provide a revised GL policy showing at least ${requiredLimit} in Each Occurrence coverage.`
        );
      }
    }

    // --- Auto Liability ---
    if (required.auto) {
      const policy = findPolicy("Auto");
      const requiredLimit = Number(required.auto) || 0;

      if (!policy) {
        addMismatch(
          "Auto Liability",
          "Vendor does not have an Auto Liability policy on file.",
          "medium",
          "Request an updated Auto Liability certificate that meets the contract limits."
        );
      } else if ((policy.auto_limit || 0) < requiredLimit) {
        addMismatch(
          "Auto Liability",
          `Auto limit is ${policy.auto_limit}, but contract requires ${requiredLimit}.`,
          "medium",
          `Broker must update Auto Liability coverage to at least ${requiredLimit}. Request revised COI.`
        );
      }
    }

    // --- Workers Comp ---
    if (required.wc) {
      const policy = findPolicy("WC");

      if (!policy) {
        addMismatch(
          "Workers Compensation",
          "Workers Compensation evidence is missing.",
          "medium",
          "Request a Workers Compensation certificate showing statutory limits and employer liability coverage."
        );
      }
    }

    // --- Umbrella ---
    if (required.umbrella) {
      const policy = findPolicy("Umbrella");
      const requiredLimit = Number(required.umbrella) || 0;

      if (!policy) {
        addMismatch(
          "Umbrella / Excess Liability",
          "Umbrella policy not found.",
          "medium",
          "Request an Umbrella policy meeting the minimum limit specified in the contract."
        );
      } else if ((policy.umbrella_limit || 0) < requiredLimit) {
        addMismatch(
          "Umbrella / Excess Liability",
          `Umbrella limit is ${policy.umbrella_limit}, but contract requires ${requiredLimit}.`,
          "high",
          `Request a revised Umbrella certificate showing at least ${requiredLimit} in coverage.`
        );
      }
    }

    // -----------------------------------------------------------
    // 5) AI-ENHANCE each mismatch with professional recommended_fix
    // -----------------------------------------------------------
    try {
      const prompt = `
You are a compliance assistant improving contract insurance mismatch explanations.

For each mismatch below, rewrite the "recommended_fix" into a short professional directive (max 25 words) that can be sent to a broker:

${JSON.stringify(mismatches, null, 2)}

Return JSON array ONLY, matching this structure:

[
  {
    "label": "string",
    "recommended_fix": "string"
  }
]
`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        temperature: 0.1,
        messages: [
          { role: "system", content: "Return JSON only." },
          { role: "user", content: prompt },
        ],
      });

      const raw = completion.choices[0]?.message?.content || "[]";
      const first = raw.indexOf("[");
      const last = raw.lastIndexOf("]");
      const enhanced = JSON.parse(raw.slice(first, last + 1));

      // Map back onto mismatches
      mismatches.forEach(m => {
        const ai = enhanced.find(e => e.label === m.label);
        if (ai?.recommended_fix) {
          m.recommended_fix = ai.recommended_fix;
        }
      });
    } catch (err) {
      console.error("[Contract Matching V3] AI enhancement failed:", err);
    }

    // -----------------------------------------------------------
    // 6) Compute Contract Score
    // -----------------------------------------------------------
    let contractScore = 100;
    for (const m of mismatches) {
      if (m.severity === "critical") contractScore -= 35;
      else if (m.severity === "high") contractScore -= 25;
      else if (m.severity === "medium") contractScore -= 15;
      else contractScore -= 5;
    }
    if (contractScore < 0) contractScore = 0;

    // -----------------------------------------------------------
    // 7) Save into vendors table
    // -----------------------------------------------------------
    await sql`
      UPDATE vendors
      SET
        contract_json = ${normalized}::jsonb,
        contract_score = ${contractScore},
        contract_issues_json = ${JSON.stringify(mismatches)}::jsonb,
        updated_at = NOW()
      WHERE id = ${vendorId};
    `;

    // -----------------------------------------------------------
    // 8) Write alerts for mismatches (V5 format)
    // -----------------------------------------------------------
    for (const m of mismatches) {
      await sql`
        INSERT INTO alerts (
          created_at,
          org_id,
          vendor_id,
          type,
          title,
          message,
          severity,
          status,
          extracted
        )
        VALUES (
          NOW(),
          ${vendor.org_id},
          ${vendorId},
          'contract_mismatch',
          ${m.label},
          ${m.message},
          ${m.severity},
          'open',
          ${JSON.stringify(m)}::jsonb
        );
      `;
    }

    // -----------------------------------------------------------
    // 9) Response
    // -----------------------------------------------------------
    return res.status(200).json({
      ok: true,
      vendorId,
      contractScore,
      mismatches,
    });

  } catch (err) {
    console.error("[apply-matching] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
}
