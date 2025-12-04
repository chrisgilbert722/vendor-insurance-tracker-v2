// pages/api/outreach/send.js
import { Resend } from "resend";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { to, subject, body, vendorId } = req.body || {};

    if (!to || !subject || !body) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing to / subject / body" });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const from =
      process.env.RESEND_FROM_EMAIL || "no-reply@example.com";

    const result = await resend.emails.send({
      from,
      to,
      subject,
      text: body,
      headers: vendorId
        ? { "X-Vendor-Id": String(vendorId) }
        : undefined,
    });

    return res.status(200).json({ ok: true, result });
  } catch (err) {
    console.error("Resend outreach error:", err);
    return res
      .status(500)
      .json({ ok: false, error: err.message || "Send failed" });
  }
}
