// pages/api/requirements-v2/rules/[id].js

import { Client } from "pg";

export const config = {
  api: { bodyParser: true },
};

export default async function handler(req, res) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  const { method } = req;
  const { id } = req.query;

  try {
    await client.connect();

    // ================================
    // PUT — UPDATE rule
    // ================================
    if (method === "PUT") {
      const updateFields = req.body;

      const update = await client.query(
        `
        UPDATE requirements_rules_v2
        SET
          field_key      = COALESCE($1, field_key),
          operator       = COALESCE($2, operator),
          expected_value = COALESCE($3, expected_value),
          severity       = COALESCE($4, severity),
          requirement_text = COALESCE($5, requirement_text),
          internal_note    = COALESCE($6, internal_note),
          is_active        = COALESCE($7, is_active),
          updated_at       = NOW()
        WHERE id = $8
        RETURNING *;
      `,
        [
          updateFields.field_key,
          updateFields.operator,
          updateFields.expected_value,
          updateFields.severity,
          updateFields.requirement_text,
          updateFields.internal_note,
          updateFields.is_active,
          id,
        ]
      );

      return res.status(200).json({ ok: true, rule: update.rows[0] });
    }

    // ================================
    // DELETE — remove rule
    // ================================
    if (method === "DELETE") {
      await client.query("DELETE FROM requirements_rules_v2 WHERE id = $1", [id]);

      return res.status(200).json({ ok: true, deleted: true });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err) {
    console.error("RULE DELETE/UPDATE ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  } finally {
    try {
      await client.end();
    } catch {}
  }
}
