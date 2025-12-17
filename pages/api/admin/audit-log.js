// pages/api/admin/audit-log.js
// ============================================================
// Admin — Audit Log (Org-wide + optional vendor filter)
// Sources:
//  - system_timeline
//  - vendor_activity_log (joined through vendors to scope org)
// ============================================================

import { sql } from "../../../lib/db";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      res.setHeader("Allow", ["GET"]);
      return res.status(405).json({ ok: false, error: "GET only" });
    }

    const {
      orgId,
      vendorId,
      severity,
      source,          // all | system | vendor
      start,           // ISO string
      end,             // ISO string
      page = "1",
      pageSize = "50",
    } = req.query;

    if (!orgId) {
      // tolerant mode
      return res.status(200).json({
        ok: true,
        page: 1,
        pageSize: 50,
        hasMore: false,
        events: [],
      });
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limit = Math.min(200, Math.max(10, parseInt(pageSize, 10) || 50));
    const offset = (pageNum - 1) * limit;

    const vendorIdInt = vendorId ? parseInt(vendorId, 10) : null;
    const sev = severity ? String(severity).toLowerCase() : null;
    const src = source ? String(source).toLowerCase() : "all";

    const startTs = start ? new Date(start) : null;
    const endTs = end ? new Date(end) : null;

    const startOk =
      startTs && !Number.isNaN(startTs.getTime())
        ? startTs.toISOString()
        : null;
    const endOk =
      endTs && !Number.isNaN(endTs.getTime())
        ? endTs.toISOString()
        : null;

    // ---------------------------------------------------------
    // SYSTEM TIMELINE (org-scoped)
    // ---------------------------------------------------------
    const systemQuery = sql`
      SELECT
        'system'::text AS source,
        st.org_id,
        st.vendor_id,
        v.name AS vendor_name,
        st.action,
        st.message,
        COALESCE(st.severity, 'info')::text AS severity,
        st.created_at
      FROM system_timeline st
      LEFT JOIN vendors v ON v.id = st.vendor_id
      WHERE st.org_id = ${orgId}
        AND (${vendorIdInt}::int IS NULL OR st.vendor_id = ${vendorIdInt})
        AND (${sev}::text IS NULL OR LOWER(COALESCE(st.severity,'info')) = ${sev})
        AND (${startOk}::timestamptz IS NULL OR st.created_at >= ${startOk})
        AND (${endOk}::timestamptz IS NULL OR st.created_at <= ${endOk})
    `;

    // ---------------------------------------------------------
    // VENDOR ACTIVITY LOG (vendor-scoped; org comes via vendors)
    // ---------------------------------------------------------
    const vendorQuery = sql`
      SELECT
        'vendor'::text AS source,
        v.org_id,
        al.vendor_id,
        v.name AS vendor_name,
        al.action,
        al.message,
        COALESCE(al.severity, 'info')::text AS severity,
        al.created_at
      FROM vendor_activity_log al
      JOIN vendors v ON v.id = al.vendor_id
      WHERE v.org_id = ${orgId}
        AND (${vendorIdInt}::int IS NULL OR al.vendor_id = ${vendorIdInt})
        AND (${sev}::text IS NULL OR LOWER(COALESCE(al.severity,'info')) = ${sev})
        AND (${startOk}::timestamptz IS NULL OR al.created_at >= ${startOk})
        AND (${endOk}::timestamptz IS NULL OR al.created_at <= ${endOk})
    `;

    let unioned;
    if (src === "system") unioned = systemQuery;
    else if (src === "vendor") unioned = vendorQuery;
    else unioned = sql`${systemQuery} UNION ALL ${vendorQuery}`;

    const rows = await sql`
      SELECT *
      FROM (${unioned}) AS x
      ORDER BY created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const lookahead = await sql`
      SELECT 1
      FROM (${unioned}) AS x
      ORDER BY created_at DESC
      LIMIT 1
      OFFSET ${offset + limit}
    `;

    return res.status(200).json({
      ok: true,
      page: pageNum,
      pageSize: limit,
      hasMore: lookahead.length > 0,
      events: rows || [],
    });
  } catch (err) {
    console.error("[audit-log]", err);
    return res.status(500).json({ ok: false, error: err.message || "Server error" });
  }
}
