// pages/api/requirements-v2/rules.js
import { sql } from "../../../lib/db";

export const config = {
  api: { bodyParser: true },
};

export default async function handler(req, res) {
  try {
    const { method } = req;

    // -------------------------
    // GET — list rules for group
    // -------------------------
    if (method === "GET") {
      const rawGroupId = req.query.groupId;
      const groupId = Number(rawGroupId);

      // 🔒 group_id must be INTEGER
      if (!Number.isInteger(groupId)) {
        return res.status(200).json({ ok: true, rules: [] });
      }

      const rows = await sql`
        SELECT 
          id,
          group_id,
          field_key,
          operator,
          expected_value,
          severity,
          requirement_text,
          internal_note,
          is_active,
          created_at,
          updated_at
        FROM requirements_rules_v2
        WHERE group_id = ${groupId}
        ORDER BY created_at ASC;
      `;

      return res.status(200).json({ ok: true, rules: rows || [] });
    }

    // -------------------------
    // POST — create rule
    // -------------------------
    if (method === "POST") {
      const {
        groupId: rawGroupId,
        field_key,
        operator,
        expected_value,
        severity,
        requirement_text,
        internal_note,
      } = req.body;

      const groupId = Number(rawGroupId);

      if (!Number.isInteger(groupId) || !field_key) {
        return res.status(400).json({
          ok: false,
          error: "Missing or invalid groupId / field_key",
        });
      }

      const rows = await sql`
        INSERT INTO requirements_rules_v2
          (
            group_id,
            field_key,
            operator,
            expected_value,
            severity,
            requirement_text,
            internal_note,
            is_active
          )
        VALUES (
          ${groupId},
          ${field_key},
          ${operator},
          ${expected_value},
          ${severity},
          ${requirement_text || null},
          ${internal_note || null},
          TRUE
        )
        RETURNING *;
      `;

      return res.status(200).json({ ok: true, rule: rows[0] });
    }

    // -------------------------
    // PUT — update rule
    // -------------------------
    if (method === "PUT") {
      const body = req.body;
      const ruleId = Number(body.id);

      if (!Number.isInteger(ruleId)) {
        return res.status(400).json({ ok: false, error: "Invalid rule id" });
      }

      const rows = await sql`
        UPDATE requirements_rules_v2
        SET
          field_key        = COALESCE(${body.field_key}, field_key),
          operator         = COALESCE(${body.operator}, operator),
          expected_value   = COALESCE(${body.expected_value}, expected_value),
          severity         = COALESCE(${body.severity}, severity),
          requirement_text = COALESCE(${body.requirement_text}, requirement_text),
          internal_note    = COALESCE(${body.internal_note}, internal_note),
          is_active        = COALESCE(${body.is_active}, is_active),
          updated_at       = NOW()
        WHERE id = ${ruleId}
        RETURNING *;
      `;

      return res.status(200).json({ ok: true, rule: rows[0] });
    }

    // -------------------------
    // DELETE — remove rule
    // -------------------------
    if (method === "DELETE") {
      const rawId = req.query.id;
      const ruleId = Number(rawId);

      if (!Number.isInteger(ruleId)) {
        return res.status(200).json({ ok: true, deleted: false });
      }

      await sql`
        DELETE FROM requirements_rules_v2
        WHERE id = ${ruleId};
      `;

      return res.status(200).json({ ok: true, deleted: true });
    }

    // -------------------------
    // Invalid method
    // -------------------------
    return res.status(405).json({ ok: false, error: "Method not allowed" });

  } catch (err) {
    console.error("RULES API ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
