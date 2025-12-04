// pages/api/requirements-v2/rules/[id].js
import { Client } from "pg";

export const config = {
  api: { bodyParser: true },
};

export default async function handler(req, res) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  const { method } = req;
  const { id } = req.query;

  try {
    await client.connect();

    if (method === "GET") {
      const result = await client.query(
        `
        SELECT *
        FROM requirements_rules_v2
        WHERE id = $1
        `,
        [id]
      );

      return res.status(200).json({ ok: true, rule: result.rows[0] });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err) {
    console.error("RULE DETAIL API ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  } finally {
    try {
      await client.end();
    } catch (_) {}
  }
}
