// pages/api/requirements-v2/rules/[id].js
import { Client } from "pg";

export const config = {
  api: { bodyParser: true },
};

export default async function handler(req, res) {
  const { id } = req.query;
  const method = req.method;

  if (!id) {
    return res.status(400).json({ ok: false, error: "Missing rule id" });
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    // ==================================================
    // PUT — UPDATE RULE
    // ==================================================
    if (method === "PUT") {
      const {
        coverage_type,
        min_limit_each_occurrence,
        min_limit_aggregate,
        require_additional_insured,
        require_waiver,
        min_risk_score,
        notes,
      } = req.body;

      const update = await client.query(
        `
        UPDATE requirements
        SET 
          coverage_type = $1,
          min_limit_each_occurrence = $2,
          min_limit_aggregate = $3,
          require_additional_insured = $4,
          require_waiver = $5,
          min_risk_score = $6,
          notes = $7,
          updated_at = NOW()
        WHERE id = $8
        RETURNING *;
        `,
        [
          coverage_type || null,
          min_limit_each_occurrence || null,
          min_limit_aggregate || null,
          require_additional_insured ?? null,
          require_waiver ?? null,
          min_risk_score || null,
          notes || null,
          id,
        ]
      );

      return res.status(200).json({
        ok: true,
        rule: update.rows[0],
      });
    }

    // ==================================================
    // DELETE — DELETE RULE
    // ==================================================
    if (method === "DELETE") {
      await client.query(
        `
        DELETE FROM requirements
        WHERE id = $1
        `,
        [id]
      );

      return res.status(200).json({ ok: true, deleted: true });
    }

    return res
      .status(405)
      .json({ ok: false, error: `Method ${method} not allowed` });
  } catch (err) {
    console.error("REQ-V2 RULE ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  } finally {
    try {
      await client.end();
    } catch (_) {}
  }
}
