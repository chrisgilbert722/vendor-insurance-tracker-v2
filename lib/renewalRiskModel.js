// lib/renewalRiskModel.js
// Auto-Predictive Renewal Risk Model (Risk ML v1)
// Heuristic scoring based on days_left, stage, alerts, failing rules, history.

import { sql } from "./db";

/**
 * Compute a renewal risk score (0–100) for a renewal row.
 * Higher = MORE RISK (more likely to fail / be late).
 */
export function computeRenewalRiskScore({
  daysLeft,          // integer (can be negative)
  stage,             // 0,1,3,7,30,90 or null
  alertsCount,       // integer
  failingRulesCount, // integer
  missingRulesCount, // integer
  history,           // { lateRenewals, onTimeRenewals, lastOutcome }
}) {
  let score = 0;

  // Days-left contribution
  if (daysLeft === null) {
    score += 20; // unknown
  } else if (daysLeft < 0) {
    score += 90;
  } else if (daysLeft <= 1) {
    score += 70;
  } else if (daysLeft <= 3) {
    score += 60;
  } else if (daysLeft <= 7) {
    score += 45;
  } else if (daysLeft <= 30) {
    score += 30;
  } else if (daysLeft <= 90) {
    score += 15;
  } else {
    score += 5;
  }

  // Stage contribution
  if (stage === 0) score += 20;
  else if (stage === 1) score += 15;
  else if (stage === 3) score += 10;
  else if (stage === 7) score += 5;

  // Alerts contribution
  if (alertsCount > 0) {
    score += Math.min(25, alertsCount * 5);
  }

  // Rules contribution
  score += failingRulesCount * 4;
  score += missingRulesCount * 3;

  // Historical behavior
  if (history) {
    const late = history.lateRenewals || 0;
    const onTime = history.onTimeRenewals || 0;

    if (late > onTime) {
      score += 20; // tends to be late
    } else if (onTime > late) {
      score -= 10; // tends to be on-time
    }

    if (history.lastOutcome === "expired") {
      score += 15;
    } else if (history.lastOutcome === "on_time") {
      score -= 5;
    }
  }

  // Clamp
  if (score < 0) score = 0;
  if (score > 100) score = 100;

  return Math.round(score);
}

/**
 * Bucket a risk score into a label.
 */
export function riskBucket(score) {
  if (score >= 80) return "high_risk_fail";
  if (score >= 60) return "at_risk";
  if (score >= 40) return "watch";
  if (score >= 20) return "likely_on_time";
  return "very_likely_on_time";
}

/**
 * Fetch simple "renewal history" for a vendor from audit tables if you have them.
 * For now, uses renewal_email_queue as proxy: sent-after-exp = late, sent-before-exp = on-time.
 */
async function loadVendorHistory(orgId, vendorId) {
  try {
    const rows = await sql`
      SELECT meta, status, created_at
      FROM renewal_email_queue
      WHERE org_id = ${orgId}
        AND vendor_id = ${vendorId}
      ORDER BY created_at DESC
      LIMIT 50;
    `;

    let late = 0;
    let onTime = 0;
    let lastOutcome = null;

    for (const row of rows) {
      const meta = row.meta || {};
      const expDate = meta.expDate ? new Date(meta.expDate) : null;
      const createdAt = row.created_at ? new Date(row.created_at) : null;

      if (expDate && createdAt) {
        if (createdAt > expDate) late++;
        else onTime++;
      }
    }

    if (rows[0]) {
      const meta = rows[0].meta || {};
      const expDate = meta.expDate ? new Date(meta.expDate) : null;
      const createdAt = rows[0].created_at
        ? new Date(rows[0].created_at)
        : null;

      if (expDate && createdAt) {
        if (createdAt > expDate) lastOutcome = "expired";
        else lastOutcome = "on_time";
      }
    }

    return { lateRenewals: late, onTimeRenewals: onTime, lastOutcome };
  } catch (err) {
    console.error("[renewalRiskModel] history error:", err);
    return { lateRenewals: 0, onTimeRenewals: 0, lastOutcome: null };
  }
}

/**
 * Build forecast for a single org:
 * - For each renewal schedule row
 * - Compute risk score + bucket
 * - Include vendor + coverage info
 */
export async function buildRenewalForecastForOrg(orgId) {
  // schedule + vendor + policy
  const rows = await sql`
    SELECT 
      prs.*,
      v.name AS vendor_name,
      p.coverage_type,
      p.expiration_date
    FROM policy_renewal_schedule prs
    JOIN vendors v ON v.id = prs.vendor_id
    JOIN policies p ON p.id = prs.policy_id
    WHERE prs.org_id = ${orgId}
      AND prs.status = 'active';
  `;

  if (!rows.length) return [];

  const now = new Date();

  // Alerts per vendor
  const vendorIds = [...new Set(rows.map((r) => r.vendor_id))];

  const alertsRows = await sql`
    SELECT vendor_id, COUNT(*) as count
    FROM alerts_v2
    WHERE org_id = ${orgId}
      AND vendor_id = ANY(${vendorIds})
    GROUP BY vendor_id;
  `;

  const alertsMap = {};
  alertsRows.forEach((r) => {
    alertsMap[r.vendor_id] = Number(r.count || 0);
  });

  // Compliance per vendor
  const compRows = await sql`
    SELECT vendor_id, failing, missing
    FROM vendor_compliance_cache
    WHERE org_id = ${orgId}
      AND vendor_id = ANY(${vendorIds});
  `;

  const compMap = {};
  compRows.forEach((r) => {
    compMap[r.vendor_id] = {
      failing: r.failing || [],
      missing: r.missing || [],
    };
  });

  // History per vendor
  const historyMap = {};
  for (const vid of vendorIds) {
    historyMap[vid] = await loadVendorHistory(orgId, vid);
  }

  const forecast = [];

  for (const row of rows) {
    const exp = new Date(row.expiration_date);
    const daysLeft = Math.floor((exp - now) / 86400000);

    const alertsCount = alertsMap[row.vendor_id] || 0;
    const comp = compMap[row.vendor_id] || { failing: [], missing: [] };

    const failingRulesCount = comp.failing.length;
    const missingRulesCount = comp.missing.length;
    const history = historyMap[row.vendor_id];

    const riskScore = computeRenewalRiskScore({
      daysLeft,
      stage: row.last_stage || null,
      alertsCount,
      failingRulesCount,
      missingRulesCount,
      history,
    });

    const bucket = riskBucket(riskScore);

    forecast.push({
      org_id: row.org_id,
      vendor_id: row.vendor_id,
      vendor_name: row.vendor_name,
      policy_id: row.policy_id,
      coverage_type: row.coverage_type,
      expiration_date: row.expiration_date,
      days_left: daysLeft,
      stage: row.last_stage,
      alerts_count: alertsCount,
      failing_rules_count: failingRulesCount,
      missing_rules_count: missingRulesCount,
      history,
      risk_score: riskScore,
      risk_bucket: bucket,
    });
  }

  return forecast;
}
