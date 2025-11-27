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

    /* ===========================
       GET — list groups for org
       =========================== */
    if (method === "GET") {
      if (!orgId) {
        return res
          .status(400)
          .json({ ok: false, error: "Missing orgId" });
      }

      const result = await client.query(
        `SELECT *
           FROM requirement_groups
          WHERE org_id = $1
          ORDER BY order_index ASC, id ASC`,
        [orgId]
      );

      return res.status(200).json({ ok: true, groups: result.rows });
    }

    /* ===========================
       POST — create new group
       =========================== */
    if (method === "POST") {
      const { name, description } = req.body;

      if (!name || !orgId) {
        return res.status(400).json({
          ok: false,
          error: "Missing group name or orgId",
        });
      }

      const insertRes = await client.query(
        `INSERT INTO requirement_groups
           (org_id, name, description, is_active, created_at)
         VALUES ($1, $2, $3, TRUE, NOW())
         RETURNING *;`,
        [orgId, name, description || null]
      );

      return res.status(200).json({ ok: true, group: insertRes.rows[0] });
    }

    /* ===========================
       PUT — update group
       =========================== */
    if (method === "PUT") {
      const { name, description, is_active } = req.body;

      if (!id) {
        return res
          .status(400)
          .json({ ok: false, error: "Missing group id" });
      }

      const update = await client.query(
        `UPDATE requirement_groups
            SET name        = COALESCE($1, name),
                description = COALESCE($2, description),
                is_active   = COALESCE($3, is_active),
                updated_at  = NOW()
          WHERE id = $4
          RETURNING *;`,
        [name, description, is_active, id]
      );

      return res.status(200).json({
        ok: true,
        group: update.rows[0],
      });
    }

    /* ===========================
       DELETE — delete group
       =========================== */
    if (method === "DELETE") {
      if (!id) {
        return res
          .status(400)
          .json({ ok: false, error: "Missing group id" });
      }

      await client.query(
        `DELETE FROM requirement_groups
          WHERE id = $1`,
        [id]
      );

      return res.status(200).json({ ok: true, deleted: true });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err) {
    console.error("REQ-V2 GROUPS ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  } finally {
    try {
      await client.end();
    } catch (_) {}
  }
}
