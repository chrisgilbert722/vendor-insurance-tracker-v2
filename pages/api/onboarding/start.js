// pages/api/onboarding/start.js
// ============================================================
// ONBOARDING AUTOPILOT — START / RESUME (Observable Autopilot)
// - org_onboarding_state.org_id = INTERNAL org INT
// - organizations.onboarding_step = UI step driver
// - external_uuid resolved once via resolveOrg
// - idempotent + resume-safe
// - rules_generated -> AI Wizard
// - launch_system guarded by Company Profile
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
  { key: "launch_system", progress: 95 }, // ⛔ guarded
  { key: "complete", progress: 100 },
];

// ------------------------------------------------------------
// STATE HELPERS (INT orgId ONLY)
// ------------------------------------------------------------
async function ensureStateRow(orgIdInt) {
  await sql`
    INSERT INTO org_onboarding_state (
      org_id, status, current_step, progress, started_at, updated_at
    )
    VALUES (
      ${orgIdInt}, 'running', 'starting', 0,
      NOW(), NOW()
    )
    ON CONFLICT (org_id) DO NOTHING;
  `;
}

async function setState(orgIdInt, patch = {}) {
  const fields = [];
  const add = (col, val) => fields.push(sql`${sql.identifier([col])} = ${val}`);

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
    WHERE org_id = ${orgIdInt};
  `;
}

async function getState(orgIdInt) {
  const rows = await sql`
    SELECT *
    FROM org_onboarding_state
    WHERE org_id = ${orgIdInt}
    LIMIT 1;
  `;
  return rows?.[0] || null;
}

async function setOrgStep(orgIdInt, stepIndex) {
  await sql`
    UPDATE organizations
    SET onboarding_step = ${stepIndex}
    WHERE id = ${orgIdInt};
  `;
}

// ------------------------------------------------------------
// STEP EXECUTION
// ------------------------------------------------------------
async function runStep({ stepKey, startedAtMs, req, orgIdInt }) {
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

      case "rules_generated": {
        try {
          const mod = await import("../onboarding/ai-wizard.js");
          await mod.default(
            {
              method: "POST",
              body: { vendorCsv: [] },
              query: { orgId: String(req.body?.orgId || req.query?.orgId || "") },
            },
            { status: () => ({ json: () => {} }), json: () => {} }
          );
        } catch (err) {
          console.error("[autopilot] AI Wizard failed:", err);
        }
        break;
      }

      case "rules_applied":
        await import("../onboarding/apply-rules-v5.js").catch(() => {});
        break;

      case "launch_system": {
        // 🔒 COMPANY PROFILE HUMAN GATE
        const org = await sql`
          SELECT legal_name, contact_email
          FROM organizations
          WHERE id = ${orgIdInt}
          LIMIT 1;
        `;

        if (!org?.[0]?.legal_name || !org?.[0]?.contact_email) {
          // ⛔ Stop autopilot until profile saved
          return "BLOCKED";
        }

        await import("../onboarding/launch-system.js").catch(() => {});
        break;
      }

      default:
        break;
    }
  } catch {
    // Non-fatal
  }
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
    const orgIdInt = await resolveOrg(req, res);
    if (!orgIdInt) return res.status(200).json({ ok: true, skipped: true });

    await ensureStateRow(orgIdInt);
    const existing = await getState(orgIdInt);

    if (
      existing?.status === "running" &&
      existing?.current_step &&
      existing.current_step !== "starting"
    ) {
      return res.status(200).json({ ok: true, skipped: true, state: existing });
    }

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

      await setOrgStep(orgIdInt, i + 2);
      await setState(orgIdInt, {
        current_step: step.key,
        progress: step.progress,
        status: step.key === "complete" ? "complete" : "running",
        ...(step.key === "complete"
          ? { finished_at: new Date().toISOString() }
          : {}),
      });

      if (step.key === "complete") break;
      if (Date.now() - lastHeartbeat > HEARTBEAT_EVERY_MS) lastHeartbeat = Date.now();

      const result = await runStep({
        stepKey: step.key,
        startedAtMs,
        req,
        orgIdInt,
      });

      if (result === "BLOCKED") break;
    }

    return res.status(200).json({
      ok: true,
      state: await getState(orgIdInt),
    });
  } catch (err) {
    console.error("[onboarding/start]", err);

    try {
      const orgIdInt = await resolveOrg(req, res);
      if (orgIdInt) {
        await setState(orgIdInt, {
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
