// pages/api/onboarding/start.js
// ============================================================
// ONBOARDING AUTOPILOT RUNNER (ORG)
// - Single endpoint: click Start once -> system configures itself
// - Uses org_onboarding_state as the source of truth
// - UI-safe: returns ok quickly and never crashes the app
//
// NOTE: This runs sequentially in-request.
// For huge orgs later we can move to a queue/cron worker,
// but this is the clean, correct first version.
// ============================================================

import { sql } from "../../../lib/db";
import { resolveOrg } from "../../../lib/resolveOrg";

async function setState(orgId, patch = {}) {
  const status = patch.status ?? null;
  const step = patch.current_step ?? null;
  const progress = patch.progress ?? null;
  const lastError = patch.last_error ?? null;

  await sql`
    INSERT INTO org_onboarding_state (org_id, status, current_step, progress, started_at, updated_at)
    VALUES (${orgId}, COALESCE(${status}, 'running'), COALESCE(${step}, 'vendors'), COALESCE(${progress}, 0), NOW(), NOW())
    ON CONFLICT (org_id) DO UPDATE SET
      status = COALESCE(${status}, org_onboarding_state.status),
      current_step = COALESCE(${step}, org_onboarding_state.current_step),
      progress = COALESCE(${progress}, org_onboarding_state.progress),
      last_error = COALESCE(${lastError}, org_onboarding_state.last_error),
      updated_at = NOW();
  `;
}

async function markCompleted(orgId) {
  await sql`
    UPDATE org_onboarding_state
    SET status = 'completed',
        current_step = 'completed',
        progress = 100,
        last_error = NULL,
        completed_at = NOW(),
        updated_at = NOW()
    WHERE org_id = ${orgId};
  `;
}

async function markFailed(orgId, errMsg) {
  await sql`
    UPDATE org_onboarding_state
    SET status = 'failed',
        last_error = ${errMsg || "Onboarding failed"},
        updated_at = NOW()
    WHERE org_id = ${orgId};
  `;
}

/** Step 1: Ensure org exists, ensure at least one vendor exists (optional seed) */
async function stepVendors(orgId) {
  // If org has zero vendors, create a safe demo vendor so dashboards are not empty.
  const vendors = await sql`SELECT id FROM vendors WHERE org_id = ${orgId} LIMIT 1;`;
  if (vendors?.length) return;

  await sql`
    INSERT INTO vendors (org_id, vendor_name, created_at)
    VALUES (${orgId}, 'Test Vendor', NOW());
  `;
}

/** Step 2: Seed default requirement groups if none exist */
async function stepSeedGroups(orgId) {
  const groups = await sql`
    SELECT id FROM requirements_groups_v2
    WHERE org_id = ${orgId}
    LIMIT 1;
  `;
  if (groups?.length) return;

  // Minimal, sensible defaults (can be expanded later)
  const defaults = [
    { name: "General Liability", description: "Baseline GL requirements", order_index: 1 },
    { name: "Workers Comp", description: "Workers compensation requirements", order_index: 2 },
    { name: "Auto Liability", description: "Auto liability requirements", order_index: 3 },
    { name: "Umbrella", description: "Umbrella / excess coverage", order_index: 4 },
  ];

  for (const g of defaults) {
    await sql`
      INSERT INTO requirements_groups_v2 (org_id, name, description, is_active, order_index, created_at, updated_at)
      VALUES (${orgId}, ${g.name}, ${g.description}, TRUE, ${g.order_index}, NOW(), NOW());
    `;
  }
}

/** Step 3: Seed baseline rules if none exist */
async function stepSeedRules(orgId) {
  const rules = await sql`
    SELECT id FROM requirements_rules_v2
    WHERE org_id = ${orgId}
    LIMIT 1;
  `;
  if (rules?.length) return;

  // Attach rules to groups by name (safe lookup)
  const groupRows = await sql`
    SELECT id, name
    FROM requirements_groups_v2
    WHERE org_id = ${orgId};
  `;

  const byName = Object.fromEntries((groupRows || []).map((g) => [g.name, g.id]));
  const glGroupId = byName["General Liability"] || null;
  const wcGroupId = byName["Workers Comp"] || null;

  // Very minimal rules to make engine meaningful immediately
  // (Adjust columns here only if your schema differs)
  if (glGroupId) {
    await sql`
      INSERT INTO requirements_rules_v2
        (org_id, group_id, name, severity, is_active, created_at, updated_at)
      VALUES
        (${orgId}, ${glGroupId}, 'GL required', 'high', TRUE, NOW(), NOW());
    `;
  }

  if (wcGroupId) {
    await sql`
      INSERT INTO requirements_rules_v2
        (org_id, group_id, name, severity, is_active, created_at, updated_at)
      VALUES
        (${orgId}, ${wcGroupId}, 'WC required', 'high', TRUE, NOW(), NOW());
    `;
  }
}

/** Step 4: “Launch” = mark onboarding complete (later: run scan + create alerts + schedule renewals) */
async function stepLaunch(orgId) {
  // Placeholder for now: once you confirm your scan/alerts endpoints are stable,
  // we will call them here (server-side).
  return;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const orgId = await resolveOrg(req, res);
  if (!orgId) return;

  try {
    // If already completed, do nothing
    const existing = await sql`
      SELECT status FROM org_onboarding_state
      WHERE org_id = ${orgId}
      LIMIT 1;
    `;

    if (existing?.[0]?.status === "completed") {
      return res.status(200).json({ ok: true, status: "completed" });
    }

    // Mark running
    await setState(orgId, { status: "running", current_step: "vendors", progress: 5 });

    // Step 1: Vendors
    await setState(orgId, { current_step: "vendors", progress: 15 });
    await stepVendors(orgId);

    // Step 2: Groups
    await setState(orgId, { current_step: "requirements_groups", progress: 40 });
    await stepSeedGroups(orgId);

    // Step 3: Rules
    await setState(orgId, { current_step: "requirements_rules", progress: 65 });
    await stepSeedRules(orgId);

    // Step 4: Launch
    await setState(orgId, { current_step: "launch", progress: 90 });
    await stepLaunch(orgId);

    // Completed
    await markCompleted(orgId);

    return res.status(200).json({
      ok: true,
      status: "completed",
    });
  } catch (err) {
    console.error("[onboarding/start] ERROR:", err);
    await markFailed(orgId, err?.message || "Onboarding failed");
    // UI-safe response
    return res.status(200).json({
      ok: true,
      status: "failed",
      error: "Onboarding failed. Check org_onboarding_state.last_error.",
    });
  }
}
