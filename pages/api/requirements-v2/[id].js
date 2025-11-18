// pages/api/requirements-v2/[id].js
import { Client } from "pg";

export const config = {
  api: { bodyParser: true },
};

export default async function handler(req, res) {
  const { id } = req.query;
  const method = req.method;

  if (!id) {
    return res.status(400).json({ ok: false, error: "Missing group id" });
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    // PUT → update group
    if (method === "PUT") {
      const { name, order_index } = req.body;

      if (!name) {
        return res
          .status(400)
          .json({ ok: false, error: "Missing group name" });
      }

      const update = await client.query(
        `
        UPDATE requirement_groups
        SET name = $1,
            order_index = COALESCE($2, order_index),
            updated_at = NOW()
        WHERE id = $3
        RETURNING *;
      `,
        [name, order_index, id]
      );

      return res.status(200).json({
        ok: true,
        group: update.rows[0],
      });
    }

    // DELETE → delete group
    if (method === "DELETE") {
      await client.query(
        `
        DELETE FROM requirement_groups
        WHERE id = $1
      `,
        [id]
      );

      return res.status(200).json({ ok: true, deleted: true });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err) {
    console.error("REQ-V2 [ID].js ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  } finally {
    try {
      await client.end();
    } catch (_) {}
  }
}
