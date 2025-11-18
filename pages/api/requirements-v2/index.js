// pages/api/requirements-v2/index.js
import { Client } from "pg";

export default async function handler(req, res) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();

  try {
    const { method } = req;

    // GET → list groups + rules
    if (method === "GET") {
      const result = await client.query(`
        SELECT
          g.id AS group_id,
          g.org_id,
          g.name AS group_name,
          g.effective_date,
          g.status,
          g.order_index,
          json_agg(
            json_build_object(
              'id', r.id,
              'coverage_type', r.coverage_type,
              'min_limit_each_occurrence', r.min_limit_each_occurrence,
              'min_limit_aggregate', r.min_limit_aggregate,
              'require_additional_insured', r.require_additional_insured,
              'require_waiver', r.require_waiver,
              'min_risk_score', r.min_risk_score,
              'notes', r.notes
            )
          ) AS rules
        FROM requirement_groups g
        LEFT JOIN requirements r ON r.group_id = g.id
        GROUP BY g.id
        ORDER BY g.order_index ASC;
      `);

      return res.status(200).json({ ok: true, groups: result.rows });
    }

    // POST → create new group
    if (method === "POST") {
      const { name, org_id } = req.body;

      if (!name || !org_id) {
        return res.status(400).json({ ok: false, error: "Missing group name or org_id" });
      }

      const insertRes = await client.query(
        `
        INSERT INTO requirement_groups (org_id, name)
        VALUES ($1, $2)
        RETURNING *;
        `,
        [org_id, name]
      );

      return res.status(200).json({ ok: true, group: insertRes.rows[0] });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });

  } catch (err) {
    console.error("REQ-V2 INDEX ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  } finally {
    await client.end();
  }
}
