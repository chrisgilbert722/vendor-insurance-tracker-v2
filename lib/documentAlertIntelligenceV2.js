// lib/documentAlertIntelligenceV2.js

// Reuse your existing Alerts V2 engine upsert helper
import { upsertAlertV2 } from "./alertsV2Engine";

/* ===========================
   DATE HELPERS
=========================== */

function safeParseDate(value) {
  if (!value) return null;

  // Already a Date
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  // Try string formats like "MM/DD/YYYY" or ISO
  if (typeof value === "string") {
    const trimmed = value.trim();

    // MM/DD/YYYY
    const slashParts = trimmed.split("/");
    if (slashParts.length === 3) {
      const [mm, dd, yyyy] = slashParts;
      const month = parseInt(mm, 10);
      const day = parseInt(dd, 10);
      const year = parseInt(yyyy, 10);
      if (!isNaN(month) && !isNaN(day) && !isNaN(year)) {
        const d = new Date(year, month - 1, day);
        return isNaN(d.getTime()) ? null : d;
      }
    }

    // Fallback → let JS try
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
}

function formatISO(date) {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

function daysBetween(a, b) {
  if (!a || !b) return null;
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}
/* ===========================
   1) DOC INTAKE (NORMALIZE)
=========================== */

function docIntake(rawDoc) {
  if (!rawDoc || typeof rawDoc !== "object") {
    return {
      raw: rawDoc || null,
      docType: null,
      insuredName: null,
      policyNumber: null,
      lineOfBusiness: null,
      effectiveDate: null,
      effectiveDateISO: null,
      expirationDate: null,
      expirationDateISO: null,
      limits: {},
      meta: {},
    };
  }

  const effectiveDate =
    safeParseDate(
      rawDoc.effectiveDate ||
        rawDoc.effDate ||
        rawDoc.policyEffectiveDate ||
        rawDoc.policyStart
    ) || null;

  const expirationDate =
    safeParseDate(
      rawDoc.expirationDate ||
        rawDoc.expDate ||
        rawDoc.policyExpirationDate ||
        rawDoc.policyEnd
    ) || null;

  const normalized = {
    raw: rawDoc,
    docType:
      rawDoc.docType ||
      rawDoc.documentType ||
      rawDoc.type ||
      null,
    insuredName:
      rawDoc.insuredName ||
      rawDoc.namedInsured ||
      rawDoc.insured ||
      null,
    policyNumber:
      rawDoc.policyNumber ||
      rawDoc.policyNo ||
      rawDoc.policy ||
      null,
    lineOfBusiness:
      rawDoc.lineOfBusiness ||
      rawDoc.lob ||
      rawDoc.coverageType ||
      null,
    effectiveDate,
    effectiveDateISO: formatISO(effectiveDate),
    expirationDate,
    expirationDateISO: formatISO(expirationDate),
    limits: rawDoc.limits || rawDoc.coverageLimits || {},
    meta: {
      brokerName:
        rawDoc.brokerName ||
        rawDoc.agencyName ||
        null,
      producerName: rawDoc.producerName || null,
      additionalInsuredLanguage:
        rawDoc.additionalInsuredLanguage || null,
      endorsements: rawDoc.endorsements || [],
      pages: rawDoc.pages || null,
    },
  };

  return normalized;
}

/* ===========================
   2) DOC CLASSIFIER
=========================== */

function docClassifier(normalizedDoc) {
  const typeHint =
    (normalizedDoc && normalizedDoc.docType
      ? normalizedDoc.docType.toString().toLowerCase()
      : "") || "";

  if (typeHint.includes("coi") || typeHint.includes("certificate")) {
    return "coi";
  }

  if (
    typeHint.includes("policy") &&
    (typeHint.includes("declaration") ||
      typeHint.includes("dec"))
  ) {
    return "policy_dec";
  }

  if (typeHint.includes("endorsement") || typeHint.includes("endorse")) {
    return "endorsement";
  }

  if (typeHint.includes("contract") || typeHint.includes("agreement")) {
    return "contract";
  }

  if (typeHint.includes("w9") || typeHint === "w-9") {
    return "w9";
  }

  // Heuristic fallback: COI-ish if lineOfBusiness present
  if (normalizedDoc && normalizedDoc.lineOfBusiness) {
    return "coi";
  }

  return "unknown";
}
/* ===========================
   3) DOC DIFF ENGINE (CONTEXT)
   For now: light, uses provided requirementsProfile only.
   You can wire DB comparisons later.
=========================== */

function buildDocContext({ orgId, vendorId, normalizedDoc, docType, requirementsProfile }) {
  return {
    orgId,
    vendorId,
    docType,
    normalizedDoc,
    // Requirements from front-end / caller
    requirements: requirementsProfile || null,
    // Placeholders for future expansion
    previousPolicies: [],
    previousAlerts: [],
  };
}
/* ===========================
   4) DOC RULE ENGINE V2
   Returns "findings" (not yet alerts).
=========================== */

function evaluateDocumentRulesV2(context) {
  const findings = [];
  const { normalizedDoc, requirements, docType } = context;
  const today = new Date();

  const {
    insuredName,
    policyNumber,
    effectiveDate,
    expirationDate,
    lineOfBusiness,
    limits,
  } = normalizedDoc;

  /* ---- Rule 1: Missing key identifiers ---- */
  if (!insuredName) {
    findings.push({
      ruleId: "DOC_MISSING_INSURED_NAME",
      type: "missing_field",
      category: "data_quality",
      severity: "medium",
      field: "insuredName",
      message: "Document is missing insured / named insured.",
      metadata: {},
    });
  }

  if (!policyNumber && docType !== "w9") {
    findings.push({
      ruleId: "DOC_MISSING_POLICY_NUMBER",
      type: "missing_field",
      category: "data_quality",
      severity: "medium",
      field: "policyNumber",
      message: "Document is missing a clear policy number.",
      metadata: {},
    });
  }

  /* ---- Rule 2: Date issues (expired / expiring soon / effective in future) ---- */
  if (!effectiveDate || !expirationDate) {
    findings.push({
      ruleId: "DOC_MISSING_DATES",
      type: "missing_field",
      category: "dates",
      severity: "high",
      field: "effectiveDate/expirationDate",
      message: "Policy dates are missing or incomplete.",
      metadata: {},
    });
  } else {
    const daysToExpiry = daysBetween(today, expirationDate);
    const daysFromEffective = daysBetween(effectiveDate, today);

    if (expirationDate < today) {
      findings.push({
        ruleId: "DOC_POLICY_EXPIRED",
        type: "expired_policy",
        category: "dates",
        severity: "critical",
        field: "expirationDate",
        message: "Policy appears to be expired.",
        metadata: {
          expirationDateISO: normalizedDoc.expirationDateISO,
          daysPastExpiry: daysBetween(expirationDate, today),
        },
      });
    } else if (daysToExpiry !== null && daysToExpiry <= 30) {
      findings.push({
        ruleId: "DOC_POLICY_EXPIRING_SOON",
        type: "expiring_soon",
        category: "dates",
        severity: "high",
        field: "expirationDate",
        message: "Policy is expiring soon.",
        metadata: {
          expirationDateISO: normalizedDoc.expirationDateISO,
          daysToExpiry,
        },
      });
    }

    if (daysFromEffective !== null && daysFromEffective < 0) {
      findings.push({
        ruleId: "DOC_POLICY_NOT_YET_EFFECTIVE",
        type: "not_effective_yet",
        category: "dates",
        severity: "medium",
        field: "effectiveDate",
        message: "Policy effective date is in the future.",
        metadata: {
          effectiveDateISO: normalizedDoc.effectiveDateISO,
          daysUntilEffective: Math.abs(daysFromEffective),
        },
      });
    }
  }

  /* ---- Rule 3: Limits vs Requirements ---- */
  if (requirements && requirements.coverage) {
    const coverageReqs = requirements.coverage;

    // Example general liability check
    if (coverageReqs.generalLiability && coverageReqs.generalLiability.minEachOccurrence) {
      const required = Number(coverageReqs.generalLiability.minEachOccurrence) || 0;

      const actual =
        Number(
          limits?.generalLiabilityEachOccurrence ||
            limits?.generalLiability ||
            limits?.glEachOccurrence
        ) || 0;

      if (actual && required && actual < required) {
        findings.push({
          ruleId: "DOC_LIMITS_GL_BELOW_REQ",
          type: "coverage_insufficient",
          category: "limits",
          severity: "high",
          field: "generalLiability.eachOccurrence",
          message: `General Liability each occurrence limit (${actual}) is below required minimum (${required}).`,
          metadata: {
            required,
            actual,
          },
        });
      }
    }

    // Example auto liability
    if (coverageReqs.autoLiability && coverageReqs.autoLiability.minCombinedSingleLimit) {
      const required = Number(coverageReqs.autoLiability.minCombinedSingleLimit) || 0;

      const actual =
        Number(
          limits?.autoCombinedSingleLimit ||
            limits?.autoLiabilityCombined ||
            limits?.autoCsl
        ) || 0;

      if (actual && required && actual < required) {
        findings.push({
          ruleId: "DOC_LIMITS_AUTO_BELOW_REQ",
          type: "coverage_insufficient",
          category: "limits",
          severity: "high",
          field: "autoLiability.combinedSingleLimit",
          message: `Auto liability combined single limit (${actual}) is below required minimum (${required}).`,
          metadata: {
            required,
            actual,
          },
        });
      }
    }

    // You can extend this pattern for Umbrella, Workers Comp, etc.
  }

  /* ---- Rule 4: Missing endorsements (AI language placeholder) ---- */
  if (docType === "coi" || docType === "policy_dec" || docType === "endorsement") {
    if (requirements && Array.isArray(requirements.requiredEndorsements)) {
      const requiredEndorsements = requirements.requiredEndorsements;
      const docEndorsements = Array.isArray(normalizedDoc.meta.endorsements)
        ? normalizedDoc.meta.endorsements
        : [];

      requiredEndorsements.forEach((reqCode) => {
        const hasEndorsement = docEndorsements.some((e) => {
          const code = (e.code || e.id || e.name || "").toString().toUpperCase();
          return code.includes(reqCode.toString().toUpperCase());
        });

        if (!hasEndorsement) {
          findings.push({
            ruleId: "DOC_MISSING_ENDORSEMENT_" + reqCode,
            type: "missing_endorsement",
            category: "endorsement",
            severity: "high",
            field: "endorsements",
            message: `Required endorsement ${reqCode} is missing from this document.`,
            metadata: {
              requiredEndorsement: reqCode,
            },
          });
        }
      });
    }
  }

  /* ---- Rule 5: Unknown document type quality flag ---- */
  if (docType === "unknown") {
    findings.push({
      ruleId: "DOC_UNKNOWN_TYPE",
      type: "unknown_document_type",
      category: "data_quality",
      severity: "low",
      field: "docType",
      message: "Document type could not be confidently classified.",
      metadata: {},
    });
  }

  return findings;
}
/* ===========================
   5) DOC ALERT SYNTHESIZER
   Converts findings into alert payloads that
   Alerts V2 engine can upsert.
=========================== */

function synthesizeAlertsFromFindings({ orgId, vendorId, context, findings, source }) {
  const alerts = [];

  findings.forEach((finding) => {
    alerts.push({
      orgId,
      vendorId,
      type: finding.type,
      severity: finding.severity || "medium",
      category: finding.category || "general",
      message: finding.message || "Document issue detected.",
      ruleId: finding.ruleId || null,
      metadata: {
        source: source || "document_intelligence_v2",
        docType: context.docType,
        policyNumber: context.normalizedDoc.policyNumber || null,
        insuredName: context.normalizedDoc.insuredName || null,
        lineOfBusiness: context.normalizedDoc.lineOfBusiness || null,
        effectiveDateISO: context.normalizedDoc.effectiveDateISO,
        expirationDateISO: context.normalizedDoc.expirationDateISO,
        field: finding.field || null,
        requirementsSnapshot: context.requirements || null,
        findingMetadata: finding.metadata || {},
      },
    });
  });

  return alerts;
}
/* ===========================
   6) ALERT UPSERT + TIMELINE HOOK
=========================== */

async function persistAlerts(alerts) {
  const results = [];

  for (const alert of alerts) {
    // Map to existing upsertAlertV2 signature
    const payload = {
      orgId: alert.orgId,
      vendorId: alert.vendorId,
      type: alert.type,
      severity: alert.severity,
      category: alert.category,
      message: alert.message,
      ruleId: alert.ruleId,
      metadata: alert.metadata || {},
    };

    const res = await upsertAlertV2(payload);
    results.push(res);
  }

  return results;
}
/* ===========================
   7) MAIN EXPORT
   runDocumentAlertIntelligenceV2()
=========================== */

/**
 * Runs the full Document → Alert Intelligence V2 pipeline.
 *
 * @param {Object} params
 * @param {number|string} params.orgId
 * @param {number|string} params.vendorId
 * @param {Object} params.document         Parsed document JSON from your extractor
 * @param {Object|null} params.requirementsProfile  Optional requirements object to compare against
 * @param {string} [params.source]         e.g. "vendor_portal_upload", "admin_upload"
 */
export async function runDocumentAlertIntelligenceV2({
  orgId,
  vendorId,
  document,
  requirementsProfile = null,
  source = "document_upload",
}) {
  // 1) Normalize
  const normalizedDoc = docIntake(document);

  // 2) Classify
  const docType = docClassifier(normalizedDoc);

  // 3) Build context
  const context = buildDocContext({
    orgId,
    vendorId,
    normalizedDoc,
    docType,
    requirementsProfile,
  });

  // 4) Evaluate rules V2
  const findings = evaluateDocumentRulesV2(context);

  // 5) Synthesize alert payloads
  const alerts = synthesizeAlertsFromFindings({
    orgId,
    vendorId,
    context,
    findings,
    source,
  });

  // 6) Persist via Alerts V2 engine
  const upsertResults = await persistAlerts(alerts);

  return {
    docType,
    normalizedDoc,
    findings,
    alerts,
    upsertResults,
  };
}
