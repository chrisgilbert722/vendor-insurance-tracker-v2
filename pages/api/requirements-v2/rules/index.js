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

    /* ============================================
       GET — Load rules for group
    ============================================ */
    if (method === "GET") {
      if (!groupId) {
        return res.status(400).json({ ok: false, error: "Missing groupId" });
      }

      const result = await client.query(
        `
        SELECT 
          id,
          group_id,
          logic,
          conditions,
          field_key,
          operator,
          expected_value,
          severity,
          requirement_text,
          internal_note,
          is_active,
          updated_at
        FROM requirements_rules_v2
        WHERE group_id = $1
        ORDER BY updated_at DESC;
      `,
        [groupId]
      );

      const formatted = result.rows.map((r) => {
        let conditions = [];
        try {
          conditions = Array.isArray(r.conditions) ? r.conditions : [];
        } catch {
          conditions = [];
        }

        if (!conditions.length) {
          conditions = [
            {
              field_key: r.field_key,
              operator: r.operator,
              expected_value: r.expected_value,
            },
          ];
        }

        return {
          ...r,
          conditions,
          is_active: r.is_active !== false,
        };
      });

      return res.status(200).json({ ok: true, rules: formatted });
    }

    /* ============================================
       POST — Create a rule
    ============================================ */
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

      if (!groupId)
        return res.status(400).json({ ok: false, error: "Missing groupId" });

      const normalized =
        Array.isArray(conditions) && conditions.length
          ? conditions
          : [{ field_key, operator, expected_value }];

      const inserted = await client.query(
        `
        INSERT INTO requirements_rules_v2
          (id, group_id, logic, conditions, field_key, operator, expected_value, severity, requirement_text, internal_note, is_active, updated_at)
        VALUES (gen_random_uuid(), $1, $2, $3::jsonb, $4, $5, $6, $7, $8, $9, TRUE, NOW())
        RETURNING *;
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

    /* ============================================
       PUT — Update rule
    ============================================ */
    if (method === "PUT") {
      const {
        id,
        logic,
        conditions,
        field_key,
        operator,
        expected_value,
        severity,
        requirement_text,
        internal_note,
        is_active,
      } = req.body;

      if (!id)
        return res.status(400).json({ ok: false, error: "Missing rule id" });

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
        RETURNING *;
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

    /* ============================================
       DELETE — Remove rule
    ============================================ */
    if (method === "DELETE") {
      const ruleId = id;

      if (!ruleId)
        return res.status(400).json({ ok: false, error: "Missing rule id" });

      await client.query(
        `DELETE FROM requirements_rules_v2 WHERE id = $1`,
        [ruleId]
      );

      return res.status(200).json({ ok: true, deleted: true });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err) {
    console.error("RULE API ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  } finally {
    try {
      await client.end();
    } catch (_) {}
  }
}
