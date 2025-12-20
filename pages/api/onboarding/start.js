// pages/api/onboarding/start.js
// ============================================================
// AUTOPILOT ONBOARDING — START / RESUME
// Safe • Idempotent • Non-blocking
// ============================================================

import { sql } from "../../../lib/db";
import { resolveOrg } from "../../../lib/resolveOrg";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    // 🔒 Resolve org (UUID → internal UUID, already safe)
    const orgId = await resolveOrg(req, res);
    if (!orgId) return;

    // ----------------------------------------------------------
    // 1) Ensure onboarding state row exists
    // ----------------------------------------------------------
    const rows = await sql`
      INSERT INTO org_onboarding_state (org_id)
      VALUES (${orgId})
      ON CONFLICT (org_id) DO UPDATE
        SET updated_at = NOW()
      RETURNING *;
    `;

    const state = rows[0];

    // ----------------------------------------------------------
    // 2) Guard against double execution
    // ----------------------------------------------------------
    if (state.execution_status === "running") {
      return res.status(200).json({
        ok: true,
        status: "already-running",
        message: "Onboarding already in progress",
      });
    }

    // ----------------------------------------------------------
    // 3) Mark onboarding as running
    // ----------------------------------------------------------
    await sql`
      UPDATE org_onboarding_state
      SET
        execution_status = 'running',
        last_error = NULL,
        last_run_at = NOW(),
        updated_at = NOW()
      WHERE org_id = ${orgId};
    `;

    // ----------------------------------------------------------
    // 4) Fire-and-forget execution (NON-BLOCKING)
    // ----------------------------------------------------------
    // IMPORTANT:
    // We intentionally do NOT await this.
    // UI returns instantly.
    runAutopilot(orgId).catch((err) => {
      console.error("[onboarding-autopilot] fatal:", err);
    });

    return res.status(200).json({
      ok: true,
      status: "started",
    });
  } catch (err) {
    console.error("[onboarding/start] ERROR:", err);
    return res.status(200).json({
      ok: false,
      error: "Failed to start onboarding",
    });
  }
}

/* ============================================================
   AUTOPILOT EXECUTION (SERVER-SIDE ONLY)
============================================================ */

async function runAutopilot(orgId) {
  try {
    // STEP 1 — Create vendors (CSV / defaults)
    await sql`
      UPDATE org_onboarding_state
      SET current_step = 1, updated_at = NOW()
      WHERE org_id = ${orgId};
    `;
    // TODO: call create-vendors logic

    // STEP 2 — Analyze vendors
    await sql`
      UPDATE org_onboarding_state
      SET current_step = 2, updated_at = NOW()
      WHERE org_id = ${orgId};
    `;
    // TODO: call vendors-analyze

    // STEP 3 — Generate rules
    await sql`
      UPDATE org_onboarding_state
      SET current_step = 3, updated_at = NOW()
      WHERE org_id = ${orgId};
    `;
    // TODO: call ai-generate-rules

    // STEP 4 — Assign requirements
    await sql`
      UPDATE org_onboarding_state
      SET current_step = 4, updated_at = NOW()
      WHERE org_id = ${orgId};
    `;
    // TODO: assign requirements

    // STEP 5 — Enable alerts & renewals
    await sql`
      UPDATE org_onboarding_state
      SET current_step = 5, updated_at = NOW()
      WHERE org_id = ${orgId};
    `;
    // TODO: schedule renewals

    // STEP 6 — Complete
    await sql`
      UPDATE org_onboarding_state
      SET
        current_step = 6,
        execution_status = 'completed',
        completed_at = NOW(),
        updated_at = NOW()
      WHERE org_id = ${orgId};
    `;
  } catch (err) {
    await sql`
      UPDATE org_onboarding_state
      SET
        execution_status = 'error',
        last_error = ${String(err.message || err)},
        updated_at = NOW()
      WHERE org_id = ${orgId};
    `;

    throw err;
  }
}
