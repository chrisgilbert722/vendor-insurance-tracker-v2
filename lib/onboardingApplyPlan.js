// lib/onboardingApplyPlan.js
// Applies the AI onboarding plan returned by the CSV interpreter.
// Inserts vendors, policies, renewal schedules, alerts, requirements, missing-doc tasks.

import { sql } from "./db";
import { insertAlertV2Safe } from "./alertsV2Engine";
import { RENEWAL_STAGES, runRenewalForSchedule } from "./renewalEngineV2";

/**
 * onboardingApplyPlan
 *
 * Input:
 *  {
 *    orgId: string,
 *    payload: {
 *      vendors: [...],
 *      requirements: [...],
 *      missingDocuments: [...],
 *      columns: {...}
 *    }
 *  }
 *
 * Output:
 *  {
 *    ok: true,
 *    summary: { vendorCount, policyCount, scheduleCount, requirementCount, missingDocCount }
 *  }
 */

export async function onboardingApplyPlan({ orgId, payload }) {
  if (!orgId) throw new Error("orgId is required");
  if (!payload) throw new Error("payload missing");

  let vendorCount = 0;
  let policyCount = 0;
  let scheduleCount = 0;
  let requirementCount = 0;
  let missingDocCount = 0;

  //
  // 1. INSERT VENDORS
  //
  const vendorIdMap = {}; 
  for (const v of payload.vendors) {
    const inserted = await sql`
      INSERT INTO vendors (
        org_id,
        name,
        email,
        address,
        industry,
        risk_tier,
        created_at
      )
      VALUES (
        ${orgId},
        ${v.name || null},
        ${v.email || null},
        ${v.address || null},
        ${v.industry || null},
        ${v.riskTier || null},
        NOW()
      )
      RETURNING id;
    `;
    const vendorId = inserted[0].id;
    vendorIdMap[v.name] = vendorId;
    vendorCount++;
  }

  //
  // 2. INSERT POLICIES + RENEWAL SCHEDULES
  //
  for (const v of payload.vendors) {
    const vendorId = vendorIdMap[v.name];

    for (const p of v.policies || []) {
      const insertedPolicy = await sql`
        INSERT INTO policies (
          org_id,
          vendor_id,
          coverage_type,
          created_at
        )
        VALUES (
          ${orgId},
          ${vendorId},
          ${p.policyType},
          NOW()
        )
        RETURNING id;
      `;
      const policyId = insertedPolicy[0].id;
      policyCount++;

      const expDate = p.expirationDate ? new Date(p.expirationDate) : null;

      const schedule = await sql`
        INSERT INTO policy_renewal_schedule (
          org_id,
          vendor_id,
          policy_id,
          coverage_type,
          expiration_date,
          next_check_at,
          last_checked_at,
          last_stage,
          status,
          created_at
        )
        VALUES (
          ${orgId},
          ${vendorId},
          ${policyId},
          ${p.policyType},
          ${expDate},
          NOW(),       -- run renewal logic immediately
          NULL,
          NULL,
          'active',
          NOW()
        )
        RETURNING *;
      `;
      const scheduleRow = schedule[0];
      scheduleCount++;

      if (scheduleRow.expiration_date) {
        await runRenewalForSchedule(scheduleRow);
      }
    }
  }

  //
  // 3. APPLY AI-INFERRED REQUIREMENTS
  //
  for (const r of payload.requirements || []) {
    // Save them as "AI Suggested Rules"
    await sql`
      INSERT INTO rule_engine (
        org_id,
        label,
        coverage_type,
        min_limits,
        required_for,
        industries,
        notes,
        source,
        created_at
      )
      VALUES (
        ${orgId},
        ${r.label || r.coverageCode},
        ${r.coverageCode},
        ${r.minLimits || null},
        ${r.requiredFor || "all_vendors"},
        ${r.industries ? JSON.stringify(r.industries) : "[]"},
        ${r.notes || null},
        'ai_onboarding',
        NOW()
      );
    `;
    requirementCount++;
  }

  //
  // 4. CREATE ALERTS FOR MISSING DOCUMENTS
  //
  for (const m of payload.missingDocuments || []) {
    const vendorId = vendorIdMap[m.vendorName];

    await insertAlertV2Safe({
      orgId,
      vendorId,
      type: "missing_doc",
      severity: m.severity || "medium",
      category: "documents",
      message: `Missing ${m.coverageCode}: ${m.reason}`,
      metadata: {
        coverageCode: m.coverageCode,
        reason: m.reason
      }
    });

    missingDocCount++;
  }

  return {
    ok: true,
    summary: {
      vendorCount,
      policyCount,
      scheduleCount,
      requirementCount,
      missingDocCount
    }
  };
}
