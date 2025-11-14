import { Client } from "pg";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const { user } = req.body;

  if (!user || !user.email) {
    return res.status(400).json({ ok: false, error: "Invalid user payload" });
  }

  let client;

  try {
    client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    const orgId = 1; // default org for now

    await client.query(
      `INSERT INTO users (org_id, email, name, role)
       VALUES ($1, $2, $3, 'admin')
       ON CONFLICT (email) DO NOTHING`,
      [orgId, user.email, user.email.split("@")[0]]
    );

    await client.end();

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("sync-user ERROR:", err);

    if (client) {
      try {
        await client.end();
      } catch (_) {}
    }

    return res.status(500).json({ ok: false, error: err.message });
  }
}
