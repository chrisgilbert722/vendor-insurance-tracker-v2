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

    /* ===========================
       GET — rules for a group
    =========================== */
    if (method === "GET") {
      if (!groupId) {
        return res.status(400).json({ ok: false, error: "Missing groupId" });
      }

      const result = await client.query(
        `
        SELECT 
          r.*
        FROM requirements_rules_v2 r
        WHERE r.group_id = $1
        ORDER BY r.updated_at DESC, r.id ASC
        `,
        [groupId]
      );

      return res.status(200).json({ ok: true, rules: result.rows });
    }

    /* ===========================
       POST — create rule
    =========================== */
    if (method === "POST") {
      const {
        groupId,
        logic = "all",
        conditions = [],
        field_key,
        operator,
        expected_value,
        severity = "medium",
        requirement_text = "",
        internal_note = "",
      } = req.body;

      if (!groupId) {
        return res.status(400).json({ ok: false, error: "Missing groupId" });
      }

      const normalized =
        Array.isArray(conditions) && conditions.length
          ? conditions
          : [{ field_key, operator, expected_value }];

      const inserted = await client.query(
        `
        INSERT INTO requirements_rules_v2
          (group_id, logic, conditions, field_key, operator, expected_value, severity, requirement_text, internal_note, is_active, updated_at)
        VALUES
          ($1, $2, $3::jsonb, $4, $5, $6, $7, $8, $9, TRUE, NOW())
        RETURNING *
        `,
        [
          groupId,
          logic,
          JSON.stringify(normalized),
          field_key,
          operator,
          expected_value,
          severity,
          requirement_text,
          internal_note,
        ]
      );

      return res.status(200).json({ ok: true, rule: inserted.rows[0] });
    }

    /* ===========================
       PUT — update rule
    =========================== */
    if (method === "PUT") {
      const {
        id,
        logic = "all",
        conditions = [],
        field_key,
        operator,
        expected_value,
        severity = "medium",
        requirement_text = "",
        internal_note = "",
        is_active = true,
      } = req.body;

      if (!id) {
        return res.status(400).json({ ok: false, error: "Missing rule id" });
      }

      const normalized =
        Array.isArray(conditions) && conditions.length
          ? conditions
          : [{ field_key, operator, expected_value }];

      const updated = await client.query(
        `
        UPDATE requirements_rules_v2
        SET 
          logic = $1,
          conditions = $2::jsonb,
          field_key = $3,
          operator = $4,
          expected_value = $5,
          severity = $6,
          requirement_text = $7,
          internal_note = $8,
          is_active = $9,
          updated_at = NOW()
        WHERE id = $10
        RETURNING *
        `,
        [
          logic,
          JSON.stringify(normalized),
          field_key,
          operator,
          expected_value,
          severity,
          requirement_text,
          internal_note,
          is_active,
          id,
        ]
      );

      return res.status(200).json({ ok: true, rule: updated.rows[0] });
    }

    /* ===========================
       DELETE — remove rule
    =========================== */
    if (method === "DELETE") {
      const ruleId = id || req.query.id;

      if (!ruleId) {
        return res.status(400).json({ ok: false, error: "Missing rule id" });
      }

      await client.query(
        `DELETE FROM requirements_rules_v2 WHERE id = $1`,
        [ruleId]
      );

      return res.status(200).json({ ok: true, deleted: true });
    }

    return res
      .status(405)
      .json({ ok: false, error: "Method not allowed" });
  } catch (err) {
    console.error("REQ-V2 RULES ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  } finally {
    try {
      await client.end();
    } catch (_) {}
  }
}
