// pages/api/admin/audit-log.js
// Audit log endpoint - system_timeline and vendor_activity_log tables do not exist yet
// Returns empty events array until tables are created

import { resolveOrg } from "@resolveOrg";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "GET only" });
    }

    // 🔒 Resolve UUID -> INT
    const orgId = await resolveOrg(req, res);
    if (!orgId) return;

    const { page = "1", pageSize = "50" } = req.query;
    const limit = Math.min(200, Math.max(10, Number(pageSize) || 50));

    // system_timeline and vendor_activity_log tables do not exist
    // Return empty events array
    return res.status(200).json({
      ok: true,
      page: Number(page),
      pageSize: limit,
      hasMore: false,
      events: [],
    });
  } catch (err) {
    console.error("[audit-log]", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
