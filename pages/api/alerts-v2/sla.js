// pages/api/alerts-v2/sla.js
import { sql } from "../../../lib/db";

export default async function handler(req, res) {
  try {
    const { orgId } = req.query;

    if (!orgId) {
      return res.status(400).json({ ok: false, error: "Missing orgId" });
    }

    const rows = await sql`
      SELECT created_at
      FROM alerts_v2
      WHERE org_id = ${orgId}
        AND resolved_at IS NULL;
    `;

    if (rows.length === 0) {
      return res.status(200).json({
        ok: true,
        sla: {
          over24: 0,
          over72: 0,
          over7d: 0,
          health: 100,
        },
      });
    }

    const now = new Date();

    let over24 = 0;
    let over72 = 0;
    let over7d = 0;

    for (const r of rows) {
      const ageMs = now - new Date(r.created_at);
      const days = ageMs / (1000 * 60 * 60 * 24);

      if (days >= 7) over7d++;
      if (days >= 3) over72++;
      if (days >= 1) over24++;
    }

    // SLA HEALTH SCORE (0–100)
    // perfect: 100, breaches lower it
    let health = 100;
    health -= over24 * 5;
    health -= over72 * 10;
    health -= over7d * 20;
    health = Math.max(0, health);

    return res.status(200).json({
      ok: true,
      sla: {
        over24,
        over72,
        over7d,
        health,
      },
    });
  } catch (err) {
    console.error("[sla] ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
