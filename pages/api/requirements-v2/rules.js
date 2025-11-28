// pages/api/requirements-v2/rules.js
import { Client } from "pg";

export const config = {
  api: { bodyParser: true },
};

export default async function handler(req, res) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  const { method } = req;
  const { groupId, id } = req.query;

  try {
    await client.connect();

    // -------------------------
    // GET — list rules for group
    // -------------------------
    if (method === "GET") {
      if (!groupId) {
        return res
          .status(400)
          .json({ ok: false, error: "Missing groupId" });
      }

      const result = await client.query(
        `
        SELECT 
          r.id,
          r.group_id,
          r.field_key,
          r.operator,
          r.expected_value,
          r.severity,
          r.requirement_text,
          r.internal_note,
          r.is_active,
          r.created_at,
          r.updated_at
        FROM requirements_rules_v2 r
        WHERE r.group_id = $1
        ORDER BY r.created_at ASC
        `,
        [groupId]
      );

      return res.status(200).json({ ok: true, rules: result.rows });
    }

    // -------------------------
    // POST — create rule
    // -------------------------
    if (method === "POST") {
      const {
        groupId,
        field_key,
        operator,
        expected_value,
        severity,
        requirement_text,
        internal_note,
      } = req.body;

      if (!groupId || !field_key) {
        return res.status(400).json({
          ok: false,
          error: "Missing required fields",
        });
      }

      const insertRes = await client.query(
        `
        INSERT INTO requirements_rules_v2
          (group_id, field_key, operator, expected_value, severity, requirement_text, internal_note, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
        RETURNING *;
        `,
        [
          groupId,
          field_key,
          operator,
          expected_value,
          severity,
          requirement_text || null,
          internal_note || null,
        ]
      );

      return res.status(200).json({ ok: true, rule: insertRes.rows[0] });
    }

    // -------------------------
    // PUT — update rule
    // -------------------------
    if (method === "PUT") {
      const body = req.body;
      if (!body.id) {
        return res.status(400).json({ ok: false, error: "Missing rule id" });
      }

      const updateRes = await client.query(
        `
        UPDATE requirements_rules_v2
        SET
          field_key        = COALESCE($1, field_key),
          operator         = COALESCE($2, operator),
          expected_value   = COALESCE($3, expected_value),
          severity         = COALESCE($4, severity),
          requirement_text = COALESCE($5, requirement_text),
          internal_note    = COALESCE($6, internal_note),
          is_active        = COALESCE($7, is_active),
          updated_at       = NOW()
        WHERE id = $8
        RETURNING *;
        `,
        [
          body.field_key,
          body.operator,
          body.expected_value,
          body.severity,
          body.requirement_text,
          body.internal_note,
          body.is_active,
          body.id,
        ]
      );

      return res.status(200).json({ ok: true, rule: updateRes.rows[0] });
    }

    // -------------------------
    // DELETE — remove rule
    // -------------------------
    if (method === "DELETE") {
      if (!id) {
        return res.status(400).json({ ok: false, error: "Missing rule id" });
      }

      await client.query(`DELETE FROM requirements_rules_v2 WHERE id = $1`, [
        id,
      ]);

      return res.status(200).json({ ok: true, deleted: true });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err) {
    console.error("RULES API ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  } finally {
    try {
      await client.end();
    } catch (_) {}
  }
}
