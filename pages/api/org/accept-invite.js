// pages/api/org/accept-invite.js
import { Client } from "pg";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ ok: false, error: "Use POST for this endpoint." });
  }

  const { token, userId } = req.body || {};

  if (!token || !userId) {
    return res
      .status(400)
      .json({ ok: false, error: "token and userId are required." });
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    await client.query("BEGIN");

    const inviteRes = await client.query(
      `SELECT id, org_id, email, role, accepted
       FROM public.organization_invites
       WHERE token = $1
       FOR UPDATE`,
      [token]
    );

    if (inviteRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res
        .status(404)
        .json({ ok: false, error: "Invite not found." });
    }

    const invite = inviteRes.rows[0];

    if (invite.accepted) {
      await client.query("ROLLBACK");
      return res
        .status(400)
        .json({ ok: false, error: "Invite already accepted." });
    }

    // Check if user already is member
    const memberCheck = await client.query(
      `SELECT id FROM public.organization_members
       WHERE org_id = $1 AND user_id = $2`,
      [invite.org_id, userId]
    );

    if (memberCheck.rows.length === 0) {
      await client.query(
        `INSERT INTO public.organization_members (org_id, user_id, role)
         VALUES ($1, $2, $3)`,
        [invite.org_id, userId, invite.role]
      );
    }

    // Mark invite accepted
    await client.query(
      `UPDATE public.organization_invites
       SET accepted = TRUE
       WHERE id = $1`,
      [invite.id]
    );

    await client.query("COMMIT");

    return res.status(200).json({
      ok: true,
      orgId: invite.org_id,
    });
  } catch (err) {
    console.error("accept-invite error:", err);
    try {
      await client.query("ROLLBACK");
    } catch {}
    return res
      .status(500)
      .json({ ok: false, error: err.message || "Failed to accept invite." });
  } finally {
    try {
      await client.end();
    } catch {}
  }
}
