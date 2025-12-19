import { Client } from "pg";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  // orgId MUST be numeric (internal organization ID)
  const orgId = Number(req.query.orgId);
  if (!Number.isInteger(orgId)) {
    return res.status(400).json({ ok: false, error: "Invalid orgId" });
  }

  let client;

  try {
    client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    const result = await client.query(
      `
      SELECT
        id,
        name,
        allowed_domains,
        external_uuid,
        sso_provider,
        sso_enforced,
        azure_tenant_id,
        azure_client_id
      FROM organizations
      WHERE id = $1
      LIMIT 1
      `,
      [orgId]
    );

    const org = result.rows[0];

    if (!org) {
      return res.status(404).json({ ok: false, error: "Organization not found" });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";
    const callbackUrl = siteUrl ? `${siteUrl}/auth/callback` : "";

    return res.status(200).json({
      ok: true,
      org,
      callbackUrl,
      missingExternalUuid: !org.external_uuid,
    });
  } catch (err) {
    console.error("[admin/sso/get] error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  } finally {
    if (client) {
      try {
        await client.end();
      } catch (_) {}
    }
  }
}
