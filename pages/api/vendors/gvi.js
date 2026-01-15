// pages/api/vendors/gvi.js
// Global Vendor Intelligence (GVI) — NEON SAFE, NO sql.array

import { sql } from "../../lib/db";

/* ============================================================
   AI SCORE
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

  return Math.max(0, Math.min(Math.round(base * factor), 100));
}

/* ============================================================
   RENEWAL HELPERS
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

function stageLabel(stage) {
  if (stage === null) return "Unknown";
  if (stage === 0) return "Expired";
  if (stage === 1) return "1 Day Left";
  if (stage === 3) return "3 Days Left (Critical)";
  if (stage === 7) return "7 Days Left";
  if (stage === 30) return "30-Day Window";
  if (stage === 90) return "90-Day Window";
  return "> 90 Days";
}

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

function computeNextRenewalAction(stage) {
  switch (stage) {
    case 0:
      return "Vendor out of compliance — escalate immediately.";
    case 1:
      return "Expires tomorrow — contact broker today.";
    case 3:
      return "Critical 3-day window — follow up strongly.";
    case 7:
      return "7-day window — remind vendor + broker.";
    case 30:
      return "30-day window — request renewed COI.";
    case 90:
      return "90-day window — early renewal notice.";
    default:
      return "No action needed.";
  }
}

/* ============================================================
   MAIN HANDLER
============================================================ */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "GET only" });
  }

  try {
    const orgId = Number(req.query?.orgId);

    if (!Number.isInteger(orgId)) {
      return res.status(400).json({ ok: false, error: "Invalid orgId" });
    }

    /* -------------------------------------------
       Vendors
    ------------------------------------------- */
    const vendors = await sql`
      SELECT id, name, contract_status
      FROM vendors
      WHERE org_id = ${orgId}
      ORDER BY name ASC
    `;

    if (vendors.length === 0) {
      return res.status(200).json({ ok: true, vendors: [] });
    }

    const vendorIds = vendors.map((v) => v.id);

    /* -------------------------------------------
       Compliance Cache
    ------------------------------------------- */
    const complianceRows = await sql`
      SELECT vendor_id, failing, passing, missing, status
      FROM vendor_compliance_cache
      WHERE org_id = ${orgId}
        AND vendor_id IN (${sql.join(vendorIds)})
    `;

    const complianceMap = Object.fromEntries(
      complianceRows.map((r) => [r.vendor_id, r])
    );

    /* -------------------------------------------
       Alerts
    ------------------------------------------- */
    const alertRows = await sql`
      SELECT vendor_id, COUNT(*)::int AS count
      FROM alerts_v2
      WHERE org_id = ${orgId}
        AND vendor_id IN (${sql.join(vendorIds)})
      GROUP BY vendor_id
    `;

    const alertMap = Object.fromEntries(
      alertRows.map((r) => [r.vendor_id, r.count])
    );

    /* -------------------------------------------
       Policies (nearest expiration)
    ------------------------------------------- */
    const policyRows = await sql`
      SELECT vendor_id, coverage_type, expiration_date
      FROM policies
      WHERE org_id = ${orgId}
        AND vendor_id IN (${sql.join(vendorIds)})
    `;

    const policyMap = {};
    for (const p of policyRows) {
      if (
        !policyMap[p.vendor_id] ||
        new Date(p.expiration_date) <
          new Date(policyMap[p.vendor_id].expiration_date)
      ) {
        policyMap[p.vendor_id] = p;
      }
    }

    const now = new Date();

    const output = vendors.map((v) => {
      const comp = complianceMap[v.id] || {};
      const failing = comp.failing || [];
      const missing = comp.missing || [];

      const policy = policyMap[v.id];
      let expDays = null;

      if (policy?.expiration_date) {
        expDays = Math.floor(
          (new Date(policy.expiration_date) - now) / 86400000
        );
      }

      const stage = computeRenewalStage(expDays);

      return {
        id: v.id,
        name: v.name,
        alertsCount: alertMap[v.id] || 0,
        aiScore: computeAiScore(
          expDays,
          comp.status,
          failing.length,
          missing.length
        ),
        primaryPolicy: policy || null,
        renewal: {
          stage,
          stage_label: stageLabel(stage),
          daysLeft: expDays,
          urgency_score: computeRenewalUrgencyScore(expDays),
          next_action: computeNextRenewalAction(stage),
        },
      };
    });

    return res.status(200).json({ ok: true, vendors: output });
  } catch (err) {
    console.error("[vendors/gvi]", err);
    return res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
}
