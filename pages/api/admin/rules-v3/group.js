// pages/api/admin/rules-v3/group.js
import { sql } from "../../../../lib/db";

export default async function handler(req, res) {
  try {
    const { id } = req.method === "GET" ? req.query : req.body;
    const groupId = id ? Number(id) : null;

    if (!groupId || Number.isNaN(groupId)) {
      return res.status(400).json({ ok: false, error: "Missing or invalid group id" });
    }

    if (req.method === "GET") {
      const groups = await sql`
        SELECT id, org_id, label, description, severity, active, created_at
        FROM rule_groups
        WHERE id = ${groupId}
        LIMIT 1;
      `;

      if (!groups.length) {
        return res.status(404).json({ ok: false, error: "Group not found" });
      }

      const rules = await sql`
        SELECT id, group_id, type, field, condition, value, message, severity, active
        FROM rules_v3
        WHERE group_id = ${groupId}
        ORDER BY id ASC;
      `;

      return res.status(200).json({
        ok: true,
        group: groups[0],
        rules,
      });
    }

    if (req.method === "PUT") {
      const { label, description, severity, active } = req.body;

      const rows = await sql`
        UPDATE rule_groups
        SET
          label = COALESCE(${label}, label),
          description = COALESCE(${description}, description),
          severity = COALESCE(${severity}, severity),
          active = COALESCE(${active}, active)
        WHERE id = ${groupId}
        RETURNING id, org_id, label, description, severity, active, created_at;
      `;

      if (!rows.length) {
        return res.status(404).json({ ok: false, error: "Group not found" });
      }

      return res.status(200).json({ ok: true, group: rows[0] });
    }

    if (req.method === "DELETE") {
      await sql`DELETE FROM rules_v3 WHERE group_id = ${groupId};`;
      await sql`DELETE FROM rule_groups WHERE id = ${groupId};`;

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err) {
    console.error("[rules-v3/group] ERROR", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
