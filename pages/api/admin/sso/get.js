import { Client } from "pg";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const orgExternalId = String(req.query.orgId || "").trim();
  if (!orgExternalId) {
    return res.status(400).json({ ok: false, error: "Missing orgId" });
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    const { rows } = await client.query(
      `
      SELECT
        id,
        name,
        external_uuid,
        allowed_domains,
        sso_provider,
        sso_enforced,
        azure_tenant_id,
        azure_client_id
      FROM organizations
      WHERE external_uuid = $1
      LIMIT 1
      `,
      [orgExternalId]
    );

    if (!rows.length) {
      return res.status(404).json({ ok: false, error: "Organization not found" });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
    const callbackUrl = siteUrl ? `${siteUrl}/auth/callback` : "";

    return res.status(200).json({
      ok: true,
      org: rows[0],
      callbackUrl,
    });
  } catch (err) {
    console.error("[SSO GET ERROR]", err);
    return res.status(500).json({ ok: false, error: err.message });
  } finally {
    await client.end();
  }
}

