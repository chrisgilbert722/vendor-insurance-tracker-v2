import { sql } from "../../../lib/db";

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
      return res.status(200).json({ ok: false, skipped: true, items: [] });
    }

    // Simple renewal list: policies expiring soon
    const days = Math.max(1, Math.min(365, Number(req.query.days || 90)));
    const rows = await sql`
      SELECT *
      FROM policies
      WHERE org_id = ${orgId}
      ORDER BY expiration_date ASC NULLS LAST
      LIMIT 500;
    `;

    return res.status(200).json({ ok: true, items: rows || [], days });
  } catch (err) {
    console.error("[renewals/list] ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message || "Failed" });
  }
}
