// pages/api/onboarding/start.js
// ============================================================
// ONBOARDING AUTOPILOT — START / RESUME (Observable Autopilot)
// - Server-side orchestrator
// - org_onboarding_state = detailed telemetry
// - organizations.onboarding_step = UI step driver
// - UUID-safe (resolveOrg)
// ============================================================

import { sql } from "../../../lib/db";
import { resolveOrg } from "../../../lib/resolveOrg";

export const config = {
  api: { bodyParser: { sizeLimit: "1mb" } },
};

// ---- Tunables
const HEARTBEAT_EVERY_MS = 1500;
const MAX_RUNTIME_MS = 60_000;

// Ordered autopilot steps
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
// Helpers
// ------------------------------------------------------------
async function ensureStateRow(orgUuid) {
  await sql`
    INSERT INTO org_onboarding_state (
      org_id, status, current_step, progress, started_at, updated_at
    )
    VALUES (
      ${orgUuid}, 'running', 'starting', 0,
      NOW(), NOW()
    )
    ON CONFLICT (org_id) DO NOTHING;
  `;
}

async function setState(orgUuid, patch = {}) {
  const fields = [];

  const add = (col, val) => {
    fields.push(sql`${sql.identifier([col])} = ${val}`);
  };

  if (patch.status !== undefined) add("status", patch.status);
  if (patch.current_step !== undefined) add("current_step", patch.current_step);
  if (patch.progress !== undefined) add("progress", patch.progress);
  if (patch.last_error !== undefined) add("last_error", patch.last_error);
  if (patch.finished_at !== undefined) add("finished_at", patch.finished_at);

  add("updated_at", new Date().toISOString());

  if (!fields.length) return;

  await sql`
    UPDATE org_onboarding_state
    SET ${sql.join(fields, sql`, `)}
    WHERE org_id = ${orgUuid};
  `;
}

async function getState(orgUuid) {
  const rows = await sql`
    SELECT *
    FROM org_onboarding_state
    WHERE org_id = ${orgUuid}
    LIMIT 1;
  `;
  return rows?.[0] || null;
}

// 🔑 THIS IS THE MISSING PIECE
async function setOrgStep(orgIdInt, stepIndex) {
  await sql`
    UPDATE organizations
    SET onboarding_step = ${stepIndex}
    WHERE id = ${orgIdInt};
  `;
}

// ------------------------------------------------------------
// Step execution (safe + optional)
// ------------------------------------------------------------
async function runStep({ stepKey, orgUuid, startedAtMs }) {
  if (Date.now() - startedAtMs > MAX_RUNTIME_MS) {
    throw new Error("Autopilot timed out");
  }

  try {
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
        await import("../onboarding/ai-generate-rules.js").catch(() => {});
        break;
      case "rules_applied":
        await import("../onboarding/apply-rules-v5.js").catch(() => {});
        break;
      case "launch_system":
        await import("../onboarding/launch-system.js").catch(() => {});
        break;
      default:
        break;
    }
  } catch {
    // Non-fatal: onboarding should continue
  }
}

// ------------------------------------------------------------
// Main handler
// ------------------------------------------------------------
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  const startedAtMs = Date.now();

  try {
    // UUID → INT (server only)
    const orgIdInt = await resolveOrg(req, res);
    if (!orgIdInt) return;

    const orgUuid = String(req.body?.orgId || req.query?.orgId || "").trim();
    if (!orgUuid) {
      return res.status(400).json({ ok: false, error: "Missing orgId" });
    }

    await ensureStateRow(orgUuid);

    const existing = await getState(orgUuid);

    // Resume support
    const startIndex = Math.max(
      0,
      STEPS.findIndex((s) => s.key === existing?.current_step)
    );

    let lastHeartbeat = 0;

    for (let i = startIndex; i < STEPS.length; i++) {
      const step = STEPS[i];

      // 🔑 ADVANCE WIZARD UI (THIS FIXES THE STUCK STEP)
      await setOrgStep(orgIdInt, i + 2); // UI step mapping

      await setState(orgUuid, {
        current_step: step.key,
        progress: step.progress,
        status: step.key === "complete" ? "complete" : "running",
        ...(step.key === "complete"
          ? { finished_at: new Date().toISOString() }
          : {}),
      });

      if (step.key === "complete") break;

      if (Date.now() - lastHeartbeat > HEARTBEAT_EVERY_MS) {
        lastHeartbeat = Date.now();
      }

      await runStep({
        stepKey: step.key,
        orgUuid,
        startedAtMs,
      });
    }

    return res.status(200).json({
      ok: true,
      state: await getState(orgUuid),
    });
  } catch (err) {
    console.error("[onboarding/start]", err);

    try {
      const orgUuid = String(req.body?.orgId || "").trim();
      if (orgUuid) {
        await setState(orgUuid, {
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
