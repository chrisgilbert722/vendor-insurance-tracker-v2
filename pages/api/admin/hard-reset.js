// pages/api/admin/hard-reset.js
// ============================================================
// HARD RESET — Org-scoped data only (SAFE)
// Deletes all org data but NOT users, orgs, or auth tables
// Skips tables that don't exist (no hard failures)
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

    const results = [];

    // Helper: safe delete (skips if table doesn't exist)
    async function safeDelete(tableName, query) {
      try {
        await query;
        results.push({ table: tableName, status: "deleted" });
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
    } catch {
      // No vendors table or no vendors
    }

    // Get rule group IDs (for cascade deletes)
    let ruleGroupIds = [];
    try {
      const groupRows = await sql`SELECT id FROM requirements_groups_v2 WHERE org_id = ${orgId}`;
      ruleGroupIds = groupRows.map((g) => g.id);
    } catch {
      // No rule groups table
    }

    // Get rule_groups IDs (V3)
    let ruleGroupV3Ids = [];
    try {
      const groupV3Rows = await sql`SELECT id FROM rule_groups WHERE org_id = ${orgId}`;
      ruleGroupV3Ids = groupV3Rows.map((g) => g.id);
    } catch {
      // No rule_groups table
    }

    // 1. Delete alerts
    await safeDelete("alerts", sql`DELETE FROM alerts WHERE org_id = ${orgId}`);
    await safeDelete("alerts_v2", sql`DELETE FROM alerts_v2 WHERE org_id = ${orgId}`);

    // 2. Delete evaluations / compliance results
    await safeDelete("compliance_evaluations", sql`DELETE FROM compliance_evaluations WHERE org_id = ${orgId}`);
    if (vendorIds.length > 0) {
      await safeDelete("engine_results", sql`DELETE FROM engine_results WHERE vendor_id = ANY(${vendorIds})`);
    }
    await safeDelete("engine_rules_v5", sql`DELETE FROM engine_rules_v5 WHERE org_id = ${orgId}`);

    // 3. Delete timeline events
    await safeDelete("system_timeline", sql`DELETE FROM system_timeline WHERE org_id = ${orgId}`);
    if (vendorIds.length > 0) {
      await safeDelete("vendor_timeline", sql`DELETE FROM vendor_timeline WHERE vendor_id = ANY(${vendorIds})`);
    }

    // 4. Delete renewal predictions
    if (vendorIds.length > 0) {
      await safeDelete("renewal_predictions", sql`DELETE FROM renewal_predictions WHERE vendor_id = ANY(${vendorIds})`);
    }

    // 5. Delete vendor portal tokens
    await safeDelete("vendor_portal_tokens", sql`DELETE FROM vendor_portal_tokens WHERE org_id = ${orgId}`);

    // 6. Delete documents and certificates
    await safeDelete("vendor_documents", sql`DELETE FROM vendor_documents WHERE org_id = ${orgId}`);
    if (vendorIds.length > 0) {
      await safeDelete("certificates", sql`DELETE FROM certificates WHERE vendor_id = ANY(${vendorIds})`);
      await safeDelete("documents", sql`DELETE FROM documents WHERE vendor_id = ANY(${vendorIds})`);
    }

    // 7. Delete policies
    await safeDelete("policies (by org)", sql`DELETE FROM policies WHERE org_id = ${orgId}`);
    if (vendorIds.length > 0) {
      await safeDelete("policies (by vendor)", sql`DELETE FROM policies WHERE vendor_id = ANY(${vendorIds})`);
    }

    // 8. Delete vendors
    await safeDelete("vendors", sql`DELETE FROM vendors WHERE org_id = ${orgId}`);

    // 9. Delete rules (V2)
    if (ruleGroupIds.length > 0) {
      await safeDelete("requirements_rules_v2", sql`DELETE FROM requirements_rules_v2 WHERE group_id = ANY(${ruleGroupIds})`);
    }
    await safeDelete("requirements_groups_v2", sql`DELETE FROM requirements_groups_v2 WHERE org_id = ${orgId}`);

    // 10. Delete rules (V3)
    if (ruleGroupV3Ids.length > 0) {
      await safeDelete("rules_v3", sql`DELETE FROM rules_v3 WHERE group_id = ANY(${ruleGroupV3Ids})`);
    }
    await safeDelete("rule_groups", sql`DELETE FROM rule_groups WHERE org_id = ${orgId}`);

    // 11. Delete templates
    await safeDelete("templates", sql`DELETE FROM templates WHERE org_id = ${orgId}`);

    // 12. Delete AI activity logs
    await safeDelete("ai_activity_log", sql`DELETE FROM ai_activity_log WHERE org_id = ${orgId}`);

    // 13. Reset onboarding state
    await safeDelete("org_onboarding_state", sql`DELETE FROM org_onboarding_state WHERE org_id = ${orgId}`);

    // 14. Reset organization flags (trial NOT started)
    try {
      await sql`
        UPDATE organizations
        SET
          onboarding_step = 0,
          onboarding_completed = FALSE,
          dashboard_tutorial_enabled = FALSE,
          trial_started_at = NULL,
          trial_expires_at = NULL,
          stripe_customer_id = NULL,
          stripe_subscription_id = NULL
        WHERE id = ${orgId}
      `;
      results.push({ table: "organizations", status: "reset" });
    } catch (err) {
      // Some columns might not exist - try minimal reset
      try {
        await sql`
          UPDATE organizations
          SET
            onboarding_step = 0,
            dashboard_tutorial_enabled = FALSE
          WHERE id = ${orgId}
        `;
        results.push({ table: "organizations", status: "reset (minimal)" });
      } catch (err2) {
        results.push({ table: "organizations", status: "error", error: err2.message });
      }
    }

    return res.status(200).json({
      ok: true,
      message: "Hard reset complete",
      orgId,
      results,
    });
  } catch (err) {
    console.error("[hard-reset] error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
