// pages/api/admin/sso/update.js
import { Client } from "pg";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const {
    orgId,
    ssoProvider = "none",
    azureTenantId = "",
    azureClientId = "",
    azureClientSecret = null,
    allowedDomains = [],
  } = req.body || {};

  const oid = String(orgId || "").trim();
  if (!oid) {
    return res.status(400).json({ ok: false, error: "Invalid orgId" });
  }

  const provider = ["none", "azure"].includes(String(ssoProvider))
    ? String(ssoProvider)
    : "none";

  const domains = Array.isArray(allowedDomains)
    ? allowedDomains.map((d) => String(d).trim().toLowerCase()).filter(Boolean)
    : [];

  let client;
  try {
    client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    if (azureClientSecret && String(azureClientSecret).trim()) {
      await client.query(
        `
        UPDATE organizations
        SET
          sso_provider = $2,
          azure_tenant_id = $3,
          azure_client_id = $4,
          azure_client_secret = $5,
          allowed_domains = $6
        WHERE id = $1
        `,
        [
          oid,
          provider,
          azureTenantId || null,
          azureClientId || null,
          String(azureClientSecret),
          domains,
        ]
      );
    } else {
      await client.query(
        `
        UPDATE organizations
        SET
          sso_provider = $2,
          azure_tenant_id = $3,
          azure_client_id = $4,
          allowed_domains = $5
        WHERE id = $1
        `,
        [
          oid,
          provider,
          azureTenantId || null,
          azureClientId || null,
          domains,
        ]
      );
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[admin/sso/update] error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  } finally {
    if (client) {
      try {
        await client.end();
      } catch (_) {}
    }
  }
}
