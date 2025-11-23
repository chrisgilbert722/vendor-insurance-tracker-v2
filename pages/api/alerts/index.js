// pages/api/alerts/index.js
// Enterprise Alerts API — backed by Neon (`public.alerts` + `vendors`)

import { sql } from "../../../lib/db";

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res
      .status(405)
      .json({ ok: false, error: "Method not allowed" });
  }

  try {
    const {
      orgId,
      vendorId,
      severity,
      status,
      search,
      cursor,   // ISO timestamp for pagination (load older than this)
      limit,
    } = req.query;

    // Basic, safe limit handling
    let pageSize = parseInt(Array.isArray(limit) ? limit[0] : limit, 10);
    if (Number.isNaN(pageSize) || pageSize <= 0) pageSize = DEFAULT_PAGE_SIZE;
    if (pageSize > MAX_PAGE_SIZE) pageSize = MAX_PAGE_SIZE;

    const orgIdInt =
      orgId && !Array.isArray(orgId) ? parseInt(orgId, 10) : null;
    const vendorIdInt =
      vendorId && !Array.isArray(vendorId) ? parseInt(vendorId, 10) : null;
    const severityFilter =
      severity && !Array.isArray(severity) ? String(severity) : null;
    const statusFilter =
      status && !Array.isArray(status) ? String(status) : null;
    const searchRaw =
      search && !Array.isArray(search) ? String(search).toLowerCase() : null;
    const cursorDate =
      cursor && !Array.isArray(cursor) ? new Date(cursor) : null;

    // Core query with flexible filters using "X IS NULL OR" pattern
    const rows = await sql`
      SELECT
        a.id,
        a.created_at,
        a.is_read,
        a.org_id,
        a.vendor_id,
        a.type,
        a.message,
        a.severity,
        a.title,
        a.rule_label,
        a.file_url,
        a.policy_id,
        a.status,
        a.extracted,
        v.name AS vendor_name
      FROM public.alerts AS a
      LEFT JOIN public.vendors AS v
        ON v.id = a.vendor_id
      WHERE
        (${orgIdInt} IS NULL OR a.org_id = ${orgIdInt})
        AND (${vendorIdInt} IS NULL OR a.vendor_id = ${vendorIdInt})
        AND (${severityFilter} IS NULL OR a.severity = ${severityFilter})
        AND (${statusFilter} IS NULL OR a.status = ${statusFilter})
        AND (
          ${cursorDate}::timestamptz IS NULL
          OR a.created_at < ${cursorDate}
        )
        AND (
          ${searchRaw} IS NULL
          OR LOWER(
              COALESCE(a.title, '') || ' ' ||
              COALESCE(a.message, '') || ' ' ||
              COALESCE(a.rule_label, '') || ' ' ||
              COALESCE(v.name, '')
            ) LIKE ${searchRaw ? `%${searchRaw}%` : null}
        )
      ORDER BY a.created_at DESC
      LIMIT ${pageSize};
    `;

    const alerts = rows.map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      isRead: row.is_read,
      orgId: row.org_id,
      vendorId: row.vendor_id,
      vendorName: row.vendor_name || "Unknown vendor",
      type: row.type || "Info",
      message: row.message,
      severity: row.severity || "Medium",
      title: row.title || "Alert",
      ruleLabel: row.rule_label || "",
      fileUrl: row.file_url || null,
      policyId: row.policy_id,
      status: row.status || "Open",
      extracted: row.extracted || null,
    }));

    // Build next-page cursor (for infinite scroll later)
    const last = alerts[alerts.length - 1] || null;
    const nextCursor = last ? last.createdAt : null;

    return res.status(200).json({
      ok: true,
      alerts,
      nextCursor,
      pageSize,
    });
  } catch (err) {
    console.error("[api/alerts] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Server error",
    });
  }
}
