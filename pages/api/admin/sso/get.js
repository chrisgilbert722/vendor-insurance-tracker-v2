import { Client } from "pg";

export default async function handler(req, res) {
  const orgId = Number(req.query.orgId);
  if (!orgId) {
    return res.status(400).json({ ok: false, error: "Invalid orgId" });
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const { rows } = await client.query(
      `
      SELECT
        id,
        name,
        external_uuid,
        sso_provider,
        sso_enforced
      FROM organizations
      WHERE id = $1
      LIMIT 1
      `,
      [orgId]
    );

    if (!rows[0]) {
      return res.status(404).json({ ok: false, error: "Org not found" });
    }

    return res.json({
      ok: true,
      org: rows[0],
      callbackUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    });
  } finally {
    await client.end();
  }
}
