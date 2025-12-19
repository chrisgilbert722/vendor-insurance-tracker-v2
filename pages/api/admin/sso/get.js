// pages/api/admin/sso/get.js
import { Client } from "pg";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false });
  }

  const orgId = Number(req.query.orgId);
  if (!Number.isInteger(orgId)) {
    return res.status(400).json({ ok: false, error: "Invalid orgId" });
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });

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

    if (!r.rows[0]) {
      return res.status(404).json({ ok: false, error: "Org not found" });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";

    return res.json({
      ok: true,
      org: r.rows[0],
      callbackUrl: `${siteUrl}/auth/callback`,
    });
  } catch (e) {
    console.error("[sso/get]", e);
    res.status(500).json({ ok: false, error: e.message });
  } finally {
    await client.end();
  }
}

    org,
    callbackUrl,
  });
}
