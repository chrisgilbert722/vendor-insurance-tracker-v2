// ============================================================
// ONBOARDING AUTOPILOT — START / RESUME (NEON SAFE, DATA-GATED)
// - org_onboarding_state.org_id = INTERNAL org INT
// - organizations.onboarding_step = UI driver (DATA-GATED)
// - Users ALWAYS start at Step 1 until uploads exist
// - Resume-safe for returning users
// ============================================================

import { sql } from "@db";
import { resolveOrg } from "@resolveOrg";

export const config = {
  api: { bodyParser: { sizeLimit: "1mb" } },
};

const MAX_RUNTIME_MS = 60_000;

/**
 * BACKEND AUTOPILOT STEPS (NOT UI STEPS)
 */
const STEPS = [
  { key: "vendors_created", progress: 10 },
  { key: "vendors_analyzed", progress: 25 },
  { key: "contracts_extracted", progress: 40 },
  { key: "requirements_assigned", progress: 55 },
  { key: "rules_generated", progress: 70 },
  { key: "rules_applied", progress: 85 },
  { key: "launch_system", progress: 95 },
  { key: "complete", progress: 100 },
];

// ------------------------------------------------------------
// STATE HELPERS
// ------------------------------------------------------------
async function ensureStateRow(orgId) {
  await sql`
    INSERT INTO org_onboarding_state (
      org_id, status, current_step, progress, started_at, updated_at
    )
    VALUES (${orgId}, 'running', 'starting', 0, NOW(), NOW())
    ON CONFLICT (org_id) DO NOTHING;
  `;
}

async function getState(orgId) {
  const rows = await sql`
    SELECT *
    FROM org_onboarding_state
    WHERE org_id = ${orgId}
    LIMIT 1;
  `;
  return rows?.[0] || null;
}

async function setState(orgId, patch = {}) {
  await sql`
    UPDATE org_onboarding_state
    SET
      status = ${patch.status ?? "running"},
      current_step = ${patch.current_step ?? "starting"},
      progress = ${patch.progress ?? 0},
      last_error = ${patch.last_error ?? null},
      finished_at = ${patch.finished_at ?? null},
      updated_at = NOW()
    WHERE org_id = ${orgId};
  `;
}

async function setOrgStep(orgId, onboardingStep) {
  await sql`
    UPDATE organizations
    SET onboarding_step = ${onboardingStep}
    WHERE id = ${orgId};
  `;
}

// ------------------------------------------------------------
// DATA GATE — PREVENTS STEP SKIPPING
// ------------------------------------------------------------
async function computeForcedUiStep(orgId) {
  try {
    const uploads = await sql`
      SELECT 1 FROM vendor_uploads
      WHERE org_id = ${orgId}
      LIMIT 1;
    `;
    if (!uploads.length) return 1;
  } catch {
    return 1;
  }

  try {
    const vendors = await sql`
      SELECT 1 FROM vendors
      WHERE org_id = ${orgId}
      LIMIT 1;
    `;
    if (!vendors.length) return 2;
  } catch {
    return 2;
  }

  try {
    const mappings = await sql`
      SELECT 1 FROM vendor_column_mappings
      WHERE org_id = ${orgId}
      LIMIT 1;
    `;
    if (!mappings.length) return 3;
  } catch {
    return 3;
  }

  return null;
}

const UI_TO_DB_STEP = {
  1: 0,
  2: 1,
  3: 2,
};

// ------------------------------------------------------------
// AUTOPILOT EXECUTION
// ------------------------------------------------------------
async function runStep({ stepKey, orgId }) {
  switch (stepKey) {
    case "vendors_created":
      await import("../onboarding/create-vendors.js").catch(() => {});
      break;

    case "vendors_analyzed":
      await import("../onboarding-api/analyze-csv.js").catch(() => {});
      break;

    case "contracts_extracted":
      await import("../onboarding/ai-contract-extract.js").catch(() => {});
      break;

    case "requirements_assigned":
      await import("../onboarding/assign-requirements.js").catch(() => {});
      break;

    // ✅ FIXED IMPORT (RENAMED FILE)
    case "rules_generated":
      await import("../onboarding/ai-rule-engine.js").catch(() => {});
      break;

    case "rules_applied":
      await import("../onboarding/apply-rules-v5.js").catch(() => {});
      break;

    case "launch_system": {
      const org = await sql`
        SELECT legal_name, contact_email
        FROM organizations
        WHERE id = ${orgId}
        LIMIT 1;
      `;
      if (!org?.[0]?.legal_name || !org?.[0]?.contact_email) return "BLOCKED";
      await import("../onboarding/launch-system.js").catch(() => {});
      break;
    }

    case "complete":
      await sql`
        UPDATE organizations
        SET onboarding_completed = TRUE,
            dashboard_tutorial_enabled = TRUE,
            onboarding_step = ${STEPS.length + 1}
        WHERE id = ${orgId};
      `;
      break;
  }
}

// ------------------------------------------------------------
// MAIN HANDLER
// ------------------------------------------------------------
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  const startedAt = Date.now();

  try {
    const orgId = await resolveOrg(req, res);
    if (!orgId) return res.status(200).json({ ok: true });

    await ensureStateRow(orgId);

    const forcedUiStep = await computeForcedUiStep(orgId);

    if (forcedUiStep !== null) {
      const dbStep = UI_TO_DB_STEP[forcedUiStep] ?? 0;

      await setOrgStep(orgId, dbStep);
      await setState(orgId, {
        status: "running",
        current_step: "data_gate",
        progress: 0,
      });

      return res.status(200).json({
        ok: true,
        forcedUiStep,
        onboarding_step: dbStep,
      });
    }

    const state = await getState(orgId);
    if (state?.status === "complete") {
      return res.status(200).json({ ok: true, state });
    }

    const startIndex = Math.max(
      0,
      STEPS.findIndex((s) => s.key === state?.current_step)
    );

    for (let i = startIndex; i < STEPS.length; i++) {
      if (Date.now() - startedAt > MAX_RUNTIME_MS) break;

      const step = STEPS[i];

      await setOrgStep(orgId, i + 2);
      await setState(orgId, {
        status: step.key === "complete" ? "complete" : "running",
        current_step: step.key,
        progress: step.progress,
        finished_at: step.key === "complete" ? new Date() : null,
      });

      if (step.key === "complete") break;

      const result = await runStep({ stepKey: step.key, orgId });
      if (result === "BLOCKED") break;
    }

    return res.status(200).json({
      ok: true,
      state: await getState(orgId),
    });
  } catch (err) {
    console.error("[onboarding/start]", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Onboarding failed",
    });
  }
}
