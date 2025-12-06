// lib/vendorIntelligence.js
// Vendor Intelligence Graph — Step 1
// Fuses Rule Engine V5 + Alerts V2 + Document presence into a single view.

import { sql } from "./db";

function computeTierFromScore(score) {
  if (score >= 85) return "Elite Safe";
  if (score >= 70) return "Preferred";
  if (score >= 55) return "Watch";
  if (score >= 35) return "High Risk";
  return "Severe";
}

// Helper: Apply alert penalties (moderate mode)
function computeAlertScore(alerts) {
  if (!alerts || alerts.length === 0) return 100;

  let penalty = 0;

  for (const a of alerts) {
    const sev = (a.severity || "").toLowerCase();
    if (sev === "critical") penalty += 12;
    else if (sev === "high") penalty += 8;
    else if (sev === "medium") penalty += 4;
    else penalty += 1;
  }

  const score = 100 - penalty;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export async function computeVendorIntelligence(orgId, vendorId) {
  // 1) BASE RULE SCORE (from vendor_compliance_cache)
  const cacheRows = await sql`
    SELECT score
    FROM vendor_compliance_cache
    WHERE org_id = ${orgId} AND vendor_id = ${vendorId}
    LIMIT 1;
  `;

  const ruleScoreRaw =
    cacheRows.length && typeof cacheRows[0].score === "number"
      ? cacheRows[0].score
      : 70; // default mid score if nothing yet

  const ruleScore = Math.max(0, Math.min(100, Math.round(ruleScoreRaw)));

  // 2) ALERTS V2 — unresolved
  const alertRows = await sql`
    SELECT severity, category, type
    FROM alerts_v2
    WHERE org_id = ${orgId}
      AND vendor_id = ${vendorId}
      AND resolved_at IS NULL;
  `;

  const alertScore = computeAlertScore(alertRows);

  const alertCountsBySeverity = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
  const alertCountsByCategory = {};

  for (const a of alertRows) {
    const sev = (a.severity || "").toLowerCase();
    const cat = (a.category || "other").toLowerCase();

    if (sev === "critical") alertCountsBySeverity.critical++;
    else if (sev === "high") alertCountsBySeverity.high++;
    else if (sev === "medium") alertCountsBySeverity.medium++;
    else alertCountsBySeverity.low++;

    if (!alertCountsByCategory[cat]) alertCountsByCategory[cat] = 0;
    alertCountsByCategory[cat]++;
  }

  // 3) DOCUMENT PRESENCE — from vendor_documents
  const docRows = await sql`
    SELECT document_type
    FROM vendor_documents
    WHERE org_id = ${orgId} AND vendor_id = ${vendorId};
  `;

  const docTypes = new Set(
    docRows.map((d) => (d.document_type || "").toLowerCase())
  );

  const hasW9 = docTypes.has("w9");
  const hasLicense = docTypes.has("license");
  const hasContract = docTypes.has("contract");
  const hasEndorsement = docTypes.has("endorsement");
  const hasBinder = docTypes.has("binder");
  const hasEntityCert =
    docTypes.has("entity_certificate") ||
    docTypes.has("entity") ||
    docTypes.has("good_standing");

  // Simple doc health score — moderate mode
  let docScore = 100;
  if (!hasW9) docScore -= 10;
  if (!hasLicense) docScore -= 8;
  if (!hasContract) docScore -= 6;
  if (!hasEndorsement) docScore -= 4;
  if (!hasEntityCert) docScore -= 3;

  docScore = Math.max(0, Math.min(100, docScore));

  // 4) FUSED SCORE (Rule + Alerts + Doc Health)
  // Weighted blend: 60% rule engine, 25% alerts, 15% docs
  const fused =
    0.6 * ruleScore + 0.25 * alertScore + 0.15 * docScore;

  const fusedScore = Math.max(0, Math.min(100, Math.round(fused)));
  const tier = computeTierFromScore(fusedScore);

  return {
    orgId,
    vendorId,
    scores: {
      ruleScore,
      alertScore,
      docScore,
      fusedScore,
    },
    tier,
    alerts: {
      countsBySeverity: alertCountsBySeverity,
      countsByCategory: alertCountsByCategory,
      total: alertRows.length,
    },
    documents: {
      docTypes: Array.from(docTypes),
      hasW9,
      hasLicense,
      hasContract,
      hasEndorsement,
      hasBinder,
      hasEntityCert,
    },
  };
}
