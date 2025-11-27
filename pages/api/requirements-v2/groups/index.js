// pages/api/requirements-v2/groups/index.js
import { Client } from "pg";

export const config = {
  api: { bodyParser: true },
};

export default async function handler(req, res) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  const { method } = req;
  const { orgId, id } = req.query;

  try {
    await client.connect();

    /* ============================================
       GET — Load all groups for org
    ============================================ */
    if (method === "GET") {
      if (!orgId) {
        return res.status(400).json({ ok: false, error: "Missing orgId" });
      }

      const result = await client.query(
        `
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
        WHERE g.org_id = $1
        ORDER BY g.order_index ASC, g.created_at ASC;
      `,
        [orgId]
      );

      return res.status(200).json({
        ok: true,
        groups: result.rows,
      });
    }

    /* ============================================
       POST — Create a new group
    ============================================ */
    if (method === "POST") {
      const { name, description } = req.body;

      if (!name || !orgId) {
        return res.status(400).json({
          ok: false,
          error: "Missing name or orgId",
        });
      }

      const insert = await client.query(
        `
        INSERT INTO requirements_groups_v2
          (id, org_id, name, description, is_active, order_index, created_at, updated_at)
        VALUES (gen_random_uuid(), $1, $2, $3, TRUE, 0, NOW(), NOW())
        RETURNING *;
      `,
        [orgId, name, description || null]
      );

      return res.status(200).json({ ok: true, group: insert.rows[0] });
    }

    /* ============================================
       PUT — Update group
    ============================================ */
    if (method === "PUT") {
      const { name, description, is_active, order_index } = req.body;

      if (!id) {
        return res.status(400).json({ ok: false, error: "Missing group id" });
      }

      const update = await client.query(
        `
        UPDATE requirements_groups_v2
        SET
          name = COALESCE($1, name),
          description = COALESCE($2, description),
          is_active = COALESCE($3, is_active),
          order_index = COALESCE($4, order_index),
          updated_at = NOW()
        WHERE id = $5
        RETURNING *;
      `,
        [name, description, is_active, order_index, id]
      );

      return res.status(200).json({ ok: true, group: update.rows[0] });
    }

    /* ============================================
       DELETE — Remove group
    ============================================ */
    if (method === "DELETE") {
      if (!id) {
        return res.status(400).json({ ok: false, error: "Missing group id" });
      }

      await client.query(`DELETE FROM requirements_groups_v2 WHERE id = $1`, [
        id,
      ]);

      return res.status(200).json({ ok: true, deleted: true });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err) {
    console.error("GROUP API ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  } finally {
    try {
      await client.end();
    } catch (_) {}
  }
}
