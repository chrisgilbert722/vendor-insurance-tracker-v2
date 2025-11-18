// pages/api/requirements-v2/groups.js
import { getClient } from "../../../lib/db";

export default async function handler(req, res) {
  const { method } = req;

  //
  // 1) GET GROUPS
  //
  if (method === "GET") {
    const { orgId } = req.query;

    if (!orgId) {
      return res.status(400).json({ ok: false, error: "Missing orgId" });
    }

    let client;
    try {
      client = await getClient();
      const result = await client.query(
        `
          SELECT g.id,
                 g.name,
                 g.description,
                 g.is_active,
                 g.created_at,
                 COUNT(r.id)::int AS rule_count
          FROM requirement_groups_v2 g
          LEFT JOIN requirements_v2 r
            ON r.group_id = g.id
          WHERE g.org_id = $1
          GROUP BY g.id
          ORDER BY g.created_at DESC
        `,
        [orgId]
      );

      return res.status(200).json({ ok: true, groups: result.rows });
    } catch (err) {
      console.error("GET groups error:", err);
      return res.status(500).json({ ok: false, error: "Failed to load groups" });
    } finally {
      if (client) await client.end();
    }
  }

  //
  // 2) CREATE GROUP
  //
  if (method === "POST") {
    const { orgId, name, description } = req.body || {};

    if (!orgId || !name) {
      return res
        .status(400)
        .json({ ok: false, error: "orgId and name are required" });
    }

    let client;
    try {
      client = await getClient();
      const result = await client.query(
        `
          INSERT INTO requirement_groups_v2 (org_id, name, description)
          VALUES ($1, $2, $3)
          RETURNING id, org_id, name, description, is_active, created_at
        `,
        [orgId, name, description || null]
      );

      return res.status(201).json({ ok: true, group: result.rows[0] });
    } catch (err) {
      console.error("POST group error:", err);
      return res.status(500).json({ ok: false, error: "Failed to create group" });
    } finally {
      if (client) await client.end();
    }
  }

  //
  // 3) UPDATE GROUP
  //
  if (method === "PUT") {
    const { id, name, description, is_active } = req.body || {};

    if (!id) {
      return res.status(400).json({ ok: false, error: "Missing group id" });
    }

    let client;
    try {
      client = await getClient();
      const result = await client.query(
        `
          UPDATE requirement_groups_v2
          SET name = COALESCE($2, name),
              description = COALESCE($3, description),
              is_active = COALESCE($4, is_active)
          WHERE id = $1
          RETURNING id, org_id, name, description, is_active, created_at
        `,
        [id, name || null, description || null, is_active]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ ok: false, error: "Group not found" });
      }

      return res.status(200).json({ ok: true, group: result.rows[0] });
    } catch (err) {
      console.error("PUT group error:", err);
      return res.status(500).json({ ok: false, error: "Failed to update group" });
    } finally {
      if (client) await client.end();
    }
  }

  //
  // 4) DELETE GROUP
  //
  if (method === "DELETE") {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ ok: false, error: "Missing group id" });
    }

    let client;
    try {
      client = await getClient();
      await client.query("DELETE FROM requirement_groups_v2 WHERE id = $1", [
        id,
      ]);

      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error("DELETE group error:", err);
      return res.status(500).json({ ok: false, error: "Failed to delete group" });
    } finally {
      if (client) await client.end();
    }
  }

  res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
  return res.status(405).json({ ok: false, error: `Method ${method} Not Allowed` });
}
