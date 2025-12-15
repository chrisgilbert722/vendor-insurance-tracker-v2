// lib/alertsV2Engine.js
// Core engine for Alerts V2 — Supabase UUID-safe

import { sql } from "./db";
import { runAutoActionForAlert } from "./alerts/alertAutoActions";
import { recordComplianceEvent } from "./complianceEventLedger";

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
      ${orgId}, ${vendorId}, ${type}, ${severity}, ${category},
      ${message}, ${ruleId}, ${metadata}
    )
    RETURNING id;
  `;

  const alertId = inserted[0].id;

  // 🔐 COMPLIANCE EVIDENCE — ALERT CREATED
  await recordComplianceEvent({
    orgId,
    vendorId,
    alertId,
    eventType: "alert_created",
    source: "system",
    payload: { type, severity, category, ruleId },
  });

  // 🔥 AUTONOMOUS FOLLOW-UP (SAFE MODE)
  const [alert] = await sql`
    SELECT *
    FROM alerts_v2
    WHERE id = ${alertId}
    LIMIT 1;
  `;
  await runAutoActionForAlert(alert);

  return alertId;
}

export async function insertAlertV2Safe(args) {
  return upsertAlertV2(args);
}

async function generateDocumentAlertsForVendor(orgId, vendorId) {
  const docs = await sql`
    SELECT id, document_type, ai_json
    FROM vendor_documents
    WHERE org_id = ${orgId} AND vendor_id = ${vendorId};
  `;

  if (!docs.length) return;

  const now = new Date();
  let hasW9 = false;
  let hasLicense = false;
  let hasEntityCert = false;

  for (const d of docs) {
    const docType = (d.document_type || "").toLowerCase();
    const ai = d.ai_json || {};
    const n = ai.normalized || ai || {};

    if (docType === "w9") hasW9 = true;
    if (docType === "license") hasLicense = true;
    if (["entity", "entity_certificate", "good_standing"].includes(docType))
      hasEntityCert = true;

    if (docType === "w9" && (!n.ein && !n.ssn)) {
      await insertAlertV2Safe({
        orgId,
        vendorId,
        type: "w9_missing_tin",
        severity: "high",
        category: "w9",
        message: "W-9 is missing a TIN (EIN/SSN).",
        metadata: { docId: d.id },
      });
    }

    if (docType === "license" && n.expiration_date) {
      const exp = new Date(n.expiration_date);
      const days = (exp - now) / 86400000;
      if (days < 0) {
        await insertAlertV2Safe({
          orgId,
          vendorId,
          type: "license_expired",
          severity: "critical",
          category: "license",
          message: "Vendor license is expired.",
          metadata: { docId: d.id },
        });
      }
    }
  }

  const hasPolicies = (await sql`
    SELECT 1 FROM policies
    WHERE org_id = ${orgId} AND vendor_id = ${vendorId}
    LIMIT 1;
  `).length;

  if (hasPolicies) {
    if (!hasW9) {
      await insertAlertV2Safe({
        orgId,
        vendorId,
        type: "w9_missing",
        severity: "high",
        category: "w9",
        message: "No W-9 document uploaded.",
        metadata: {},
      });
    }

    if (!hasLicense) {
      await insertAlertV2Safe({
        orgId,
        vendorId,
        type: "license_missing",
        severity: "medium",
        category: "license",
        message: "No license document uploaded.",
        metadata: {},
      });
    }

    if (!hasEntityCert) {
      await insertAlertV2Safe({
        orgId,
        vendorId,
        type: "entity_certificate_missing",
        severity: "low",
        category: "entity",
        message: "No entity certificate uploaded.",
        metadata: {},
      });
    }
  }
}

export async function generateAlertsForVendor(orgId, vendorId) {
  const today = new Date();

  const policies = await sql`
    SELECT id, expiration_date, coverage_type
    FROM policies
    WHERE org_id = ${orgId} AND vendor_id = ${vendorId};
  `;

  for (const p of policies) {
    if (!p.expiration_date) continue;
    const exp = new Date(p.expiration_date);
    const days = (exp - today) / 86400000;

    if (exp < today) {
      await insertAlertV2Safe({
        orgId,
        vendorId,
        type: "expiration_expired",
        severity: "critical",
        category: "expiration",
        message: `Policy ${p.coverage_type || ""} is expired.`,
        metadata: { policyId: p.id },
      });
    } else if (days <= 30) {
      await insertAlertV2Safe({
        orgId,
        vendorId,
        type: "expiration_30d",
        severity: "high",
        category: "expiration",
        message: `Policy ${p.coverage_type || ""} expires within 30 days.`,
        metadata: { policyId: p.id },
      });
    }
  }

  await generateDocumentAlertsForVendor(orgId, vendorId);
}

export async function generateAlertsForOrg(orgId) {
  const vendors = await sql`
    SELECT DISTINCT vendor_id FROM policies WHERE org_id = ${orgId}
    UNION
    SELECT DISTINCT vendor_id FROM vendor_documents WHERE org_id = ${orgId};
  `;

  for (const v of vendors) {
    if (!v.vendor_id) continue;
    await generateAlertsForVendor(orgId, v.vendor_id);
  }
}

export async function listAlertsV2({ orgId, vendorId = null, limit = 100, includeResolved = false }) {
  if (vendorId) {
    return await sql`
      SELECT *
      FROM alerts_v2
      WHERE org_id = ${orgId}
        AND vendor_id = ${vendorId}
        AND (${includeResolved}::bool OR resolved_at IS NULL)
      ORDER BY created_at DESC
      LIMIT ${limit};
    `;
  }

  return await sql`
    SELECT *
    FROM alerts_v2
    WHERE org_id = ${orgId}
      AND (${includeResolved}::bool OR resolved_at IS NULL)
    ORDER BY created_at DESC
    LIMIT ${limit};
  `;
}

export async function getAlertStatsV2(orgId, { includeResolved = false } = {}) {
  const rows = await sql`
    SELECT vendor_id, severity, type, message, created_at, resolved_at
    FROM alerts_v2
    WHERE org_id = ${orgId}
      AND (${includeResolved}::bool OR resolved_at IS NULL)
    ORDER BY created_at DESC;
  `;

  const countsBySeverity = { critical: 0, high: 0, medium: 0, low: 0 };
  const vendors = {};

  for (const r of rows) {
    const vid = String(r.vendor_id);
    const sev = (r.severity || "").toLowerCase();

    if (countsBySeverity[sev] !== undefined) countsBySeverity[sev] += 1;

    if (!vendors[vid]) {
      vendors[vid] = {
        vendorId: r.vendor_id,
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        latest: null,
      };
    }

    vendors[vid].total += 1;
    if (vendors[vid][sev] !== undefined) vendors[vid][sev] += 1;

    if (!vendors[vid].latest) {
      vendors[vid].latest = {
        code: r.type,
        message: r.message,
        severity: sev || "medium",
        created_at: r.created_at,
      };
    }
  }

  const total = Object.values(countsBySeverity).reduce((a, b) => a + b, 0);

  return { total, countsBySeverity, vendors };
}

export async function getAlertAgingV2(orgId) {
  const rows = await sql`
    SELECT created_at
    FROM alerts_v2
    WHERE org_id = ${orgId}
      AND resolved_at IS NULL;
  `;

  if (!rows.length) {
    return { oldest: 0, avgAge: 0, over7: 0, over30: 0 };
  }

  const now = Date.now();
  const ages = rows.map((r) => {
    const created = new Date(r.created_at).getTime();
    return Math.floor((now - created) / 86400000);
  });

  const oldest = Math.max(...ages);
  const avgAge = Math.round(ages.reduce((a, b) => a + b, 0) / ages.length);
  const over7 = ages.filter((d) => d >= 7).length;
  const over30 = ages.filter((d) => d >= 30).length;

  return { oldest, avgAge, over7, over30 };
}

export async function getTopAlertTypesV2(orgId, limit = 8) {
  const rows = await sql`
    SELECT type, COUNT(*)::int AS count
    FROM alerts_v2
    WHERE org_id = ${orgId}
      AND resolved_at IS NULL
    GROUP BY type
    ORDER BY COUNT(*) DESC
    LIMIT ${limit};
  `;

  return (rows || []).map((r) => ({ type: r.type, count: r.count }));
}

export async function getAlertTimelineV2(orgId, days = 30) {
  const rows = await sql`
    SELECT created_at, severity, type, message, vendor_id
    FROM alerts_v2
    WHERE org_id = ${orgId}
      AND resolved_at IS NULL
      AND created_at >= NOW() - (${days}::int || ' days')::interval
    ORDER BY created_at DESC
    LIMIT 200;
  `;

  return rows || [];
}

export async function getCriticalVendorsV2(orgId, limit = 10) {
  const rows = await sql`
    SELECT vendor_id, COUNT(*)::int AS critical_count
    FROM alerts_v2
    WHERE org_id = ${orgId}
      AND resolved_at IS NULL
      AND LOWER(severity) = 'critical'
    GROUP BY vendor_id
    ORDER BY COUNT(*) DESC
    LIMIT ${limit};
  `;

  return rows || [];
}

export async function getHeatSignatureV2(orgId, days = 30) {
  const rows = await sql`
    SELECT DATE_TRUNC('day', created_at) AS day, COUNT(*)::int AS count
    FROM alerts_v2
    WHERE org_id = ${orgId}
      AND resolved_at IS NULL
      AND created_at >= NOW() - (${days}::int || ' days')::interval
    GROUP BY 1
    ORDER BY 1 ASC;
  `;

  return rows || [];
}

export async function getSlaSummaryV2(orgId) {
  const rows = await sql`
    SELECT created_at
    FROM alerts_v2
    WHERE org_id = ${orgId}
      AND resolved_at IS NULL;
  `;

  const now = Date.now();
  const ages = rows.map((r) =>
    Math.floor((now - new Date(r.created_at).getTime()) / 86400000)
  );

  return {
    total: ages.length,
    over7: ages.filter((d) => d >= 7).length,
    over14: ages.filter((d) => d >= 14).length,
    over30: ages.filter((d) => d >= 30).length,
  };
}

export async function resolveAlertV2(id, orgId) {
  await sql`
    UPDATE alerts_v2
    SET resolved_at = NOW()
    WHERE id = ${id} AND org_id = ${orgId};
  `;

  await recordComplianceEvent({
    orgId,
    alertId: id,
    eventType: "alert_resolved",
    source: "user",
  });
}
