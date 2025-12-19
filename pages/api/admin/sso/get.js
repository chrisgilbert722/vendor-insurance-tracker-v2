// pages/api/admin/sso/get.js
import { Client } from "pg";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const orgId = Number(req.query.orgId);
  if (!orgId || Number.isNaN(orgId)) {
    return res.status(400).json({ ok: false, error: "Invalid orgId" });
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    const r = await client.query(
      `
      SELECT
        id,
        name,
        external_uuid,
        sso_provider,
        sso_enforced,
        allowed_domains,
        azure_tenant_id,
        azure_client_id
      FROM organizations
      WHERE id = $1
      LIMIT 1
      `,
      [orgId]
    );

    const org = r.rows[0];
    if (!org) {
      return res.status(404).json({ ok: false, error: "Organization not found" });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
    const callbackUrl = siteUrl
      ? `${siteUrl}/auth/callback`
      : "";

    return res.status(200).json({
      ok: true,
      org,
      callbackUrl,
    });
  } catch (err) {
    console.error("[SSO GET ERROR]", err);
    return res.status(500).json({ ok: false, error: err.message });
  } finally {
    await client.end();
  }
}
