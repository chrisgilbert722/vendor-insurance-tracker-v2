// pages/api/org/validate-invite.js
import { Client } from "pg";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res
      .status(405)
      .json({ ok: false, error: "Use GET for this endpoint." });
  }

  const { token } = req.query || {};

  if (!token) {
    return res
      .status(400)
      .json({ ok: false, error: "Invite token is required." });
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    const result = await client.query(
      `SELECT i.id, i.email, i.role, i.accepted,
              o.id AS org_id, o.name AS org_name, i.created_at
       FROM public.organization_invites i
       JOIN public.organizations o ON o.id = i.org_id
       WHERE i.token = $1`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Invite not found." });
    }

    const invite = result.rows[0];

    if (invite.accepted) {
      return res
        .status(400)
        .json({ ok: false, error: "Invite has already been accepted." });
    }

    return res.status(200).json({
      ok: true,
      invite: {
        email: invite.email,
        role: invite.role,
        orgId: invite.org_id,
        orgName: invite.org_name,
        created_at: invite.created_at,
      },
    });
  } catch (err) {
    console.error("validate-invite error:", err);
    return res
      .status(500)
      .json({ ok: false, error: err.message || "Failed to validate invite." });
  } finally {
    try {
      await client.end();
    } catch {}
  }
}
