// pages/api/contracts/apply-matching.js
// ============================================================
// CONTRACT MATCHING V3 → Vendor Status + Alerts
//
// POST /api/contracts/apply-matching
// Body: { vendorId, orgId? }
//
// Does:
// 1) Load vendor + org + requirements_json (canonical requirements)
// 2) Build coverageSnapshot from policies (GL, Auto, Umbrella, WC)
// 3) (Optional) Build endorsementsSnapshot from vendor_documents
// 4) Run matchContractV3(requirementsProfile, coverageSnapshot, endorsements)
// 5) Update vendors.contract_status, contract_risk_score, contract_issues_json
// 6) Insert Contract alerts into alerts table
// 7) Insert timeline entry
// ============================================================

import { sql } from "../../../lib/db";
import { matchContractV3 } from "../../../lib/contracts/matchContractV3";

export const config = {
  api: {
    bodyParser: { sizeLimit: "1mb" },
  },
};

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res
        .status(405)
        .json({ ok: false, error: "Method not allowed. Use POST." });
    }

    const { vendorId: rawVendorId, orgId: rawOrgId } = req.body || {};

    const vendorId = Number(rawVendorId || 0);
    let orgId = rawOrgId ? Number(rawOrgId) : null;

    if (!vendorId || Number.isNaN(vendorId)) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing or invalid vendorId." });
    }

    // ---------------------------------------------------------
    // 1) Load Vendor (and resolve orgId)
    // ---------------------------------------------------------
    const vendorRows = await sql`
      SELECT
        id,
        org_id,
        requirements_json
      FROM vendors
      WHERE id = ${vendorId}
      LIMIT 1;
    `;

    if (!vendorRows.length) {
      return res
        .status(404)
        .json({ ok: false, error: "Vendor not found." });
    }

    const vendor = vendorRows[0];
    if (!orgId) orgId = vendor.org_id;

    if (!orgId) {
      return res
        .status(400)
        .json({ ok: false, error: "Vendor has no org_id (orgId required)." });
    }

    const requirementsProfile = vendor.requirements_json || null;

    // ---------------------------------------------------------
    // 2) Build coverageSnapshot from policies
    //    This is a normalized object used by matchContractV3
    // ---------------------------------------------------------
    const policyRows = await sql`
      SELECT
        coverage_type,
        limit_each_occurrence,
        gl_aggregate,
        auto_limit,
        umbrella_limit,
        expiration_date
      FROM policies
      WHERE vendor_id = ${vendorId}
        AND org_id = ${orgId};
    `;

    // Initialize empty coverage snapshot
    const coverageSnapshot = {
      GL: null,
      Auto: null,
      Umbrella: null,
      WC: null,
    };

    for (const p of policyRows) {
      const ct = (p.coverage_type || "").toLowerCase();

      if (ct.includes("general") || ct.includes("gl")) {
        coverageSnapshot.GL = {
          eachOccurrenceLimit: p.limit_each_occurrence || null,
          aggregateLimit: p.gl_aggregate || null,
          expiration_date: p.expiration_date || null,
        };
      } else if (ct.includes("auto")) {
        coverageSnapshot.Auto = {
          combinedSingleLimit: p.auto_limit || null,
          expiration_date: p.expiration_date || null,
        };
      } else if (ct.includes("umbrella") || ct.includes("excess")) {
        coverageSnapshot.Umbrella = {
          limit: p.umbrella_limit || null,
          expiration_date: p.expiration_date || null,
        };
      } else if (ct.includes("workers") || ct.includes("wc")) {
        coverageSnapshot.WC = {
          required: true,
          expiration_date: p.expiration_date || null,
        };
      }
    }

    // ---------------------------------------------------------
    // 3) Build endorsementsSnapshot from vendor_documents
    //    (We keep it minimal; match engine will interpret what it can)
    // ---------------------------------------------------------
    const endorsementDocs = await sql`
      SELECT ai_json
      FROM vendor_documents
      WHERE vendor_id = ${vendorId}
        AND org_id = ${orgId}
        AND document_type = 'endorsement';
    `;

    const endorsementsSnapshot = {
      endorsements: [],
    };

    for (const row of endorsementDocs) {
      const normalized = row.ai_json?.normalized || row.ai_json || null;
      if (!normalized) continue;

      // Collect some generic text for heuristic matching
      if (normalized.endorsement_type) {
        endorsementsSnapshot.endorsements.push(
          String(normalized.endorsement_type)
        );
      }
      if (normalized.notes) {
        endorsementsSnapshot.endorsements.push(String(normalized.notes));
      }
    }

    // ---------------------------------------------------------
    // 4) Run Contract Matching V3
    // ---------------------------------------------------------
    const matchResult = matchContractV3({
      requirementsProfile,
      coverageSnapshot,
      endorsementsSnapshot,
    });

    if (!matchResult.ok) {
      // We still update status as "missing" if no requirements
      await sql`
        UPDATE vendors
        SET contract_status = ${matchResult.status || "missing"},
            contract_risk_score = ${matchResult.score || 0},
            contract_issues_json = ${JSON.stringify(matchResult.issues || [])}
        WHERE id = ${vendorId}
      `;
      return res.status(200).json({
        ok: true,
        vendorId,
        orgId,
        warning: "Match engine reported non-ok. Status updated.",
        status: matchResult.status,
        score: matchResult.score,
        issues: matchResult.issues || [],
      });
    }

    const { status, score, issues } = matchResult;

    // ---------------------------------------------------------
    // 5) Update vendor contract_* fields
    // ---------------------------------------------------------
    await sql`
      UPDATE vendors
      SET
        contract_status = ${status},
        contract_risk_score = ${score},
        contract_issues_json = ${JSON.stringify(issues || [])}
      WHERE id = ${vendorId}
    `;

    // ---------------------------------------------------------
    // 6) Insert contract alerts (one per issue)
    // ---------------------------------------------------------
    try {
      for (const issue of issues || []) {
        const sev = (issue.severity || "high").toLowerCase();
        const title = issue.code || "Contract requirement not met";
        const message = issue.message || "Contract / coverage mismatch detected.";

        await sql`
          INSERT INTO alerts (
            created_at,
            is_read,
            vendor_id,
            org_id,
            type,
            severity,
            status,
            title,
            message,
            rule_label,
            extracted
          )
          VALUES (
            NOW(),
            FALSE,
            ${vendorId},
            ${orgId},
            'Contract',
            ${sev},
            'open',
            ${title},
            ${message},
            ${issue.code || "ContractMatch"},
            ${JSON.stringify(issue)}::jsonb
          );
        `;
      }
    } catch (alertErr) {
      console.error("[apply-matching] alert insert error:", alertErr);
      // non-fatal
    }

    // ---------------------------------------------------------
    // 7) Timeline entry
    // ---------------------------------------------------------
    try {
      await sql`
        INSERT INTO system_timeline (org_id, vendor_id, action, message, severity)
        VALUES (
          ${orgId},
          ${vendorId},
          'contract_matching_v3_run',
          ${`Contract Matching V3 complete — status: ${status}, score: ${score}`},
          ${status === "failed" ? "warning" : "info"}
        )
      `;
    } catch (timeErr) {
      console.error("[apply-matching] timeline insert error:", timeErr);
    }

    return res.status(200).json({
      ok: true,
      vendorId,
      orgId,
      status,
      score,
      issues: issues || [],
    });
  } catch (err) {
    console.error("[contracts/apply-matching] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Contract matching failed.",
    });
  }
}
