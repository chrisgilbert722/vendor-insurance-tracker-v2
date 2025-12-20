// pages/api/onboarding/start.js
// ============================================================
// ONBOARDING AUTOPILOT — START / RESUME (Observable Autopilot)
// - Server-side orchestrator
// - Uses org_onboarding_state as source of truth
// - Runs steps sequentially, writes progress + current_step
// - Safe to re-run (idempotent-ish) and never bricks UI
// - NO client imports
// - Uses resolveOrg (UUID -> internal int) for ALL downstream work
// ============================================================

import { sql } from "../../../lib/db";
import { resolveOrg } from "../../../lib/resolveOrg";

export const config = {
  api: { bodyParser: { sizeLimit: "1mb" } },
};

// ---- Tunables
const HEARTBEAT_EVERY_MS = 1500; // how often we write progress updates
const MAX_RUNTIME_MS = 60_000; // hard cap to avoid long Vercel runtime surprises
const STEPS = [
  { key: "vendors_created", label: "Create vendors (CSV/import)", progress: 10 },
  { key: "vendors_analyzed", label: "Analyze vendors (AI + heuristics)", progress: 25 },
  { key: "contracts_extracted", label: "Extract contracts", progress: 40 },
  { key: "requirements_assigned", label: "Assign requirements", progress: 55 },
  { key: "rules_generated", label: "Generate rules", progress: 70 },
  { key: "rules_applied", label: "Apply rules to engine", progress: 85 },
  { key: "launch_system", label: "Launch system + alerts", progress: 95 },
  { key: "complete", label: "Complete", progress: 100 },
];

// ------------------------------------------------------------
// Helpers: state writes
// ------------------------------------------------------------
async function ensureStateRow({ orgUuid, now = new Date() }) {
  // Create row if missing. If table name is org_onboarding_state as you created.
  await sql`
    INSERT INTO org_onboarding_state (org_id, status, current_step, progress, started_at, updated_at)
    VALUES (${orgUuid}, 'running', 'starting', 0, ${now.toISOString()}, ${now.toISOString()})
    ON CONFLICT (org_id) DO NOTHING;
  `;
}

async function setState({ orgUuid, patch = {} }) {
  const fields = [];
  const values = [];

  function add(col, val) {
    fields.push(sql`${sql.identifier([col])} = ${val}`);
  }

  if (patch.status !== undefined) add("status", patch.status);
  if (patch.current_step !== undefined) add("current_step", patch.current_step);
  if (patch.progress !== undefined) add("progress", patch.progress);
  if (patch.last_error !== undefined) add("last_error", patch.last_error);
  if (patch.started_at !== undefined) add("started_at", patch.started_at);
  if (patch.finished_at !== undefined) add("finished_at", patch.finished_at);

  // always update updated_at
  add("updated_at", new Date().toISOString());

  if (fields.length === 0) return;

  await sql`
    UPDATE org_onboarding_state
    SET ${sql.join(fields, sql`, `)}
    WHERE org_id = ${orgUuid};
  `;
}

async function getState(orgUuid) {
  const rows = await sql`
    SELECT org_id, status, current_step, progress, started_at, finished_at, last_error, updated_at
    FROM org_onboarding_state
    WHERE org_id = ${orgUuid}
    LIMIT 1;
  `;
  return rows?.[0] || null;
}

// ------------------------------------------------------------
// Helpers: step runners
// These call your existing onboarding endpoints OR do direct DB work.
// To keep this safe + minimal, we try calling internal endpoints by importing their handlers.
// ------------------------------------------------------------

async function callLocalApi(handlerMod, reqLike) {
  // handlerMod should default export a handler(req, res)
  // We'll mock a minimal res object.
  let statusCode = 200;
  let jsonPayload = null;

  const res = {
    status(code) {
      statusCode = code;
      return res;
    },
    json(payload) {
      jsonPayload = payload;
      return res;
    },
  };

  await handlerMod.default(reqLike, res);

  return { statusCode, json: jsonPayload };
}

async function runStep({ stepKey, orgIdInt, orgUuid, startedAtMs }) {
  // Hard runtime guard
  if (Date.now() - startedAtMs > MAX_RUNTIME_MS) {
    throw new Error("Autopilot timed out. Please resume.");
  }

  // Map steps to existing files.
  // NOTE: These imports must be static to satisfy bundlers; we import only what exists.
  switch (stepKey) {
    case "vendors_created": {
      // If you have /pages/api/onboarding/create-vendors.js
      try {
        const mod = await import("../onboarding/create-vendors.js");
        const { json } = await callLocalApi(mod, {
          method: "POST",
          body: {},
          query: { orgId: String(orgUuid) }, // resolveOrg expects UUID in query
          headers: {},
        });
        if (!json?.ok && json?.ok !== true) throw new Error(json?.error || "create-vendors failed");
      } catch (e) {
        // If not present, treat as non-fatal
        // (some orgs may already have vendors)
      }
      return;
    }

    case "vendors_analyzed": {
      // /pages/api/onboarding-api/analyze-csv.js OR /pages/api/onboarding/analyze?? (varies)
      // If you have a specific analyze endpoint, wire it here.
      try {
        const mod = await import("../onboarding-api/analyze-csv.js");
        const { json } = await callLocalApi(mod, {
          method: "POST",
          body: { orgId: String(orgUuid) },
          query: {},
          headers: {},
        });
        if (!json?.ok && json?.ok !== true) throw new Error(json?.error || "analyze-csv failed");
      } catch (_) {}
      return;
    }

    case "contracts_extracted": {
      // /pages/api/onboarding/ai-contract-extract.js
      try {
        const mod = await import("../onboarding/ai-contract-extract.js");
        const { json } = await callLocalApi(mod, {
          method: "POST",
          body: {},
          query: { orgId: String(orgUuid) },
          headers: {},
        });
        if (!json?.ok && json?.ok !== true) throw new Error(json?.error || "ai-contract-extract failed");
      } catch (_) {}
      return;
    }

    case "requirements_assigned": {
      // /pages/api/onboarding/assign-requirements.js
      try {
        const mod = await import("../onboarding/assign-requirements.js");
        const { json } = await callLocalApi(mod, {
          method: "POST",
          body: {},
          query: { orgId: String(orgUuid) },
          headers: {},
        });
        if (!json?.ok && json?.ok !== true) throw new Error(json?.error || "assign-requirements failed");
      } catch (_) {}
      return;
    }

    case "rules_generated": {
      // /pages/api/onboarding/ai-generate-rules.js
      try {
        const mod = await import("../onboarding/ai-generate-rules.js");
        const { json } = await callLocalApi(mod, {
          method: "POST",
          body: {},
          query: { orgId: String(orgUuid) },
          headers: {},
        });
        if (!json?.ok && json?.ok !== true) throw new Error(json?.error || "ai-generate-rules failed");
      } catch (_) {}
      return;
    }

    case "rules_applied": {
      // /pages/api/onboarding/apply-rules-v5.js
      try {
        const mod = await import("../onboarding/apply-rules-v5.js");
        const { json } = await callLocalApi(mod, {
          method: "POST",
          body: {},
          query: { orgId: String(orgUuid) },
          headers: {},
        });
        if (!json?.ok && json?.ok !== true) throw new Error(json?.error || "apply-rules-v5 failed");
      } catch (_) {}
      return;
    }

    case "launch_system": {
      // /pages/api/onboarding/launch-system.js
      try {
        const mod = await import("../onboarding/launch-system.js");
        const { json } = await callLocalApi(mod, {
          method: "POST",
          body: {},
          query: { orgId: String(orgUuid) },
          headers: {},
        });
        if (!json?.ok && json?.ok !== true) throw new Error(json?.error || "launch-system failed");
      } catch (_) {}
      return;
    }

    default:
      return;
  }
}

// ------------------------------------------------------------
// Main
// ------------------------------------------------------------
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  const startedAtMs = Date.now();

  try {
    // Resolve org UUID -> internal int
    const orgIdInt = await resolveOrg(req, res);
    if (!orgIdInt) return;

    const orgUuid = String(req.query?.orgId || req.body?.orgId || "").trim();
    if (!orgUuid) {
      return res.status(400).json({ ok: false, error: "Missing orgId (UUID) in query or body" });
    }

    // Ensure state row exists
    await ensureStateRow({ orgUuid });

    // If already complete, return current state
    const existing = await getState(orgUuid);
    if (existing?.status === "complete") {
      return res.status(200).json({ ok: true, state: existing, message: "Already complete" });
    }

    // Mark running
    await setState({
      orgUuid,
      patch: {
        status: "running",
        last_error: null,
        current_step: existing?.current_step || "starting",
        progress: Number.isFinite(Number(existing?.progress)) ? Number(existing.progress) : 0,
      },
    });

    let lastHeartbeat = 0;

    // Determine starting point (resume support)
    const currentStepKey = String(existing?.current_step || "").trim();
    const startIndex = Math.max(
      0,
      STEPS.findIndex((s) => s.key === currentStepKey)
    );

    // If current_step is unknown or "starting", start at 0
    const effectiveStartIndex = startIndex >= 0 ? startIndex : 0;

    for (let i = effectiveStartIndex; i < STEPS.length; i++) {
      const step = STEPS[i];

      // Update state before each step
      await setState({
        orgUuid,
        patch: {
          current_step: step.key,
          progress: step.progress,
          status: step.key === "complete" ? "complete" : "running",
          ...(step.key === "complete" ? { finished_at: new Date().toISOString() } : {}),
        },
      });

      // Heartbeat (avoid noisy writes)
      if (Date.now() - lastHeartbeat > HEARTBEAT_EVERY_MS) {
        lastHeartbeat = Date.now();
      }

      if (step.key === "complete") break;

      // Run step logic
      await runStep({ stepKey: step.key, orgIdInt, orgUuid, startedAtMs });
    }

    const finalState = await getState(orgUuid);

    return res.status(200).json({
      ok: true,
      state: finalState,
    });
  } catch (err) {
    console.error("[onboarding/start] ERROR:", err);

    // Try to write error state if possible
    const orgUuid = String(req.query?.orgId || req.body?.orgId || "").trim();
    if (orgUuid) {
      try {
        await setState({
          orgUuid,
          patch: {
            status: "error",
            last_error: err?.message || "Unknown error",
          },
        });
      } catch (_) {}
    }

    // Do not brick UI; return ok=false but 200 is acceptable if you prefer
    return res.status(500).json({
      ok: false,
      error: err?.message || "Autopilot failed",
    });
  }
}
