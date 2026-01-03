// ============================================================
// ONBOARDING AUTOPILOT — START / RESUME (NEON SAFE, DATA-GATED)
// - org_onboarding_state.org_id = INTERNAL org INT
// - organizations.onboarding_step = UI driver (but must be data-gated)
// - NO sql.identifier (Neon incompatible)
// - idempotent + resume-safe
// - IMPORTANT: Users must stay at Step 1 until uploads exist
// ============================================================

import { sql } from "../../../lib/db";
import { resolveOrg } from "../../../lib/resolveOrg";

export const config = {
  api: { bodyParser: { sizeLimit: "1mb" } },
};

const HEARTBEAT_EVERY_MS = 1500;
const MAX_RUNTIME_MS = 60_000;

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

// ✅ NEON SAFE: no sql.identifier, no dynamic column building
async function setState(orgId, patch = {}) {
  const status = patch.status ?? "running";
  const current_step = patch.current_step ?? "starting";
  const progress = patch.progress ?? 0;
  const last_error = patch.last_error ?? null;
  const finished_at = patch.finished_at ?? null;

  await sql`
    UPDATE org_onboarding_state
    SET
      status = ${status},
      current_step = ${current_step},
      progress = ${progress},
      last_error = ${last_error},
      finished_at = ${finished_at},
      updated_at = NOW()
    WHERE org_id = ${orgId};
  `;
}

async function setOrgStep(orgId, stepIndex) {
  await sql`
    UPDATE organizations
    SET onboarding_step = ${stepIndex}
    WHERE id = ${orgId};
  `;
}

// ------------------------------------------------------------
// DATA GATE (CRITICAL): decide what step is allowed based on data
// ------------------------------------------------------------
// Goal:
// - If NO uploads exist → force Step 1 (start screen)
// - If uploads exist but no parsed vendors yet → Step 2 (upload step)
// - If vendors exist but mappings missing → Step 3 (map step)
// - Otherwise allow normal autopilot progression
async function computeForcedUiStep(orgId) {
  // 1) Do we have any vendor uploads?
  // NOTE: If your table name differs, change only this query.
  const uploads = await sql`
    SELECT 1
    FROM vendor_uploads
    WHERE org_id = ${orgId}
    LIMIT 1;
  `;
  if (!uploads.length) return 1; // ✅ always show Step 1 until uploads exist

  // 2) Do we have vendors created/parsed?
  const vendors = await sql`
    SELECT 1
    FROM vendors
    WHERE org_id = ${orgId}
    LIMIT 1;
  `;
  if (!vendors.length) return 2;

  // 3) Do we have mappings saved?
  const mappings = await sql`
    SELECT 1
    FROM vendor_column_mappings
    WHERE org_id = ${orgId}
    LIMIT 1;
  `;
  if (!mappings.length) return 3;

  // Otherwise: no forced step
  return null;
}

// ------------------------------------------------------------
// STEP EXECUTION (SAFE IMPORTS)
// ------------------------------------------------------------
async function runStep({ stepKey, startedAtMs, req, orgId }) {
  if (Date.now() - startedAtMs > MAX_RUNTIME_MS) {
    throw new Error("Autopilot timed out");
  }

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

    case "rules_generated":
      await import("../onboarding/ai-wizard.js").catch(() => {});
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

      if (!org?.[0]?.legal_name || !org?.[0]?.contact_email) {
        return "BLOCKED";
      }

      await import("../onboarding/launch-system.js").catch(() => {});
      break;
    }

    case "complete":
      await sql`
        UPDATE organizations
        SET
          onboarding_completed = TRUE,
          dashboard_tutorial_enabled = TRUE,
          onboarding_step = ${STEPS.length + 1}
        WHERE id = ${orgId};
      `;
      break;
  }

  return null;
}

// ------------------------------------------------------------
// MAIN HANDLER
// ------------------------------------------------------------
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  const startedAtMs = Date.now();

  try {
    const orgId = await resolveOrg(req, res);
    if (!orgId) return res.status(200).json({ ok: true, skipped: true });

    await ensureStateRow(orgId);

    // ✅ HARD DATA GATE: force correct UI step before running anything
    const forced = await computeForcedUiStep(orgId);
    if (forced !== null) {
      // Align org step to your UI mapping:
      // Your UI shows Start screen when onboarding_step is 0/1-ish.
      // We store forced steps directly as onboarding_step for clarity.
      await setOrgStep(orgId, forced);
      await setState(orgId, {
        status: "running",
        current_step: forced === 1 ? "starting" : "data_gate",
        progress: forced === 1 ? 0 : 5,
        last_error: null,
        finished_at: null,
      });

      return res.status(200).json({
        ok: true,
        forcedStep: forced,
        reason: "Data-gated (uploads/vendors/mappings)",
        state: await getState(orgId),
      });
    }

    const existing = await getState(orgId);

    if (existing?.status === "complete") {
      return res.status(200).json({ ok: true, skipped: true, state: existing });
    }

    const startIndex = Math.max(
      0,
      STEPS.findIndex((s) => s.key === existing?.current_step)
    );

    let lastHeartbeat = 0;

    for (let i = startIndex; i < STEPS.length; i++) {
      const step = STEPS[i];

      await setOrgStep(orgId, i + 2);
      await setState(orgId, {
        status: step.key === "complete" ? "complete" : "running",
        current_step: step.key,
        progress: step.progress,
        finished_at: step.key === "complete" ? new Date() : null,
        last_error: null,
      });

      if (step.key === "complete") break;

      if (Date.now() - lastHeartbeat > HEARTBEAT_EVERY_MS) {
        lastHeartbeat = Date.now();
      }

      const result = await runStep({
        stepKey: step.key,
        startedAtMs,
        req,
        orgId,
      });

      if (result === "BLOCKED") break;
    }

    return res.status(200).json({
      ok: true,
      state: await getState(orgId),
    });
  } catch (err) {
    console.error("[onboarding/start]", err);

    try {
      const orgId = await resolveOrg(req, res);
      if (orgId) {
        await setState(orgId, {
          status: "error",
          last_error: err.message,
        });
      }
    } catch {}

    return res.status(500).json({
      ok: false,
      error: err.message || "Onboarding failed",
    });
  }
}
