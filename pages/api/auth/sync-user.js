import { Client } from "pg";

/*
  sync-user.js
  ------------------------------------------------------------
  Called after Supabase authentication.
  Responsible for:
  - Resolving user's organization
  - Creating user if missing
  - Guaranteeing org binding
*/

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const { user } = req.body;

  if (!user || !user.email) {
    return res.status(400).json({ ok: false, error: "Invalid user payload" });
  }

  const email = user.email.toLowerCase();
  const emailDomain = email.split("@")[1];

  let client;

  try {
    client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    // ------------------------------------------------------------
    // 1. Resolve organization
    // Priority:
    //   A. external_uuid (enterprise / Azure)
    //   B. domain match
    // ------------------------------------------------------------

    let org;

    // A. Azure / Enterprise org via external_uuid
    if (user.app_metadata?.provider === "azure" && user.app_metadata?.external_uuid) {
      const r = await client.query(
        `
        SELECT id, name
        FROM organizations
        WHERE external_uuid = $1
        LIMIT 1
        `,
        [user.app_metadata.external_uuid]
      );
      org = r.rows[0];
    }

    // B. Fallback: domain-based org
    if (!org) {
      const r = await client.query(
        `
        SELECT id, name
        FROM organizations
        WHERE domain = $1
           OR $1 = ANY(allowed_domains)
        LIMIT 1
        `,
        [emailDomain]
      );
      org = r.rows[0];
    }

    if (!org) {
      throw new Error(
        `No organization found for user ${email}. Enterprise org must be provisioned first.`
      );
    }

    // ------------------------------------------------------------
    // 2. Upsert user
    // ------------------------------------------------------------

    await client.query(
      `
      INSERT INTO users (org_id, email, name, role)
      VALUES ($1, $2, $3, 'admin')
      ON CONFLICT (email)
      DO UPDATE SET org_id = EXCLUDED.org_id
      `,
      [org.id, email, email.split("@")[0]]
    );

    await client.end();

    return res.status(200).json({
      ok: true,
      orgId: org.id,
      orgName: org.name,
    });
  } catch (err) {
    console.error("sync-user ERROR:", err);

    if (client) {
      try {
        await client.end();
      } catch (_) {}
    }

    return res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
}
