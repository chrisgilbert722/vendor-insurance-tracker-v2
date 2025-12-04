// pages/api/admin/rules-v3/rule.js
import { sql } from "../../../../lib/db";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const { id } = req.query;
      const ruleId = id ? Number(id) : null;
      if (!ruleId || Number.isNaN(ruleId)) {
        return res.status(400).json({ ok: false, error: "Invalid rule id" });
      }

      const rows = await sql`
        SELECT id, group_id, type, field, condition, value, message, severity, active
        FROM rules_v3
        WHERE id = ${ruleId}
        LIMIT 1;
      `;
      if (!rows.length) {
        return res.status(404).json({ ok: false, error: "Rule not found" });
      }
      return res.status(200).json({ ok: true, rule: rows[0] });
    }

    if (req.method === "POST") {
      const { groupId, type, field, condition, value, message, severity } = req.body;

      if (!groupId || !type || !field || !condition || !message) {
        return res.status(400).json({
          ok: false,
          error: "groupId, type, field, condition, and message are required",
        });
      }

      const rows = await sql`
        INSERT INTO rules_v3 (group_id, type, field, condition, value, message, severity, active)
        VALUES (
          ${groupId},
          ${type},
          ${field},
          ${condition},
          ${value || null},
          ${message},
          ${severity || "medium"},
          TRUE
        )
        RETURNING id, group_id, type, field, condition, value, message, severity, active;
      `;

      return res.status(200).json({ ok: true, rule: rows[0] });
    }

    if (req.method === "PUT") {
      const { id, type, field, condition, value, message, severity, active } = req.body;
      const ruleId = id ? Number(id) : null;
      if (!ruleId || Number.isNaN(ruleId)) {
        return res.status(400).json({ ok: false, error: "Invalid rule id" });
      }

      const rows = await sql`
        UPDATE rules_v3
        SET
          type = COALESCE(${type}, type),
          field = COALESCE(${field}, field),
          condition = COALESCE(${condition}, condition),
          value = COALESCE(${value}, value),
          message = COALESCE(${message}, message),
          severity = COALESCE(${severity}, severity),
          active = COALESCE(${active}, active)
        WHERE id = ${ruleId}
        RETURNING id, group_id, type, field, condition, value, message, severity, active;
      `;

      if (!rows.length) {
        return res.status(404).json({ ok: false, error: "Rule not found" });
      }

      return res.status(200).json({ ok: true, rule: rows[0] });
    }

    if (req.method === "DELETE") {
      const { id } = req.body;
      const ruleId = id ? Number(id) : null;
      if (!ruleId || Number.isNaN(ruleId)) {
        return res.status(400).json({ ok: false, error: "Invalid rule id" });
      }

      await sql`DELETE FROM rules_v3 WHERE id = ${ruleId};`;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err) {
    console.error("[rules-v3/rule] ERROR", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
