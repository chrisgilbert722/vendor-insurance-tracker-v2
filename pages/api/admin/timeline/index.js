import { sql } from "../../../../lib/db";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function cleanOrgId(v) {
  if (!v) return null;
  const s = String(v).trim();
  if (!s || s === "null" || s === "undefined") return null;
  return UUID_RE.test(s) ? s : null;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ ok: false, error: "GET only" });
  }

  try {
    const orgId = cleanOrgId(req.query.orgId);

    if (!orgId) {
      return res.status(200).json({
        ok: false,
        skipped: true,
        error: "Missing or invalid orgId",
        timeline: [],
      });
    }

    // Adjust table/columns if your schema differs, but keep org_id UUID
    const rows = await sql`
      SELECT
        occurred_at,
        event_type,
        source,
        vendor_id,
        alert_id,
        message,
        severity,
        vendor_name,
        created_at
      FROM compliance_events
      WHERE org_id = ${orgId}
      ORDER BY COALESCE(occurred_at, created_at) DESC
      LIMIT 40;
    `;

    return res.status(200).json({ ok: true, timeline: rows || [] });
  } catch (err) {
    console.error("[admin/timeline] ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message || "Failed" });
  }
}
