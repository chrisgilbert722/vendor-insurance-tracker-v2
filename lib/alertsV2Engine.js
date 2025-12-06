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
   SAFER INSERT (explicit, same semantics)
=========================================== */
export async function insertAlertV2Safe(args) {
  return upsertAlertV2(args);
}

/* ===========================================
   DOCUMENT-BASED ALERTS (W9 / LICENSE / CONTRACT / etc)
=========================================== */

async function generateDocumentAlertsForVendor(orgId, vendorId) {
  const docs = await sql`
    SELECT id, document_type, ai_json, uploaded_at
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
    const normRoot = ai.normalized || ai || {};
    let n = normRoot;

    // Some of your earlier parsers wrap normalized data under type-specific keys
    if (docType === "w9" && (ai.w9 || normRoot.w9)) n = ai.w9 || normRoot.w9;
    if (docType === "license" && (ai.license || normRoot.license)) n = ai.license || normRoot.license;
    if (docType === "contract" && (ai.contract || normRoot.contract)) n = ai.contract || normRoot.contract;
    if (docType === "endorsement" && (ai.endorsement || normRoot.endorsement)) n = ai.endorsement || normRoot.endorsement;
    if (docType === "binder" && (ai.binder || normRoot.binder)) n = ai.binder || normRoot.binder;
    if (
      (docType === "entity_certificate" ||
        docType === "entity" ||
        docType === "good_standing") &&
      (ai.entityCertificate || normRoot.entityCertificate)
    ) {
      n = ai.entityCertificate || normRoot.entityCertificate;
    }

    // Track presence for "missing document" alerts
    if (docType === "w9") hasW9 = true;
    if (docType === "license") hasLicense = true;
    if (docType === "entity_certificate" || docType === "entity" || docType === "good_standing") {
      hasEntityCert = true;
    }

    // ---- W9 Alerts ----
    if (docType === "w9") {
      const status = (n.status || "").toLowerCase();
      const tinType = (n.tinType || "").toLowerCase();
      const ein = n.ein || null;
      const ssn = n.ssn || null;

      if (status && status !== "valid") {
        await insertAlertV2Safe({
          orgId,
          vendorId,
          type: "w9_status_issue",
          severity: status === "missing_tin" ? "high" : "medium",
          category: "w9",
          message:
            status === "missing_tin"
              ? "W-9 appears incomplete or missing TIN."
              : "W-9 may be incomplete or unclear.",
          metadata: { status, tinType, ein, ssn, docId: d.id },
        });
      } else if (!ein && !ssn) {
        await insertAlertV2Safe({
          orgId,
          vendorId,
          type: "w9_missing_tin",
          severity: "high",
          category: "w9",
          message: "W-9 is missing a TIN (EIN/SSN).",
          metadata: { tinType, docId: d.id },
        });
      }
    }

    // ---- LICENSE Alerts ----
    if (docType === "license") {
      const expRaw = n.expirationDate || n.expiration_date || null;
      const licenseNumber = n.licenseNumber || n.license_number || null;
      const state = n.state || n.jurisdiction || null;

      if (expRaw) {
        const exp = new Date(expRaw);
        if (!Number.isNaN(exp.getTime())) {
          const days = Math.floor(
            (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (days < 0) {
            await insertAlertV2Safe({
              orgId,
              vendorId,
              type: "license_expired",
              severity: "critical",
              category: "license",
              message: "Vendor business/contractor license is expired.",
              metadata: { docId: d.id, expirationDate: expRaw, licenseNumber, state },
            });
          } else if (days <= 30) {
            await insertAlertV2Safe({
              orgId,
              vendorId,
              type: "license_expiring_30d",
              severity: "high",
              category: "license",
              message: "Vendor license expires within 30 days.",
              metadata: { docId: d.id, expirationDate: expRaw, licenseNumber, state },
            });
          } else if (days <= 90) {
            await insertAlertV2Safe({
              orgId,
              vendorId,
              type: "license_expiring_90d",
              severity: "medium",
              category: "license",
              message: "Vendor license expires within 90 days.",
              metadata: { docId: d.id, expirationDate: expRaw, licenseNumber, state },
            });
          }
        }
      }

      if (!licenseNumber) {
        await insertAlertV2Safe({
          orgId,
          vendorId,
          type: "license_missing_number",
          severity: "medium",
          category: "license",
          message: "License number is missing on the uploaded license document.",
          metadata: { docId: d.id, state },
        });
      }
    }

    // ---- CONTRACT Alerts ----
    if (docType === "contract") {
      const riskScore =
        typeof n.riskScore === "number" ? n.riskScore : null;
      const severity = (n.severity || "").toLowerCase();
      const title = n.contractTitle || n.title || null;

      // Only fire when contract is clearly risky — moderate mode
      if (riskScore !== null && riskScore <= 60) {
        await insertAlertV2Safe({
          orgId,
          vendorId,
          type: "contract_high_risk",
          severity: riskScore <= 40 ? "critical" : "high",
          category: "contract",
          message:
            "Contract analysis indicates elevated risk based on missing or weak clauses.",
          metadata: { docId: d.id, riskScore, severity, title },
        });
      }
    }

    // ---- BINDER / DEC PAGE Alerts ----
    if (docType === "binder") {
      const status = (n.status || "").toLowerCase();
      const effectiveDate = n.effectiveDate || n.effective_date || null;
      const expirationDate = n.expirationDate || n.expiration_date || null;

      if (status && status !== "bound" && status !== "active") {
        await insertAlertV2Safe({
          orgId,
          vendorId,
          type: "binder_status_warning",
          severity: "high",
          category: "binder",
          message: `Binder/dec page status is "${status}", not fully bound coverage.`,
          metadata: { docId: d.id, status, effectiveDate, expirationDate },
        });
      }
    }

    // ---- ENTITY CERTIFICATE Alerts ----
    if (
      docType === "entity_certificate" ||
      docType === "entity" ||
      docType === "good_standing"
    ) {
      const status = (n.status || "").toLowerCase();
      const legalName = n.legalName || n.legal_name || null;

      if (status && status !== "active") {
        await insertAlertV2Safe({
          orgId,
          vendorId,
          type: "entity_status_issue",
          severity:
            status === "revoked" || status === "dissolved"
              ? "critical"
              : "high",
          category: "entity",
          message: `Entity certificate indicates non-active status ("${status}").`,
          metadata: { docId: d.id, status, legalName },
        });
      }
    }
  } // end for docs loop

  // ---- MISSING DOCUMENT ALERTS (MODERATE) ----
  // Only fire if vendor has any policies or rule results (i.e., is "real")
  const hasPolicies = (await sql`
    SELECT 1
    FROM policies
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
        message: "No W-9 document has been uploaded for this vendor.",
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
        message:
          "No business/contractor license document has been uploaded for this vendor.",
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
        message:
          "No entity certificate / good standing document has been uploaded for this vendor.",
        metadata: {},
      });
    }
  }
}

/* ===========================================
   GENERATE ALERTS FOR A SINGLE VENDOR
   (Policies + Rule Engine + Document Intelligence)
=========================================== */
export async function generateAlertsForVendor(orgId, vendorId) {
  const today = new Date();
  const addDays = (n) => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return d;
  };

  // -------- Policy expiration alerts --------
  const policies = await sql`
    SELECT id, expiration_date, coverage_type
    FROM policies
    WHERE org_id = ${orgId} AND vendor_id = ${vendorId};
  `;

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

  // -------- Rule / compliance alerts (from cache) --------
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

  // -------- Document-based alerts (new intelligence) --------
  await generateDocumentAlertsForVendor(orgId, vendorId);
}

/* ===========================================
   GENERATE FOR ENTIRE ORG
   (Now includes vendors with docs but no policies)
=========================================== */
export async function generateAlertsForOrg(orgId) {
  const vendors = await sql`
    SELECT DISTINCT vendor_id
    FROM policies
    WHERE org_id = ${orgId}
    UNION
    SELECT DISTINCT vendor_id
    FROM vendor_documents
    WHERE org_id = ${orgId};
  `;

  for (const v of vendors) {
    const vendorId = v.vendor_id || v.vendor_id;
    if (!vendorId) continue;
    await generateAlertsForVendor(orgId, vendorId);
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

