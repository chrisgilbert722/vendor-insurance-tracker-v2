import { sql } from "../../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "GET only" });
  }

  try {
    const orgId = Number(req.query.orgId);
    if (!Number.isInteger(orgId) || orgId <= 0) {
      return res.status(200).json({ ok: true, skipped: true, stats: null });
    }

    const rows = await sql`
      SELECT severity, COUNT(*)::int AS count
      FROM alerts_v2
      WHERE org_id = ${orgId}
        AND resolved_at IS NULL
      GROUP BY severity;
    `;

    const out = { total: 0, critical: 0, high: 0, medium: 0, low: 0 };
    for (const r of rows) {
      const sev = (r.severity || "").toLowerCase();
      if (out[sev] !== undefined) out[sev] = r.count;
      out.total += r.count;
    }

    return res.status(200).json({ ok: true, stats: out });
  } catch (err) {
    console.error("[alerts-v2/stats] ERROR:", err);
    return res.status(200).json({ ok: false, skipped: true, stats: null });
  }
}
