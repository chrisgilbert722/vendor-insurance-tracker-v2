// pages/api/vendors/set-status.js
// ============================================================
// VENDOR STATUS API — Soft Delete / Reactivate
// - Admin only (server-side enforced)
// - PUT with vendorId and status ('active' or 'at_rest')
// - Replaces hard delete with soft delete
// - at_rest vendors remain in DB but excluded from metrics
// ============================================================

import { sql } from "@db";
import { resolveOrg } from "@resolveOrg";
import { requireAdmin } from "../../../lib/server/requireAdmin";

const VALID_STATUSES = ["active", "at_rest"];

export default async function handler(req, res) {
  if (req.method !== "PUT") {
    return res.status(405).json({ ok: false, error: "PUT only" });
  }

  try {
    const orgId = await resolveOrg(req, res);
    if (!orgId) {
      return res.status(400).json({ ok: false, error: "Missing orgId" });
    }

    // 🔒 Admin-only: server-side role check
    const adminCheck = await requireAdmin(req, orgId);
    if (!adminCheck.ok) {
      return res.status(403).json({
        ok: false,
        error: adminCheck.error || "Admin access required",
      });
    }

    const { vendorId, status } = req.body;

    if (!vendorId) {
      return res.status(400).json({ ok: false, error: "Missing vendorId" });
    }

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        ok: false,
        error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
      });
    }

    // Verify vendor belongs to this org
    const vendorCheck = await sql`
      SELECT id, name, status
      FROM vendors
      WHERE id = ${vendorId}
        AND org_id = ${orgId}
      LIMIT 1;
    `;

    if (!vendorCheck.length) {
      return res.status(404).json({ ok: false, error: "Vendor not found" });
    }

    const vendor = vendorCheck[0];
    const previousStatus = vendor.status;

    // Update status
    await sql`
      UPDATE vendors
      SET status = ${status}
      WHERE id = ${vendorId}
        AND org_id = ${orgId};
    `;

    return res.status(200).json({
      ok: true,
      message: `Vendor '${vendor.name}' status changed from '${previousStatus}' to '${status}'`,
      vendor: {
        id: vendorId,
        name: vendor.name,
        status,
        previousStatus,
      },
    });
  } catch (err) {
    console.error("[vendors/set-status] error:", err);
    return res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
}
