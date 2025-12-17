// pages/api/vendors/gvi.js
// Global Vendor Intelligence (GVI) — now with RENEWAL INTELLIGENCE V2 + CONTRACT INTELLIGENCE V3

import { sql } from "../../../lib/db";
import { requireOrgId } from "../../../lib/requireOrg";

/* ============================================================
   AI SCORE (existing logic)
============================================================ */
function computeAiScore(expDays, status, failingCount, missingCount) {
  let base = 95;
  if (expDays === null) base = 70;
  else if (expDays < 0) base = 20;
  else if (expDays <= 30) base = 40;
  else if (expDays <= 90) base = 70;

  let factor = 1.0;
  if (status === "fail") factor = 0.4;
  else if (status === "warn") factor = 0.7;

  if (failingCount > 0) factor *= 0.6;
  else if (missingCount > 0) factor *= 0.8;

  const score = Math.round(base * factor);
  return Math.max(0, Math.min(score, 100));
}

/* ============================================================
   RENEWAL STAGE CALCULATOR
============================================================ */
function computeRenewalStage(daysLeft) {
  if (daysLeft === null) return null;
  if (daysLeft < 0) return 0;
  if (daysLeft <= 1) return 1;
  if (daysLeft <= 3) return 3;
  if (daysLeft <= 7) return 7;
  if (daysLeft <= 30) return 30;
  if (daysLeft <= 90) return 90;
  return 999;
}

/* ============================================================
   STAGE LABEL
============================================================ */
function stageLabel(stage) {
  if (stage === null) return "Unknown";
  if (stage === 0) return "Expired";
  if (stage === 1) return "1 Day Left";
  if (stage === 3) return "3 Days Left (Critical)";
  if (stage === 7) return "7 Days Left";
  if (stage === 30) return "30-Day Window";
  if (stage === 90) return "90-Day Window";
  if (stage === 999) return "> 90 Days";
  return "Unknown";
}

/* ============================================================
   AI RENEWAL URGENCY SCORE
============================================================ */
function computeRenewalUrgencyScore(daysLeft) {
  if (daysLeft === null) return 50;
  if (daysLeft < 0) return 100;
  if (daysLeft <= 1) return 95;
  if (daysLeft <= 3) return 90;
  if (daysLeft <= 7) return 80;
  if (daysLeft <= 30) return 65;
  if (daysLeft <= 90) return 45;
  return 20;
}

/* ============================================================
   NEXT ACTION
============================================================ */
function computeNextRenewalAction(stage) {
  switch (stage) {
    case 0:
      return "Vendor out of compliance — escalate immediately.";
    case 1:
      return "Expires tomorrow — contact broker today.";
    case 3:
      return "Critical 3-day window — follow up strongly.";
    case 7:
      return "7-day window — remind vendor + check with broker.";
    case 30:
      return "30-day window — request renewed COI.";
    case 90:
      return "90-day window — send early renewal notice.";
    case 999:
      return "No action needed yet.";
    default:
      return "No renewal data.";
  }
}

/* ============================================================
   MAIN HANDLER
============================================================ */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Use GET." });
  }

  try {
    // 🔒 Canonical org guard (UUID only)
    const orgId = requireOrgId(req, res);
    if (!orgId) return;

    /* -------------------------------------------
       1) Vendors
    ------------------------------------------- */
    const vendors = await sql`
      SELECT
        id,
        name,
        org_id,
        contract_status,
        contract_risk_score,
        contract_issues_json
      FROM vendors
      WHERE org_id = ${orgId}
      ORDER BY name ASC;
    `;

    if (!vendors || vendors.length === 0) {
      return res.status(200).json({ ok: true, vendors: [] });
    }

    const vendorIds = vendors.map((v) => v.id);

    /* -------------------------------------------
       2) Compliance Cache
    ------------------------------------------- */
    const complianceRows = await sql`
      SELECT vendor_id, failing, passing, missing, status, summary
      FROM vendor_compliance_cache
      WHERE org_id = ${orgId}
        AND vendor_id = ANY(${vendorIds});
    `;

    const complianceMap = {};
    for (const r of complianceRows || []) {
      complianceMap[r.vendor_id] = r;
    }

    /* -------------------------------------------
       3) Alerts Count
    ------------------------------------------- */
    const alertRows = await sql`
      SELECT vendor_id, COUNT(*) AS count
      FROM alerts_v2
      WHERE org_id = ${orgId}
        AND vendor_id = ANY(${vendorIds})
      GROUP BY vendor_id;
    `;

    const alertMap = {};
    for (const r of alertRows || []) {
      alertMap[r.vendor_id] = Number(r.count || 0);
    }

    /* -------------------------------------------
       4) Primary Policies
    ------------------------------------------- */
    const policyRows = await sql`
      SELECT vendor_id, coverage_type, expiration_date
      FROM policies
      WHERE org_id = ${orgId}
        AND vendor_id = ANY(${vendorIds});
    `;

    const policyMap = {};
    for (const p of policyRows || []) {
      if (!policyMap[p.vendor_id]) policyMap[p.vendor_id] = p;
      else if (
        p.expiration_date &&
        policyMap[p.vendor_id].expiration_date &&
        new Date(p.expiration_date) <
          new Date(policyMap[p.vendor_id].expiration_date)
      ) {
        policyMap[p.vendor_id] = p;
      }
    }

    /* -------------------------------------------
       5) Build GVI rows
    ------------------------------------------- */
    const now = new Date();

    const rowsOut = vendors.map((v) => {
      const comp = complianceMap[v.id] || {};
      const failing = Array.isArray(comp.failing) ? comp.failing : [];
      const passing = Array.isArray(comp.passing) ? comp.passing : [];
      const missing = Array.isArray(comp.missing) ? comp.missing : [];

      const primary = policyMap[v.id];
      let expDays = null;
      let expDate = null;
      let primaryCoverage = null;

      if (primary && primary.expiration_date) {
        const d = new Date(primary.expiration_date);
        expDays = Math.floor((d - now) / 86400000);
        expDate = primary.expiration_date;
        primaryCoverage = primary.coverage_type;
      }

      const aiScore = computeAiScore(
        expDays,
        comp.status || "unknown",
        failing.length,
        missing.length
      );

      const renewalStage = computeRenewalStage(expDays);

      const rawIssues = Array.isArray(v.contract_issues_json)
        ? v.contract_issues_json
        : [];

      return {
        id: v.id,
        name: v.name,
        org_id: v.org_id,

        compliance: {
          status: comp.status || "unknown",
          summary: comp.summary || "No compliance evaluation yet.",
          totalRules: failing.length + passing.length + missing.length,
          fixedRules: passing.length,
          remainingRules: failing.length + missing.length,
        },

        alertsCount: alertMap[v.id] || 0,
        aiScore,

        primaryPolicy: {
          coverage_type: primaryCoverage,
          expiration_date: expDate,
          daysLeft: expDays,
        },

        renewal: {
          stage: renewalStage,
          stage_label: stageLabel(renewalStage),
          daysLeft: expDays,
          urgency_score: computeRenewalUrgencyScore(expDays),
          next_action: computeNextRenewalAction(renewalStage),
        },

        contractStatus: v.contract_status || "missing",
        contractRiskScore:
          v.contract_risk_score !== null
            ? Number(v.contract_risk_score)
            : null,
        contractIssuesCount: rawIssues.length,
      };
    });

    return res.status(200).json({ ok: true, vendors: rowsOut });
  } catch (err) {
    console.error("[vendors/gvi]", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
