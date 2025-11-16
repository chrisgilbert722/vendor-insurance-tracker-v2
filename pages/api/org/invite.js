// pages/api/org/invite.js
import { Client } from "pg";
import { Resend } from "resend";
import crypto from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ ok: false, error: "Use POST for this endpoint." });
  }

  const { orgId, email, role = "member" } = req.body || {};

  if (!orgId || !email) {
    return res
      .status(400)
      .json({ ok: false, error: "orgId and email are required." });
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    // Simple token
    const token = crypto.randomBytes(24).toString("hex");

    const insert = await client.query(
      `INSERT INTO public.organization_invites
       (org_id, email, token, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, token, created_at`,
      [orgId, email.toLowerCase(), token, role]
    );

    const invite = insert.rows[0];

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://your-app-url.com";

    const acceptUrl = `${baseUrl}/auth/accept-invite?token=${token}`;

    // Send email via Resend (vendor-facing tone = professional)
    if (process.env.RESEND_API_KEY) {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "no-reply@yourdomain.com",
        to: email,
        subject: "You’re invited to join an organization",
        text: `
You’ve been invited to join an organization on the G-Track compliance platform.

Click the link below to accept the invitation and sign in:

${acceptUrl}

If you did not expect this email, you can ignore it.

Regards,
Compliance Operations Team
        `.trim(),
      });
    }

    return res.status(200).json({
      ok: true,
      invite: {
        id: invite.id,
        token: invite.token,
        acceptUrl,
      },
    });
  } catch (err) {
    console.error("org/invite error:", err);
    return res
      .status(500)
      .json({ ok: false, error: err.message || "Failed to create invite." });
  } finally {
    try {
      await client.end();
    } catch {}
  }
}
