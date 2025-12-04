// pages/api/alerts/index.js
import { sql } from "../../../lib/db";

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const {
      orgId,
      vendorId,
      severity,
      status,
      search,
      cursor,
      limit,
    } = req.query;

    // ---------- NORMALIZE ALL INPUTS ----------
    const orgIdInt = orgId ? parseInt(orgId, 10) : null;
    const vendorIdInt = vendorId ? parseInt(vendorId, 10) : null;

    const severityFilter = severity || null;
    const statusFilter = status || null;

    const searchRaw =
      search && typeof search === "string" ? search.toLowerCase() : null;

    const cursorDate =
      cursor && typeof cursor === "string" ? new Date(cursor) : null;

    let pageSize = parseInt(limit, 10);
    if (Number.isNaN(pageSize) || pageSize <= 0) pageSize = DEFAULT_PAGE_SIZE;
    if (pageSize > MAX_PAGE_SIZE) pageSize = MAX_PAGE_SIZE;

    // ---------- MAIN QUERY ----------
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
        (${orgIdInt}::int IS NULL OR a.org_id = ${orgIdInt})
        AND (${vendorIdInt}::int IS NULL OR a.vendor_id = ${vendorIdInt})
        AND (${severityFilter}::text IS NULL OR a.severity = ${severityFilter})
        AND (${statusFilter}::text IS NULL OR a.status = ${statusFilter})
        AND (${cursorDate}::timestamptz IS NULL OR a.created_at < ${cursorDate})
        AND (
          ${searchRaw}::text IS NULL
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

    const alerts = rows.map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      isRead: r.is_read,
      orgId: r.org_id,
      vendorId: r.vendor_id,
      vendorName: r.vendor_name || "Unknown vendor",
      type: r.type,
      message: r.message,
      severity: r.severity,
      title: r.title,
      ruleLabel: r.rule_label,
      fileUrl: r.file_url,
      policyId: r.policy_id,
      status: r.status,
      extracted: r.extracted,
    }));

    const last = alerts[alerts.length - 1] || null;

    return res.status(200).json({
      ok: true,
      alerts,
      nextCursor: last ? last.createdAt : null,
      pageSize,
    });
  } catch (err) {
    console.error("[api/alerts] ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
