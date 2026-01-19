// pages/api/admin/reset-org.js
// ============================================================
// FULL ORG RESET — OPTION B
// Deletes ALL org-scoped data, resets org state and billing
// KEEPS: organization row, org_members, Supabase auth user
// ============================================================

import { sql } from "../../../lib/db";
import { resolveOrg } from "../../../lib/server/resolveOrg";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    const orgId = await resolveOrg(req, res);
    if (!orgId) {
      return res.status(400).json({ ok: false, error: "Org not resolved" });
    }

    console.log(`[reset-org] Starting FULL ORG RESET for org ${orgId}`);

    // Helper: safe delete with console log
    async function clearTable(tableName, query) {
      try {
        const result = await query;
        const count = result?.count || result?.length || 0;
        console.log(`[reset-org] CLEARED: ${tableName} (${count} rows)`);
        return { table: tableName, status: "cleared", count };
      } catch (err) {
        if (err.message?.includes("does not exist")) {
          console.log(`[reset-org] SKIPPED: ${tableName} (table not found)`);
          return { table: tableName, status: "skipped" };
        }
        console.log(`[reset-org] ERROR: ${tableName} - ${err.message}`);
        return { table: tableName, status: "error", error: err.message };
      }
    }

    // ==========================================
    // PHASE 1: Collect IDs for cascade deletes
    // ==========================================

    let vendorIds = [];
    try {
      const rows = await sql`SELECT id FROM vendors WHERE org_id = ${orgId}`;
      vendorIds = rows.map((v) => v.id);
      console.log(`[reset-org] Found ${vendorIds.length} vendors to delete`);
    } catch {
      console.log(`[reset-org] No vendors found`);
    }

    let policyIds = [];
    try {
      const rows = await sql`SELECT id FROM policies WHERE org_id = ${orgId}`;
      policyIds = rows.map((p) => p.id);
      console.log(`[reset-org] Found ${policyIds.length} policies to delete`);
    } catch {
      console.log(`[reset-org] No policies found`);
    }

    let ruleGroupIds = [];
    try {
      const rows = await sql`SELECT id FROM rule_groups WHERE org_id = ${orgId}`;
      ruleGroupIds = rows.map((g) => g.id);
    } catch {}

    let ruleGroupV2Ids = [];
    try {
      const rows = await sql`SELECT id FROM requirements_groups_v2 WHERE org_id = ${orgId}`;
      ruleGroupV2Ids = rows.map((g) => g.id);
    } catch {}

    // ==========================================
    // PHASE 2: DELETE ALL ORG-SCOPED DATA
    // ==========================================

    // --- ALERTS ---
    await clearTable("alerts", sql`DELETE FROM alerts WHERE org_id = ${orgId}`);
    await clearTable("alerts_v2", sql`DELETE FROM alerts_v2 WHERE org_id = ${orgId}`);

    // --- EVALUATIONS / COMPLIANCE ---
    await clearTable("compliance_evaluations", sql`DELETE FROM compliance_evaluations WHERE org_id = ${orgId}`);
    await clearTable("compliance_events", sql`DELETE FROM compliance_events WHERE org_id = ${orgId}`);
    await clearTable("compliance_event_ledger", sql`DELETE FROM compliance_event_ledger WHERE org_id = ${orgId}`);
    if (vendorIds.length > 0) {
      await clearTable("vendor_compliance_cache", sql`DELETE FROM vendor_compliance_cache WHERE vendor_id = ANY(${vendorIds})`);
      await clearTable("engine_results", sql`DELETE FROM engine_results WHERE vendor_id = ANY(${vendorIds})`);
    }

    // --- RULE ENGINE STATE ---
    await clearTable("engine_rules_v5", sql`DELETE FROM engine_rules_v5 WHERE org_id = ${orgId}`);
    await clearTable("rule_engine", sql`DELETE FROM rule_engine WHERE org_id = ${orgId}`);
    if (ruleGroupIds.length > 0) {
      await clearTable("rules_v3", sql`DELETE FROM rules_v3 WHERE group_id = ANY(${ruleGroupIds})`);
    }
    await clearTable("rule_groups", sql`DELETE FROM rule_groups WHERE org_id = ${orgId}`);
    if (ruleGroupV2Ids.length > 0) {
      await clearTable("requirements_rules_v2", sql`DELETE FROM requirements_rules_v2 WHERE group_id = ANY(${ruleGroupV2Ids})`);
    }
    await clearTable("requirements_groups_v2", sql`DELETE FROM requirements_groups_v2 WHERE org_id = ${orgId}`);

    // --- TIMELINES ---
    await clearTable("system_timeline", sql`DELETE FROM system_timeline WHERE org_id = ${orgId}`);
    if (vendorIds.length > 0) {
      await clearTable("vendor_timeline", sql`DELETE FROM vendor_timeline WHERE vendor_id = ANY(${vendorIds})`);
      await clearTable("vendor_activity_log", sql`DELETE FROM vendor_activity_log WHERE vendor_id = ANY(${vendorIds})`);
    }

    // --- RENEWALS ---
    await clearTable("policy_renewal_schedule", sql`DELETE FROM policy_renewal_schedule WHERE org_id = ${orgId}`);
    if (vendorIds.length > 0) {
      await clearTable("renewal_predictions", sql`DELETE FROM renewal_predictions WHERE vendor_id = ANY(${vendorIds})`);
    }
    await clearTable("renewal_email_queue", sql`DELETE FROM renewal_email_queue WHERE org_id = ${orgId}`);

    // --- UPLOADS / DOCUMENTS ---
    await clearTable("vendor_documents", sql`DELETE FROM vendor_documents WHERE org_id = ${orgId}`);
    if (vendorIds.length > 0) {
      await clearTable("certificates", sql`DELETE FROM certificates WHERE vendor_id = ANY(${vendorIds})`);
      await clearTable("documents", sql`DELETE FROM documents WHERE vendor_id = ANY(${vendorIds})`);
    }

    // --- VENDOR PORTAL ---
    await clearTable("vendor_portal_tokens", sql`DELETE FROM vendor_portal_tokens WHERE org_id = ${orgId}`);

    // --- POLICIES ---
    await clearTable("policies", sql`DELETE FROM policies WHERE org_id = ${orgId}`);

    // --- VENDORS ---
    await clearTable("vendors", sql`DELETE FROM vendors WHERE org_id = ${orgId}`);

    // --- TEMPLATES ---
    await clearTable("templates", sql`DELETE FROM templates WHERE org_id = ${orgId}`);

    // --- AI / AUDIT LOGS ---
    await clearTable("ai_activity_log", sql`DELETE FROM ai_activity_log WHERE org_id = ${orgId}`);
    await clearTable("audit_log", sql`DELETE FROM audit_log WHERE org_id = ${orgId}`);

    // --- ONBOARDING STATE ---
    await clearTable("org_onboarding_state", sql`DELETE FROM org_onboarding_state WHERE org_id = ${orgId}`);

    // --- DASHBOARD METRICS ---
    await clearTable("dashboard_metrics", sql`DELETE FROM dashboard_metrics WHERE org_id = ${orgId}`);

    // --- WEBHOOKS / INTEGRATIONS ---
    await clearTable("webhooks", sql`DELETE FROM webhooks WHERE org_id = ${orgId}`);
    await clearTable("webhook_deliveries", sql`DELETE FROM webhook_deliveries WHERE org_id = ${orgId}`);
    await clearTable("api_keys", sql`DELETE FROM api_keys WHERE org_id = ${orgId}`);

    // --- CRON HEARTBEATS ---
    await clearTable("cron_renewals_heartbeat", sql`DELETE FROM cron_renewals_heartbeat WHERE org_id = ${orgId}`);

    // ==========================================
    // PHASE 3: RESET ORGANIZATION STATE
    // ==========================================

    console.log(`[reset-org] Resetting organization state...`);

    try {
      await sql`
        UPDATE organizations
        SET
          onboarding_completed = FALSE,
          onboarding_step = 0,
          first_vendor_uploaded = FALSE,
          setup_completed_at = NULL,
          stripe_customer_id = NULL,
          stripe_subscription_id = NULL,
          trial_started_at = NULL,
          trial_expires_at = NULL,
          billing_status = 'none',
          dashboard_tutorial_enabled = FALSE
        WHERE id = ${orgId}
      `;
      console.log(`[reset-org] RESET: organizations (full state reset)`);
    } catch (err) {
      // Some columns might not exist - try subset
      console.log(`[reset-org] Full reset failed, trying subset: ${err.message}`);
      try {
        await sql`
          UPDATE organizations
          SET
            onboarding_completed = FALSE,
            onboarding_step = 0,
            stripe_customer_id = NULL,
            stripe_subscription_id = NULL,
            trial_started_at = NULL,
            trial_expires_at = NULL
          WHERE id = ${orgId}
        `;
        console.log(`[reset-org] RESET: organizations (subset reset)`);
      } catch (err2) {
        console.log(`[reset-org] ERROR: organizations reset failed - ${err2.message}`);
      }
    }

    // ==========================================
    // PHASE 4: VERIFY RESET
    // ==========================================

    const [org] = await sql`
      SELECT
        onboarding_completed,
        onboarding_step,
        stripe_customer_id,
        trial_started_at
      FROM organizations
      WHERE id = ${orgId}
    `;

    console.log(`[reset-org] VERIFICATION:`, {
      onboarding_completed: org?.onboarding_completed,
      onboarding_step: org?.onboarding_step,
      stripe_customer_id: org?.stripe_customer_id,
      trial_started_at: org?.trial_started_at,
    });

    console.log(`[reset-org] ========================================`);
    console.log(`[reset-org] FULL ORG RESET COMPLETE for org ${orgId}`);
    console.log(`[reset-org] ========================================`);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[reset-org] FATAL ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
