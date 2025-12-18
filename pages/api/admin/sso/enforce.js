// pages/api/admin/sso/enforce.js
import { Client } from "pg";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const { orgId, enforce } = req.body || {};
  const orgExternalId = String(orgId || "").trim();

  if (!orgExternalId) {
    return res.status(400).json({ ok: false, error: "Invalid orgId" });
  }

  let client;
  try {
    client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    const r = await client.query(
      `
      SELECT sso_provider, azure_tenant_id, azure_client_id
      FROM organizations
      WHERE external_uuid = $1
      LIMIT 1
      `,
      [orgExternalId]
    );

    const org = r.rows[0];
    if (!org) {
      return res.status(404).json({ ok: false, error: "Organization not found" });
    }

    if (enforce) {
      if (org.sso_provider !== "azure") {
        return res.status(400).json({
          ok: false,
          error: "Set SSO provider to Azure before enforcing.",
        });
      }

      if (!org.azure_tenant_id || !org.azure_client_id) {
        return res.status(400).json({
          ok: false,
          error: "Azure Tenant ID and Client ID are required before enforcing.",
        });
      }
    }

    await client.query(
      `UPDATE organizations SET sso_enforced = $2 WHERE external_uuid = $1`,
      [orgExternalId, !!enforce]
    );

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[admin/sso/enforce] error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  } finally {
    if (client) try { await client.end(); } catch (_) {}
  }
}
