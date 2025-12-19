// pages/api/admin/sso/enforce.js
import { Client } from "pg";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const { orgId, enforce } = req.body;

  if (!orgId || typeof enforce !== "boolean") {
    return res.status(400).json({ ok: false, error: "Invalid request" });
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    // 🔒 Load org + SSO config
    const r = await client.query(
      `
      SELECT
        sso_provider,
        azure_tenant_id,
        azure_client_id,
        azure_client_secret
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

    // 🛑 HARD GUARD — prevent self-lockout
    if (enforce) {
      if (
        org.sso_provider !== "azure" ||
        !org.azure_tenant_id ||
        !org.azure_client_id ||
        !org.azure_client_secret
      ) {
        return res.status(400).json({
          ok: false,
          error:
            "Cannot enforce SSO until Azure Tenant ID, Client ID, and Client Secret are configured.",
        });
      }
    }

    // ✅ Safe to update
    await client.query(
      `
      UPDATE organizations
      SET sso_enforced = $1
      WHERE id = $2
      `,
      [enforce, orgId]
    );

    return res.status(200).json({
      ok: true,
      enforced: enforce,
    });
  } catch (err) {
    console.error("[SSO ENFORCE ERROR]", err);
    return res.status(500).json({ ok: false, error: err.message });
  } finally {
    await client.end();
  }
}
