// pages/api/vendor/send-fix-email.js
import { Client } from "pg";
import { Resend } from "resend";

export const config = {
  api: { bodyParser: true }
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const { vendorId, orgId, subject, body } = req.body;

  if (!vendorId || !orgId || !subject || !body) {
    return res.status(400).json({
      ok: false,
      error: "Missing vendorId, orgId, subject, or body"
    });
  }

  let db = null;

  try {
    // Load vendor email
    db = new Client({ connectionString: process.env.DATABASE_URL });
    await db.connect();

    const vendorRes = await db.query(
      `
      SELECT email, name
      FROM public.vendors
      WHERE id = $1
      `,
      [vendorId]
    );

    if (vendorRes.rows.length === 0) {
      throw new Error("Vendor not found");
    }

    const vendor = vendorRes.rows[0];

    if (!vendor.email) {
      throw new Error("Vendor has no email on file.");
    }

    // Send email with Resend
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: process.env.EMAIL_FROM || "Compliance <no-reply@yourdomain.com>",
      to: vendor.email,
      subject,
      text: body,
    });

    return res.status(200).json({
      ok: true,
      sentTo: vendor.email
    });

  } catch (err) {
    console.error("FIX EMAIL ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Failed to send fix email"
    });
  } finally {
    try { await db?.end(); } catch (_) {}
  }
}
