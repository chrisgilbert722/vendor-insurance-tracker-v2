import { sql } from "@db";
import { resolveOrg } from "@resolveOrg";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ ok: false, error: "GET only" });
    }

    // 🔒 Resolve UUID -> INT
    const orgId = await resolveOrg(req, res);
    if (!orgId) return;

    const {
      vendorId,
      severity,
      source = "all",
      start,
      end,
      page = "1",
      pageSize = "50",
    } = req.query;

    const limit = Math.min(200, Math.max(10, Number(pageSize) || 50));
    const offset = (Math.max(1, Number(page)) - 1) * limit;

    const vendorIdInt =
      vendorId && Number.isInteger(Number(vendorId))
        ? Number(vendorId)
        : null;

    const sev = severity ? String(severity).toLowerCase() : null;
    const startOk = start ? new Date(start).toISOString() : null;
    const endOk = end ? new Date(end).toISOString() : null;

    const systemQuery = sql`
      SELECT
        'system' AS source,
        st.org_id,
        st.vendor_id,
        v.name AS vendor_name,
        st.action,
        st.message,
        COALESCE(st.severity,'info') AS severity,
        st.created_at
      FROM system_timeline st
      LEFT JOIN vendors v ON v.id = st.vendor_id
      WHERE st.org_id = ${orgId}
        ${vendorIdInt ? sql`AND st.vendor_id = ${vendorIdInt}` : sql``}
        ${sev ? sql`AND LOWER(COALESCE(st.severity,'info')) = ${sev}` : sql``}
        ${startOk ? sql`AND st.created_at >= ${startOk}` : sql``}
        ${endOk ? sql`AND st.created_at <= ${endOk}` : sql``}
    `;

    const vendorQuery = sql`
      SELECT
        'vendor' AS source,
        v.org_id,
        al.vendor_id,
        v.name AS vendor_name,
        al.action,
        al.message,
        COALESCE(al.severity,'info') AS severity,
        al.created_at
      FROM vendor_activity_log al
      JOIN vendors v ON v.id = al.vendor_id
      WHERE v.org_id = ${orgId}
        ${vendorIdInt ? sql`AND al.vendor_id = ${vendorIdInt}` : sql``}
        ${sev ? sql`AND LOWER(COALESCE(al.severity,'info')) = ${sev}` : sql``}
        ${startOk ? sql`AND al.created_at >= ${startOk}` : sql``}
        ${endOk ? sql`AND al.created_at <= ${endOk}` : sql``}
    `;

    const unioned =
      source === "system"
        ? systemQuery
        : source === "vendor"
        ? vendorQuery
        : sql`${systemQuery} UNION ALL ${vendorQuery}`;

    const rows = await sql`
      SELECT *
      FROM (${unioned}) x
      ORDER BY created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    return res.status(200).json({
      ok: true,
      page: Number(page),
      pageSize: limit,
      hasMore: rows.length === limit,
      events: rows,
    });
  } catch (err) {
    console.error("[audit-log]", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
