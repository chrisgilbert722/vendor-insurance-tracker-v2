// pages/api/vendors/gvi.js
// Global Vendor Intelligence (GVI) — now with RENEWAL INTELLIGENCE V2

import { sql } from "../../../lib/db";

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

  let score = Math.round(base * factor);
  return Math.max(0, Math.min(score, 100));
}

/* ============================================================
   NEW: RENEWAL STAGE CALCULATOR
============================================================ */
function computeRenewalStage(daysLeft) {
  if (daysLeft === null) return null;
  if (daysLeft < 0) return 0;
  if (daysLeft <= 1) return 1;
  if (daysLeft <= 3) return 3;
  if (daysLeft <= 7) return 7;
  if (daysLeft <= 30) return 30;
  if (daysLeft <= 90) return 90;
  return 999; // >90 days
}

/* ============================================================
   NEW: RENEWAL STAGE LABEL
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
   NEW: AI RENEWAL URGENCY SCORE
============================================================ */
function computeRenewalUrgencyScore(daysLeft) {
  if (daysLeft === null) return 50;     // unknown = medium concern
  if (daysLeft < 0) return 100;         // expired = max
  if (daysLeft <= 1) return 95;
  if (daysLeft <= 3) return 90;
  if (daysLeft <= 7) return 80;
  if (daysLeft <= 30) return 65;
  if (daysLeft <= 90) return 45;
  return 20; // >90 days = low urgency
}

/* ============================================================
   NEW: Suggested Next Action (used by Copilot & dashboard)
============================================================ */
function computeNextRenewalAction(stage) {
  switch (stage) {
    case 0: return "Vendor out of compliance — escalate immediately.";
    case 1: return "Expires tomorrow — contact broker today.";
    case 3: return "Critical 3-day window — follow up strongly.";
    case 7: return "7-day window — remind vendor + check with broker.";
    case 30: return "30-day window — request renewed COI.";
    case 90: return "90-day window — send early renewal notice.";
    case 999: return "No action needed yet.";
    default: return "No renewal data.";
  }
}

/* ============================================================
   MAIN HANDLER
============================================================ */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res
      .status(405)
      .json({ ok: false, error: "Use GET." });
  }

  try {
    const orgId = Number(req.query.orgId || 0);
    if (!orgId) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing orgId." });
    }

    /* -------------------------------------------
       1) Vendors
    ------------------------------------------- */
    const vendors = await sql`
      SELECT id, name, org_id
      FROM vendors
      WHERE org_id = ${orgId}
      ORDER BY name ASC;
    `;

    if (!vendors.length) {
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
    complianceRows.forEach((r) => (complianceMap[r.vendor_id] = r));

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
    alertRows.forEach((r) => (alertMap[r.vendor_id] = Number(r.count || 0)));

    /* -------------------------------------------
       4) Primary Policies (for renewal)
    ------------------------------------------- */
    const policyRows = await sql`
      SELECT p.vendor_id, p.coverage_type, p.expiration_date
      FROM policies p
      WHERE p.org_id = ${orgId}
        AND p.vendor_id = ANY(${vendorIds});
    `;
    const policyMap = {};
    for (const p of policyRows) {
      if (!policyMap[p.vendor_id]) policyMap[p.vendor_id] = p;
      else {
        const existing = policyMap[p.vendor_id];
        if (
          existing.expiration_date &&
          p.expiration_date &&
          new Date(p.expiration_date) < new Date(existing.expiration_date)
        ) {
          policyMap[p.vendor_id] = p;
        }
      }
    }

    /* -------------------------------------------
       5) BUILD GVI OBJECT PER VENDOR
    ------------------------------------------- */
    const now = new Date();

    const rowsOut = vendors.map((v) => {
      const comp = complianceMap[v.id] || {};
      const failing = comp.failing || [];
      const passing = comp.passing || [];
      const missing = comp.missing || [];

      const totalRules = failing.length + passing.length + missing.length;
      const fixedRules = passing.length;
      const remainingRules = failing.length + missing.length;

      let expDays = null;
      let expDate = null;
      let primaryCoverage = null;

      const primary = policyMap[v.id];
      if (primary && primary.expiration_date) {
        const d = new Date(primary.expiration_date);
        expDays = Math.floor((d - now) / 86400000);
        expDate = primary.expiration_date;
        primaryCoverage = primary.coverage_type;
      }

      const status = comp.status || "unknown";
      const summary = comp.summary || "No compliance evaluation yet.";
      const alertsCount = alertMap[v.id] || 0;

      const aiScore = computeAiScore(
        expDays,
        status,
        failing.length,
        missing.length
      );

      /* -------------------------------------------
         NEW: Renewal Intelligence Object
      ------------------------------------------- */
      const renewalStage = computeRenewalStage(expDays);
      const renewalUrgency = computeRenewalUrgencyScore(expDays);
      const nextAction = computeNextRenewalAction(renewalStage);

      return {
        id: v.id,
        name: v.name,
        org_id: v.org_id,

        /* Compliance block (unchanged) */
        compliance: {
          status,
          summary,
          totalRules,
          fixedRules,
          remainingRules,
        },

        alertsCount,
        aiScore,

        /* Primary Policy Info */
        primaryPolicy: {
          coverage_type: primaryCoverage,
          expiration_date: expDate,
          daysLeft: expDays,
        },

        /* NEW: Renewal Intelligence */
        renewal: {
          stage: renewalStage,
          stage_label: stageLabel(renewalStage),
          daysLeft: expDays,
          urgency_score: renewalUrgency,
          next_action: nextAction,
        },
      };
    });

    return res.status(200).json({ ok: true, vendors: rowsOut });
  } catch (err) {
    console.error("[vendors/gvi] ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
