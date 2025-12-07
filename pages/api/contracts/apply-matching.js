// pages/api/contracts/apply-matching.js
// ============================================================
// CONTRACT MATCHING → ALERTS + VENDOR STATUS UPDATER
// Called after any contract upload or reprocessing.
// ============================================================

import { sql } from "../../../lib/db";
import { matchContractV3 } from "../../../lib/contracts/matchContractV3";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Invalid method" });
    }

    const { vendorId } = req.body;
    if (!vendorId) throw new Error("Missing vendorId");

    // ----------------------------------------
    // 1) LOAD VENDOR + REQUIREMENTS PROFILE
    // ----------------------------------------
    const vendorRows = await sql`
      SELECT id, org_id, requirements_json
      FROM vendors
      WHERE id = ${vendorId}
      LIMIT 1;
    `;
    if (!vendorRows.length) throw new Error("Vendor not found");

    const vendor = vendorRows[0];
    const requirementsProfile = vendor.requirements_json || null;

    // ----------------------------------------
    // 2) LOAD COVERAGE SNAPSHOT (from COI)
    // ----------------------------------------
    const coverageRows = await sql`
      SELECT ai_json
      FROM policies
      WHERE vendor_id = ${vendorId}
      ORDER BY created_at DESC
      LIMIT 1;
    `;
    const coverageSnapshot = coverageRows[0]?.ai_json?.normalized || {};

    // ----------------------------------------
    // 3) LOAD ENDORSEMENTS SNAPSHOT
    // ----------------------------------------
    const endorsementRows = await sql`
      SELECT ai_json
      FROM documents
      WHERE vendor_id = ${vendorId}
      AND (document_type = 'endorsement')
      ORDER BY created_at DESC;
    `;
    const endorsementsSnapshot = endorsementRows.map(r => r.ai_json?.normalized || {});

    // ----------------------------------------
    // 4) RUN CONTRACT MATCHING ENGINE
    // ----------------------------------------
    const result = matchContractV3({
      requirementsProfile,
      coverageSnapshot,
      endorsementsSnapshot
    });

    // ----------------------------------------
    // 5) WRITE CONTRACT STATUS TO VENDOR
    // ----------------------------------------
    await sql`
      UPDATE vendors
      SET contract_status = ${result.status},
          contract_risk_score = ${result.score},
          contract_issues_json = ${result.issues}
      WHERE id = ${vendorId}
    `;

    // ----------------------------------------
    // 6) GENERATE ALERTS FOR CONTRACT ISSUES
    // ----------------------------------------
    for (const issue of result.issues) {
      await sql`
        INSERT INTO alerts (
          created_at,
          is_read,
          vendor_id,
          org_id,
          type,
          severity,
          title,
          message,
          rule_label,
          status,
          extracted
        )
        VALUES (
          NOW(),
          false,
          ${vendorId},
          ${vendor.org_id},
          'Contract',
          ${issue.severity},
          ${issue.code},
          ${issue.message},
          'Contract Match',
          'Open',
          ${issue}
        );
      `;
    }

    return res.status(200).json({
      ok: true,
      vendorId,
      status: result.status,
      score: result.score,
      issues: result.issues
    });

  } catch (err) {
    console.error("[contract-matching ERROR]", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
