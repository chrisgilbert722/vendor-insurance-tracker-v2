// pages/api/admin/reset-onboarding.js
// ============================================================
// ADMIN — RESET / REPLAY ONBOARDING
// - Admin only (server-side enforced)
// - Safe reset (no data deletion)
// ============================================================

import { sql } from "@db";
import { resolveOrg } from "@resolveOrg";
import { requireAdmin } from "../../../lib/server/requireAdmin";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false });
  }

  try {
    const orgIdInt = await resolveOrg(req, res);
    if (!orgIdInt) return res.status(200).json({ ok: true });

    // 🔒 Admin-only: server-side role check
    const adminCheck = await requireAdmin(req, orgIdInt);
    if (!adminCheck.ok) {
      return res.status(403).json({
        ok: false,
        error: adminCheck.error || "Admin access required",
      });
    }

    // Reset onboarding telemetry
    await sql`
      DELETE FROM org_onboarding_state
      WHERE org_id = ${orgIdInt};
    `;

    // Reset org flags
    await sql`
      UPDATE organizations
      SET
        onboarding_step = 1,
        dashboard_tutorial_enabled = FALSE
      WHERE id = ${orgIdInt};
    `;

    return res.status(200).json({
      ok: true,
      message: "Onboarding reset successfully",
    });
  } catch (err) {
    console.error("[reset-onboarding]", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
