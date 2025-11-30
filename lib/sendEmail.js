// lib/sendEmail.js
// Unified Resend Email Sender — Production Safe

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.FROM_EMAIL || "compliance@yourdomain.com";
const REPLY_TO = process.env.REPLY_TO || "support@yourdomain.com";

/**
 * Send an email using Resend.
 * Returns: { ok: true, id } or { ok: false, error }
 */
export async function sendEmail({ to, subject, body }) {
  if (!to) {
    return { ok: false, error: "Missing 'to' recipient email." };
  }

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject,
      text: body,
      reply_to: REPLY_TO,
    });

    if (result?.id) {
      return { ok: true, id: result.id };
    } else {
      return { ok: false, error: "Resend did not return an ID." };
    }
  } catch (err) {
    return { ok: false, error: err.message || "Unknown Resend error" };
  }
}
