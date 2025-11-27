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

    // ================================
    // GET GROUPS
    // ================================
    if (method === "GET") {
      if (!orgId) {
        return res.status(400).json({
          ok: false,
          error: "Missing orgId",
        });
      }

      const result = await client.query(
        `
        SELECT 
          g.id,
          g.org_id,
          g.name,
          g.description,
          g.is_active,
          g.created_at,
          g.updated_at,
          (
            SELECT COUNT(*) 
            FROM requirements_rules_v2 r
            WHERE r.group_id = g.id
          ) AS rule_count
        FROM requirements_groups_v2 g
        WHERE g.org_id = $1
        ORDER BY g.created_at ASC;
        `,
        [orgId]
      );

      return res.status(200).json({
        ok: true,
        groups: result.rows,
      });
    }

    // ================================
    // CREATE GROUP
    // ================================
    if (method === "POST") {
      const { name, description } = req.body;
      if (!name || !orgId) {
        return res.status(400).json({
          ok: false,
          error: "Missing name or orgId",
        });
      }

      const insertRes = await client.query(
        `
        INSERT INTO requirements_groups_v2
          (org_id, name, description, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, TRUE, NOW(), NOW())
        RETURNING *;
        `,
        [orgId, name, description || null]
      );

      return res.status(200).json({
        ok: true,
        group: insertRes.rows[0],
      });
    }

    // ================================
    // UPDATE GROUP
    // ================================
    if (method === "PUT") {
      const { name, description, is_active } = req.body;

      if (!id) {
        return res.status(400).json({
          ok: false,
          error: "Missing id",
        });
      }

      const updateRes = await client.query(
        `
        UPDATE requirements_groups_v2
        SET
          name        = COALESCE($1, name),
          description = COALESCE($2, description),
          is_active   = COALESCE($3, is_active),
          updated_at  = NOW()
        WHERE id = $4
        RETURNING *;
        `,
        [name, description, is_active, id]
      );

      return res.status(200).json({
        ok: true,
        group: updateRes.rows[0],
      });
    }

    // ================================
    // DELETE GROUP
    // ================================
    if (method === "DELETE") {
      if (!id) {
        return res.status(400).json({
          ok: false,
          error: "Missing id",
        });
      }

      await client.query(
        `DELETE FROM requirements_groups_v2 WHERE id = $1`,
        [id]
      );

      return res.status(200).json({
        ok: true,
        deleted: true,
      });
    }

    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });

  } catch (err) {
    console.error("GROUPS API ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message,
    });
  } finally {
    try {
      await client.end();
    } catch (_) {}
  }
}
