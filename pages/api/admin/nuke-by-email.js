// pages/api/admin/nuke-by-email.js
// ============================================================
// NUKE BY EMAIL — Full clean slate reset by user email
// Deletes ALL org data + org itself, keeps Supabase auth user
// User will be in "no org" state and can create fresh org
// ============================================================

import { sql } from "../../../lib/db";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  const { email } = req.body || {};

  if (!email) {
    return res.status(400).json({ ok: false, error: "Missing email" });
  }

  try {
    console.log(`[nuke-by-email] ========================================`);
    console.log(`[nuke-by-email] Starting NUKE for email: ${email}`);
    console.log(`[nuke-by-email] ========================================`);

    // ==========================================
    // STEP 1: Find user by email
    // ==========================================
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers();

    if (userError) {
      console.log(`[nuke-by-email] ERROR: Failed to list users - ${userError.message}`);
      return res.status(500).json({ ok: false, error: userError.message });
    }

    const user = userData.users.find(u => u.email === email);

    if (!user) {
      console.log(`[nuke-by-email] ERROR: User not found for email ${email}`);
      return res.status(404).json({ ok: false, error: "User not found" });
    }

    const userId = user.id;
    console.log(`[nuke-by-email] Found user: ${userId}`);

    // ==========================================
    // STEP 2: Find orgs owned by user
    // ==========================================
    let orgIds = [];
    try {
      const rows = await sql`
        SELECT org_id FROM organization_members WHERE user_id = ${userId}
      `;
      orgIds = rows.map(r => r.org_id);
    } catch {
      // Try alternate table name
      try {
        const rows = await sql`
          SELECT org_id FROM org_members WHERE user_id = ${userId}
        `;
        orgIds = rows.map(r => r.org_id);
      } catch {
        console.log(`[nuke-by-email] No org memberships found`);
      }
    }

    if (orgIds.length === 0) {
      console.log(`[nuke-by-email] User has no orgs - already clean`);
      return res.status(200).json({ ok: true, message: "User has no orgs" });
    }

    console.log(`[nuke-by-email] Found ${orgIds.length} org(s): ${orgIds.join(", ")}`);

    // ==========================================
    // STEP 3: Delete org-scoped data for each org
    // ==========================================

    for (const orgId of orgIds) {
      console.log(`[nuke-by-email] --- Processing org ${orgId} ---`);

      // Get vendor IDs for cascade deletes
      let vendorIds = [];
      try {
        const rows = await sql`SELECT id FROM vendors WHERE org_id = ${orgId}`;
        vendorIds = rows.map(v => v.id);
        console.log(`[nuke-by-email] Found ${vendorIds.length} vendors`);
      } catch {}

      // Get rule group IDs
      let ruleGroupIds = [];
      try {
        const rows = await sql`SELECT id FROM rule_groups WHERE org_id = ${orgId}`;
        ruleGroupIds = rows.map(g => g.id);
      } catch {}

      // Helper for safe delete with logging
      async function nuke(table, query) {
        try {
          await query;
          console.log(`[nuke-by-email] DELETED: ${table}`);
        } catch (err) {
          if (!err.message?.includes("does not exist")) {
            console.log(`[nuke-by-email] SKIP: ${table} - ${err.message}`);
          }
        }
      }

      // --- ALERTS ---
      await nuke("alerts", sql`DELETE FROM alerts WHERE org_id = ${orgId}`);
      await nuke("alerts_v2", sql`DELETE FROM alerts_v2 WHERE org_id = ${orgId}`);

      // --- COMPLIANCE / EVALUATIONS ---
      await nuke("compliance_evaluations", sql`DELETE FROM compliance_evaluations WHERE org_id = ${orgId}`);
      await nuke("compliance_events", sql`DELETE FROM compliance_events WHERE org_id = ${orgId}`);
      await nuke("compliance_event_ledger", sql`DELETE FROM compliance_event_ledger WHERE org_id = ${orgId}`);
      await nuke("evaluations", sql`DELETE FROM evaluations WHERE org_id = ${orgId}`);
      if (vendorIds.length > 0) {
        await nuke("vendor_compliance_cache", sql`DELETE FROM vendor_compliance_cache WHERE vendor_id = ANY(${vendorIds})`);
        await nuke("engine_results", sql`DELETE FROM engine_results WHERE vendor_id = ANY(${vendorIds})`);
      }

      // --- RULE ENGINE ---
      await nuke("engine_rules_v5", sql`DELETE FROM engine_rules_v5 WHERE org_id = ${orgId}`);
      await nuke("rule_engine", sql`DELETE FROM rule_engine WHERE org_id = ${orgId}`);
      if (ruleGroupIds.length > 0) {
        await nuke("rules_v3", sql`DELETE FROM rules_v3 WHERE group_id = ANY(${ruleGroupIds})`);
      }
      await nuke("rule_groups", sql`DELETE FROM rule_groups WHERE org_id = ${orgId}`);
      await nuke("requirements_rules_v2", sql`DELETE FROM requirements_rules_v2 WHERE org_id = ${orgId}`);
      await nuke("requirements_groups_v2", sql`DELETE FROM requirements_groups_v2 WHERE org_id = ${orgId}`);

      // --- TIMELINES ---
      await nuke("system_timeline", sql`DELETE FROM system_timeline WHERE org_id = ${orgId}`);
      if (vendorIds.length > 0) {
        await nuke("vendor_timeline", sql`DELETE FROM vendor_timeline WHERE vendor_id = ANY(${vendorIds})`);
        await nuke("vendor_activity_log", sql`DELETE FROM vendor_activity_log WHERE vendor_id = ANY(${vendorIds})`);
      }

      // --- RENEWALS ---
      await nuke("policy_renewal_schedule", sql`DELETE FROM policy_renewal_schedule WHERE org_id = ${orgId}`);
      await nuke("renewals", sql`DELETE FROM renewals WHERE org_id = ${orgId}`);
      if (vendorIds.length > 0) {
        await nuke("renewal_predictions", sql`DELETE FROM renewal_predictions WHERE vendor_id = ANY(${vendorIds})`);
      }
      await nuke("renewal_email_queue", sql`DELETE FROM renewal_email_queue WHERE org_id = ${orgId}`);

      // --- DOCUMENTS ---
      await nuke("vendor_documents", sql`DELETE FROM vendor_documents WHERE org_id = ${orgId}`);
      if (vendorIds.length > 0) {
        await nuke("certificates", sql`DELETE FROM certificates WHERE vendor_id = ANY(${vendorIds})`);
        await nuke("documents", sql`DELETE FROM documents WHERE vendor_id = ANY(${vendorIds})`);
      }

      // --- VENDOR PORTAL ---
      await nuke("vendor_portal_tokens", sql`DELETE FROM vendor_portal_tokens WHERE org_id = ${orgId}`);

      // --- POLICIES ---
      await nuke("policies", sql`DELETE FROM policies WHERE org_id = ${orgId}`);

      // --- VENDORS ---
      await nuke("vendors", sql`DELETE FROM vendors WHERE org_id = ${orgId}`);

      // --- TEMPLATES ---
      await nuke("templates", sql`DELETE FROM templates WHERE org_id = ${orgId}`);

      // --- LOGS ---
      await nuke("ai_activity_log", sql`DELETE FROM ai_activity_log WHERE org_id = ${orgId}`);
      await nuke("audit_log", sql`DELETE FROM audit_log WHERE org_id = ${orgId}`);
      await nuke("audit_logs", sql`DELETE FROM audit_logs WHERE org_id = ${orgId}`);

      // --- ONBOARDING ---
      await nuke("org_onboarding_state", sql`DELETE FROM org_onboarding_state WHERE org_id = ${orgId}`);

      // --- DASHBOARD ---
      await nuke("dashboard_metrics", sql`DELETE FROM dashboard_metrics WHERE org_id = ${orgId}`);

      // --- INTEGRATIONS ---
      await nuke("webhooks", sql`DELETE FROM webhooks WHERE org_id = ${orgId}`);
      await nuke("webhook_deliveries", sql`DELETE FROM webhook_deliveries WHERE org_id = ${orgId}`);
      await nuke("api_keys", sql`DELETE FROM api_keys WHERE org_id = ${orgId}`);

      // --- CRON ---
      await nuke("cron_renewals_heartbeat", sql`DELETE FROM cron_renewals_heartbeat WHERE org_id = ${orgId}`);

      // ==========================================
      // STEP 4: Delete org membership
      // ==========================================
      await nuke("organization_members", sql`DELETE FROM organization_members WHERE org_id = ${orgId}`);
      await nuke("org_members", sql`DELETE FROM org_members WHERE org_id = ${orgId}`);

      // ==========================================
      // STEP 5: Delete the organization itself
      // ==========================================
      await nuke("organizations", sql`DELETE FROM organizations WHERE id = ${orgId}`);

      console.log(`[nuke-by-email] --- Org ${orgId} NUKED ---`);
    }

    console.log(`[nuke-by-email] ========================================`);
    console.log(`[nuke-by-email] NUKE COMPLETE for ${email}`);
    console.log(`[nuke-by-email] User can now login and create fresh org`);
    console.log(`[nuke-by-email] ========================================`);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[nuke-by-email] FATAL ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
