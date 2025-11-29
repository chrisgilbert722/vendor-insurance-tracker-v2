// lib/alertsV2Engine.js
// Core engine for Alerts V2 — uses live data from Neon via sql

import { sql } from "./db";

// Upsert helper: avoids duplicate live alerts for same vendor/type/rule
export async function upsertAlertV2({
  orgId,
  vendorId,
  type,
  severity,
  category,
  message,
  ruleId = null,
  metadata = {},
}) {
  // Look for existing unresolved alert for same key
  const existing = await sql`
    SELECT id
    FROM alerts_v2
    WHERE org_id = ${orgId}
      AND vendor_id = ${vendorId}
      AND type = ${type}
      AND COALESCE(rule_id, -1) = COALESCE(${ruleId}, -1)
      AND resolved_at IS NULL
    LIMIT 1;
  `;

  if (existing.length > 0) {
    // Touch timestamp and metadata
    await sql`
      UPDATE alerts_v2
      SET message = ${message},
          severity = ${severity},
          category = ${category},
          metadata = ${metadata},
          created_at = NOW()
      WHERE id = ${existing[0].id};
    `;
    return existing[0].id;
  }

  const inserted = await sql`
    INSERT INTO alerts_v2 (org_id, vendor_id, type, severity, category, message, rule_id, metadata)
    VALUES (${orgId}, ${vendorId}, ${severity}, ${severity}, ${category}, ${message}, ${ruleId}, ${metadata})
    RETURNING id;
  `;
  return inserted[0].id;
}

// Safer version with explicit columns
export async function insertAlertV2Safe({
  orgId,
  vendorId,
  type,
  severity,
  category,
  message,
  ruleId = null,
  metadata = {},
}) {
  const existing = await sql`
    SELECT id
    FROM alerts_v2
    WHERE org_id = ${orgId}
      AND vendor_id = ${vendorId}
      AND type = ${type}
      AND COALESCE(rule_id, -1) = COALESCE(${ruleId}, -1)
      AND resolved_at IS NULL
    LIMIT 1;
  `;

  if (existing.length > 0) {
    await sql`
      UPDATE alerts_v2
      SET message = ${message},
          severity = ${severity},
          category = ${category},
          metadata = ${metadata},
          created_at = NOW()
      WHERE id = ${existing[0].id};
    `;
    return existing[0].id;
  }

  const inserted = await sql`
    INSERT INTO alerts_v2 (
      org_id, vendor_id, type, severity, category, message, rule_id, metadata
    )
    VALUES (
      ${orgId}, ${vendorId}, ${type}, ${severity}, ${category}, ${message}, ${ruleId}, ${metadata}
    )
    RETURNING id;
  `;
  return inserted[0].id;
}

// Generate alerts for a single vendor
export async function generateAlertsForVendor(orgId, vendorId) {
  // 1) Policies (expiration)
  const policies = await sql`
    SELECT id, expiration_date, coverage_type
    FROM policies
    WHERE org_id = ${orgId} AND vendor_id = ${vendorId};
  `;

  const today = new Date();
  const addDays = (n) => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return d;
  };

  let hasExpired = false;
  let hasCritical = false;
  let hasWarning = false;

  for (const p of policies) {
    if (!p.expiration_date) continue;
    const exp = new Date(p.expiration_date);
    const days = (exp - today) / (1000 * 60 * 60 * 24);

    if (exp < today) {
      hasExpired = true;
      await insertAlertV2Safe({
        orgId,
        vendorId,
        type: "expiration_expired",
        severity: "critical",
        category: "expiration",
        message: `Policy ${p.coverage_type || ""} is expired.`,
        ruleId: null,
        metadata: { policyId: p.id, expiration_date: p.expiration_date },
      });
    } else if (days <= 30) {
      hasCritical = true;
      await insertAlertV2Safe({
        orgId,
        vendorId,
        type: "expiration_30d",
        severity: "high",
        category: "expiration",
        message: `Policy ${p.coverage_type || ""} expires within 30 days.`,
        ruleId: null,
        metadata: { policyId: p.id, expiration_date: p.expiration_date },
      });
    } else if (days <= 90) {
      hasWarning = true;
      await insertAlertV2Safe({
        orgId,
        vendorId,
        type: "expiration_90d",
        severity: "medium",
        category: "expiration",
        message: `Policy ${p.coverage_type || ""} expires within 90 days.`,
        ruleId: null,
        metadata: { policyId: p.id, expiration_date: p.expiration_date },
      });
    }
  }

  // 2) Compliance (vendor_compliance_cache)
  const complianceRows = await sql`
    SELECT status, passing, failing, missing
    FROM vendor_compliance_cache
    WHERE org_id = ${orgId} AND vendor_id = ${vendorId}
    LIMIT 1;
  `;

  if (complianceRows.length > 0) {
    const row = complianceRows[0];
    const failing = row.failing || [];
    const missing = row.missing || [];

    // Failing rules → High/Critical alerts
    for (const f of failing) {
      await insertAlertV2Safe({
        orgId,
        vendorId,
        type: "rule_fail",
        severity: f?.severity === "critical" ? "critical" : "high",
        category: "rule",
        message: f?.human_label || f?.field_key || "Rule failed",
        ruleId: f?.rule_id || null,
        metadata: f,
      });
    }

    // Missing coverage → Medium alerts
    for (const m of missing) {
      await insertAlertV2Safe({
        orgId,
        vendorId,
        type: "missing_coverage",
        severity: "medium",
        category: "missing",
        message: m?.human_label || m?.field_key || "Missing required coverage",
        ruleId: null,
        metadata: m,
      });
    }
  }

  // NOTE: If you later store elite engine results or risk scores in DB,
  // extend this function to generate alerts from that too.
}

// Generate alerts for ALL vendors in an org
export async function generateAlertsForOrg(orgId) {
  const vendors = await sql`
    SELECT DISTINCT vendor_id
    FROM policies
    WHERE org_id = ${orgId};
  `;

  for (const v of vendors) {
    await generateAlertsForVendor(orgId, v.vendor_id);
  }
}

// List alerts for org (optionally by vendor)
export async function listAlertsV2({ orgId, vendorId = null, limit = 100 }) {
  if (vendorId) {
    return await sql`
      SELECT *
      FROM alerts_v2
      WHERE org_id = ${orgId}
        AND vendor_id = ${vendorId}
      ORDER BY created_at DESC
      LIMIT ${limit};
    `;
  }

  return await sql`
    SELECT *
    FROM alerts_v2
    WHERE org_id = ${orgId}
    ORDER BY created_at DESC
    LIMIT ${limit};
  `;
}

// Stats for dashboard
export async function getAlertStatsV2(orgId) {
  const rows = await sql`
    SELECT severity, COUNT(*) as count
    FROM alerts_v2
    WHERE org_id = ${orgId} AND resolved_at IS NULL
    GROUP BY severity;
  `;

  const base = { critical: 0, high: 0, medium: 0, low: 0 };
  rows.forEach((r) => {
    base[r.severity] = Number(r.count || 0);
  });

  return base;
}

// Resolve a single alert
export async function resolveAlertV2(id, orgId) {
  await sql`
    UPDATE alerts_v2
    SET resolved_at = NOW()
    WHERE id = ${id} AND org_id = ${orgId};
  `;
}
