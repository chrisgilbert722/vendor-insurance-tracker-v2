// pages/api/requirements-v2/groups.js
import { sql } from "../../../lib/db";
import { resolveOrg } from "../../../lib/resolveOrg";

export const config = {
  api: { bodyParser: true },
};

export default async function handler(req, res) {
  try {
    const { method } = req;

    // 🔒 Resolve external UUID → internal org integer
    const orgId = await resolveOrg(req, res);
    if (!orgId) return;

    // -------------------------
    // GET — list groups for org
    // -------------------------
    if (method === "GET") {
      const rows = await sql`
        SELECT 
          g.id,
          g.org_id,
          g.name,
          g.description,
          g.is_active,
          g.order_index,
          g.created_at,
          g.updated_at,
          (
            SELECT COUNT(*)
            FROM requirements_rules_v2 r
            WHERE r.group_id = g.id
          ) AS rule_count
        FROM requirements_groups_v2 g
        WHERE g.org_id = ${orgId}
        ORDER BY g.order_index ASC, g.created_at ASC;
      `;

      return res.status(200).json({ ok: true, groups: rows || [] });
    }

    // -------------------------
    // POST — create group
    // -------------------------
    if (method === "POST") {
      const { name, description } = req.body;

      if (!name) {
        return res.status(400).json({
          ok: false,
          error: "Missing group name",
        });
      }

      const rows = await sql`
        INSERT INTO requirements_groups_v2
          (org_id, name, description, is_active, order_index)
        VALUES
          (${orgId}, ${name}, ${description || null}, TRUE, 0)
        RETURNING *;
      `;

      return res.status(200).json({ ok: true, group: rows[0] });
    }

    // -------------------------
    // PUT — update group
    // -------------------------
    if (method === "PUT") {
      const { name, description, is_active, order_index, id } = req.body;
      const groupId = Number(id);

      if (!Number.isInteger(groupId)) {
        return res.status(400).json({
          ok: false,
          error: "Invalid group id",
        });
      }

      const rows = await sql`
        UPDATE requirements_groups_v2
        SET
          name        = COALESCE(${name}, name),
          description = COALESCE(${description}, description),
          is_active   = COALESCE(${is_active}, is_active),
          order_index = COALESCE(${order_index}, order_index),
          updated_at  = NOW()
        WHERE id = ${groupId}
        RETURNING *;
      `;

      return res.status(200).json({ ok: true, group: rows[0] });
    }

    // -------------------------
    // DELETE — remove group
    // -------------------------
    if (method === "DELETE") {
      const rawId = req.query.id;
      const groupId = Number(rawId);

      if (!Number.isInteger(groupId)) {
        return res.status(200).json({ ok: true, deleted: false });
      }

      await sql`
        DELETE FROM requirements_groups_v2
        WHERE id = ${groupId};
      `;

      return res.status(200).json({ ok: true, deleted: true });
    }

    return res
      .status(405)
      .json({ ok: false, error: "Method not allowed" });

  } catch (err) {
    console.error("GROUPS API ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
