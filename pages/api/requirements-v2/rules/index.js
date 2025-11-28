// pages/api/requirements-v2/rules/index.js

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

    // ================================
    // GET — all rules for a group
    // ================================
    if (method === "GET") {
      if (!groupId) {
        return res.status(400).json({ ok: false, error: "Missing groupId" });
      }

      const result = await client.query(
        `
        SELECT *
        FROM requirements_rules_v2
        WHERE group_id = $1
        ORDER BY created_at ASC
      `,
        [groupId]
      );

      return res.status(200).json({ ok: true, rules: result.rows });
    }

    // ================================
    // POST — CREATE rule
    // ================================
    if (method === "POST") {
      const { groupId, field_key, operator, expected_value, severity } = req.body;

      if (!groupId || !field_key) {
        return res.status(400).json({ ok: false, error: "Missing required fields" });
      }

      const insert = await client.query(
        `
        INSERT INTO requirements_rules_v2
          (group_id, field_key, operator, expected_value, severity, is_active)
        VALUES ($1, $2, $3, $4, $5, TRUE)
        RETURNING *;
      `,
        [groupId, field_key, operator, expected_value, severity]
      );

      return res.status(200).json({ ok: true, rule: insert.rows[0] });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err) {
    console.error("RULES API ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  } finally {
    try {
      await client.end();
    } catch {}
  }
}
