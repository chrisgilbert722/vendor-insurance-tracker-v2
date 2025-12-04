// lib/alertsV2Engine.js
// Core engine for Alerts V2 — powered by Neon

import { sql } from "./db";

/* ===========================================
   UPSERT ALERT (prevents duplicate active alerts)
=========================================== */
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
  // Check for existing unresolved alert
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

/* ===========================================
   SAFER INSERT (explicit)
=========================================== */
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

/* ===========================================
   GENERATE ALERTS FOR A SINGLE VENDOR
=========================================== */
export async function generateAlertsForVendor(orgId, vendorId) {
  // Policy expiration alerts
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

  for (const p of policies) {
    if (!p.expiration_date) continue;

    const exp = new Date(p.expiration_date);
    const days = (exp - today) / (1000 * 60 * 60 * 24);

    if (exp < today) {
      await insertAlertV2Safe({
        orgId,
        vendorId,
        type: "expiration_expired",
        severity: "critical",
        category: "expiration",
        message: `Policy ${p.coverage_type || ""} is expired.`,
        metadata: { policyId: p.id, expiration_date: p.expiration_date },
      });
    } else if (days <= 30) {
      await insertAlertV2Safe({
        orgId,
        vendorId,
        type: "expiration_30d",
        severity: "high",
        category: "expiration",
        message: `Policy ${p.coverage_type || ""} expires within 30 days.`,
        metadata: { policyId: p.id, expiration_date: p.expiration_date },
      });
    } else if (days <= 90) {
      await insertAlertV2Safe({
        orgId,
        vendorId,
        type: "expiration_90d",
        severity: "medium",
        category: "expiration",
        message: `Policy ${p.coverage_type || ""} expires within 90 days.`,
        metadata: { policyId: p.id, expiration_date: p.expiration_date },
      });
    }
  }

  // Compliance rule-based alerts
  const complianceRows = await sql`
    SELECT status, passing, failing, missing
    FROM vendor_compliance_cache
    WHERE org_id = ${orgId} AND vendor_id = ${vendorId}
    LIMIT 1;
  `;

  if (complianceRows.length > 0) {
    const row = complianceRows[0];

    for (const f of row.failing || []) {
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

    for (const m of row.missing || []) {
      await insertAlertV2Safe({
        orgId,
        vendorId,
        type: "missing_coverage",
        severity: "medium",
        category: "missing",
        message: m?.human_label || m?.field_key || "Missing required coverage",
        metadata: m,
      });
    }
  }
}

/* ===========================================
   GENERATE FOR ENTIRE ORG
=========================================== */
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

/* ===========================================
   LIST ALERTS (supports vendor filter)
=========================================== */
export async function listAlertsV2({ orgId, vendorId = null, limit = 100 }) {
  if (vendorId) {
    return await sql`
      SELECT *
      FROM alerts_v2
      WHERE org_id = ${orgId}
        AND vendor_id = ${vendorId}
        AND resolved_at IS NULL
      ORDER BY created_at DESC
      LIMIT ${limit};
    `;
  }

  return await sql`
    SELECT *
    FROM alerts_v2
    WHERE org_id = ${orgId}
      AND resolved_at IS NULL
    ORDER BY created_at DESC
    LIMIT ${limit};
  `;
}

/* ===========================================
   SEVERITY BREAKDOWN (for dashboard)
=========================================== */
export async function getAlertStatsV2(orgId) {
  const rows = await sql`
    SELECT severity, COUNT(*) as count
    FROM alerts_v2
    WHERE org_id = ${orgId}
      AND resolved_at IS NULL
    GROUP BY severity;
  `;

  const out = { critical: 0, high: 0, medium: 0, low: 0 };

  for (const r of rows) {
    const sev = (r.severity || "").toLowerCase();
    const count = Number(r.count);

    if (sev === "critical") out.critical = count;
    else if (sev === "high") out.high = count;
    else if (sev === "medium") out.medium = count;
    else out.low += count;
  }

  return out;
}

/* ===========================================
   RESOLVE ALERT
=========================================== */
export async function resolveAlertV2(id, orgId) {
  await sql`
    UPDATE alerts_v2
    SET resolved_at = NOW()
    WHERE id = ${id}
      AND org_id = ${orgId};
  `;
}
