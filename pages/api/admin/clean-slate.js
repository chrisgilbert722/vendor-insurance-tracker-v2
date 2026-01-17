// pages/api/admin/clean-slate.js
// ============================================================
// CLEAN SLATE RESET — Complete org deletion for testing
// - Deletes ALL org data
// - Deletes org_members entries
// - Deletes the organization itself
// - Leaves Supabase auth user intact
// - User will be in "no org" state after this
// ============================================================

import { sql } from "@db";
import { resolveOrg } from "@resolveOrg";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    const orgId = await resolveOrg(req, res);
    if (!orgId) {
      return res.status(400).json({ ok: false, error: "Org not resolved" });
    }

    const results = [];

    // Helper: safe delete (skips if table doesn't exist)
    async function safeDelete(tableName, query) {
      try {
        const result = await query;
        results.push({ table: tableName, status: "deleted", count: result?.count || 0 });
      } catch (err) {
        if (err.message?.includes("does not exist")) {
          results.push({ table: tableName, status: "skipped (table not found)" });
        } else {
          results.push({ table: tableName, status: "error", error: err.message });
        }
      }
    }

    // Get vendor IDs first (for cascade deletes)
    let vendorIds = [];
    try {
      const vendorRows = await sql`SELECT id FROM vendors WHERE org_id = ${orgId}`;
      vendorIds = vendorRows.map((v) => v.id);
    } catch {}

    // Get rule group IDs (for cascade deletes)
    let ruleGroupIds = [];
    try {
      const groupRows = await sql`SELECT id FROM requirements_groups_v2 WHERE org_id = ${orgId}`;
      ruleGroupIds = groupRows.map((g) => g.id);
    } catch {}

    // Get rule_groups IDs (V3)
    let ruleGroupV3Ids = [];
    try {
      const groupV3Rows = await sql`SELECT id FROM rule_groups WHERE org_id = ${orgId}`;
      ruleGroupV3Ids = groupV3Rows.map((g) => g.id);
    } catch {}

    // ==========================================
    // DELETE ALL ORG-SCOPED DATA
    // ==========================================

    // 1. Alerts
    await safeDelete("alerts", sql`DELETE FROM alerts WHERE org_id = ${orgId}`);
    await safeDelete("alerts_v2", sql`DELETE FROM alerts_v2 WHERE org_id = ${orgId}`);

    // 2. Compliance / Engine results
    await safeDelete("compliance_evaluations", sql`DELETE FROM compliance_evaluations WHERE org_id = ${orgId}`);
    await safeDelete("vendor_compliance_cache", sql`DELETE FROM vendor_compliance_cache WHERE org_id = ${orgId}`);
    if (vendorIds.length > 0) {
      await safeDelete("engine_results", sql`DELETE FROM engine_results WHERE vendor_id = ANY(${vendorIds})`);
    }
    await safeDelete("engine_rules_v5", sql`DELETE FROM engine_rules_v5 WHERE org_id = ${orgId}`);

    // 3. Timeline events
    await safeDelete("system_timeline", sql`DELETE FROM system_timeline WHERE org_id = ${orgId}`);
    await safeDelete("compliance_event_ledger", sql`DELETE FROM compliance_event_ledger WHERE org_id = ${orgId}`);
    if (vendorIds.length > 0) {
      await safeDelete("vendor_timeline", sql`DELETE FROM vendor_timeline WHERE vendor_id = ANY(${vendorIds})`);
    }

    // 4. Renewal data
    await safeDelete("policy_renewal_schedule", sql`DELETE FROM policy_renewal_schedule WHERE org_id = ${orgId}`);
    if (vendorIds.length > 0) {
      await safeDelete("renewal_predictions", sql`DELETE FROM renewal_predictions WHERE vendor_id = ANY(${vendorIds})`);
    }

    // 5. Vendor portal tokens
    await safeDelete("vendor_portal_tokens", sql`DELETE FROM vendor_portal_tokens WHERE org_id = ${orgId}`);

    // 6. Documents and certificates
    await safeDelete("vendor_documents", sql`DELETE FROM vendor_documents WHERE org_id = ${orgId}`);
    if (vendorIds.length > 0) {
      await safeDelete("certificates", sql`DELETE FROM certificates WHERE vendor_id = ANY(${vendorIds})`);
      await safeDelete("documents", sql`DELETE FROM documents WHERE vendor_id = ANY(${vendorIds})`);
    }

    // 7. Policies
    await safeDelete("policies", sql`DELETE FROM policies WHERE org_id = ${orgId}`);

    // 8. Vendors
    await safeDelete("vendors", sql`DELETE FROM vendors WHERE org_id = ${orgId}`);

    // 9. Rules (V2)
    if (ruleGroupIds.length > 0) {
      await safeDelete("requirements_rules_v2", sql`DELETE FROM requirements_rules_v2 WHERE group_id = ANY(${ruleGroupIds})`);
    }
    await safeDelete("requirements_groups_v2", sql`DELETE FROM requirements_groups_v2 WHERE org_id = ${orgId}`);

    // 10. Rules (V3)
    if (ruleGroupV3Ids.length > 0) {
      await safeDelete("rules_v3", sql`DELETE FROM rules_v3 WHERE group_id = ANY(${ruleGroupV3Ids})`);
    }
    await safeDelete("rule_groups", sql`DELETE FROM rule_groups WHERE org_id = ${orgId}`);

    // 11. Templates
    await safeDelete("templates", sql`DELETE FROM templates WHERE org_id = ${orgId}`);

    // 12. AI activity logs
    await safeDelete("ai_activity_log", sql`DELETE FROM ai_activity_log WHERE org_id = ${orgId}`);

    // 13. Dashboard metrics
    await safeDelete("dashboard_metrics", sql`DELETE FROM dashboard_metrics WHERE org_id = ${orgId}`);

    // 14. Onboarding state
    await safeDelete("org_onboarding_state", sql`DELETE FROM org_onboarding_state WHERE org_id = ${orgId}`);

    // 15. Webhooks / Integrations
    await safeDelete("webhooks", sql`DELETE FROM webhooks WHERE org_id = ${orgId}`);
    await safeDelete("api_keys", sql`DELETE FROM api_keys WHERE org_id = ${orgId}`);

    // ==========================================
    // DELETE ORG MEMBERSHIP AND ORG ITSELF
    // ==========================================

    // 16. Delete org_members (removes user association)
    await safeDelete("org_members", sql`DELETE FROM org_members WHERE org_id = ${orgId}`);
    await safeDelete("organization_members", sql`DELETE FROM organization_members WHERE org_id = ${orgId}`);

    // 17. Delete the organization itself
    await safeDelete("organizations", sql`DELETE FROM organizations WHERE id = ${orgId}`);

    return res.status(200).json({
      ok: true,
      message: "Clean slate complete - org deleted entirely",
      deletedOrgId: orgId,
      results,
      nextSteps: [
        "Clear localStorage in browser: localStorage.clear()",
        "Refresh page - user will be in 'no org' state",
        "User can create a new org via onboarding",
      ],
    });
  } catch (err) {
    console.error("[clean-slate] error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
