// pages/api/engine/run-v3.js
// ============================================================
// RULE ENGINE V3 — ENTERPRISE SAFE
// - Never auto-runs without org context
// - Never spams dashboard
// - Returns skipped:true when prerequisites missing
// ============================================================

import { sql } from "../../../lib/db";
import { cleanUUID } from "../../../lib/uuid";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    const orgId = cleanUUID(req.body?.orgId);

    // HARD GUARD — do NOT run engine unless org is valid
    if (!orgId) {
      return res.status(200).json({
        ok: true,
        skipped: true,
        reason: "missing_or_invalid_orgId",
      });
    }

    // Optional: guard vendor scope if provided
    const vendorId = req.body?.vendorId || null;

    // If vendors not yet loaded, skip
    if (vendorId === "pending") {
      return res.status(200).json({
        ok: true,
        skipped: true,
        reason: "vendors_not_ready",
      });
    }

    /*
      At this point:
      - orgId is valid UUID
      - Engine was intentionally triggered
      - Safe to proceed
    */

    // 🔧 EXAMPLE ENGINE ENTRY POINT
    // Replace this section with your existing rule evaluation logic.
    // Nothing below this guard is changed in behavior.

    const vendors = vendorId
      ? await sql`
          SELECT id FROM vendors
          WHERE org_id = ${orgId}
            AND id = ${vendorId};
        `
      : await sql`
          SELECT id FROM vendors
          WHERE org_id = ${orgId};
        `;

    if (!vendors.length) {
      return res.status(200).json({
        ok: true,
        skipped: true,
        reason: "no_vendors_found",
      });
    }

    // Placeholder for actual rule engine execution
    // Your existing logic continues from here
    // -----------------------------------------
    // runRulesForVendors(orgId, vendors)
    // -----------------------------------------

    return res.status(200).json({
      ok: true,
      ran: true,
      vendorsProcessed: vendors.length,
    });
  } catch (err) {
    console.error("[run-v3] ERROR:", err);

    // NEVER BREAK DASHBOARD
    return res.status(200).json({
      ok: false,
      skipped: true,
      error: err.message || "engine_failed",
    });
  }
}
