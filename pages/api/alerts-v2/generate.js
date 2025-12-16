// pages/api/alerts-v2/generate.js
// ============================================================
// ALERT GENERATE — ENTERPRISE SAFE
// - NEVER throws
// - NEVER auto-runs engine
// - POST only
// - Dashboard-safe
// ============================================================

import { cleanUUID } from "../../../lib/uuid";

export default async function handler(req, res) {
  // HARD CONTRACT — never crash UI
  if (req.method !== "POST") {
    return res.status(200).json({
      ok: false,
      skipped: true,
      message: "POST only",
    });
  }

  try {
    const orgId = cleanUUID(req.body?.orgId);

    // HARD SKIP — missing org context
    if (!orgId) {
      return res.status(200).json({
        ok: true,
        skipped: true,
        message: "No orgId — generation skipped",
      });
    }

    // 🚨 STABILIZATION MODE 🚨
    // We intentionally do NOT run the engine here.
    // This prevents crashes, infinite loops, and side effects.
    // Engine execution will be re-enabled once platform is stable.

    return res.status(200).json({
      ok: true,
      skipped: true,
      message: "Generation temporarily disabled for stabilization",
    });
  } catch (err) {
    console.error("[alerts-v2/generate] ERROR:", err);

    // NEVER break dashboard
    return res.status(200).json({
      ok: false,
      skipped: true,
      message: "Generate failed safely",
    });
  }
}
