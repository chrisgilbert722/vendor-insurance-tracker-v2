// pages/api/alerts-v2/top-types.js
// ============================================================
// ALERT TOP TYPES — ENTERPRISE SAFE
// - ALWAYS 200
// - ALWAYS items:[]
// - NEVER throws
// ============================================================

import { getTopAlertTypesV2 } from "../../../lib/alertsV2Engine";
import { cleanUUID } from "../../../lib/uuid";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(200).json({
      ok: false,
      items: [],
      error: "GET only",
    });
  }

  try {
    const orgId = cleanUUID(req.query.orgId);
    const limit = Math.max(1, Math.min(50, Number(req.query.limit || 8)));

    // HARD SKIP — dashboard safety
    if (!orgId) {
      return res.status(200).json({
        ok: true,
        items: [],
        meta: { skipped: true },
      });
    }

    const raw = await getTopAlertTypesV2(orgId, limit);

    // HARD NORMALIZATION
    const items = Array.isArray(raw) ? raw : [];

    return res.status(200).json({
      ok: true,
      items,
    });
  } catch (err) {
    console.error("[alerts-v2/top-types] ERROR:", err);

    // NEVER break dashboard
    return res.status(200).json({
      ok: false,
      items: [],
    });
  }
}
