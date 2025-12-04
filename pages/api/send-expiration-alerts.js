// pages/api/send-expiration-alerts.js
import { sql } from "../../lib/db";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const ALERT_EMAIL = process.env.ALERT_EMAIL || "you@example.com";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ ok: false, error: "Method not allowed" });
  }

  try {
    // Pull all policies via Neon SQL
    const rows = await sql`
      SELECT 
        vendor_name, 
        policy_number, 
        carrier, 
        expiration_date, 
        coverage_type
      FROM policies;
    `;

    const today = new Date();
    const expiringSoon = [];
    const expired = [];

    for (const p of rows) {
      if (!p.expiration_date) continue;

      const [mm, dd, yyyy] = p.expiration_date.split("/");
      const expDate = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
      const diffDays = Math.floor(
        (expDate - today) / (1000 * 60 * 60 * 24)
      );

      if (diffDays < 0) expired.push(p);
      else if (diffDays <= 30) expiringSoon.push(p);
    }

    if (expired.length === 0 && expiringSoon.length === 0) {
      return res
        .status(200)
        .json({ ok: true, message: "No expiring policies." });
    }

    const lines = [];

    if (expired.length > 0) {
      lines.push("EXPIRED POLICIES:");
      expired.forEach((p) => {
        lines.push(
          `- ${p.vendor_name || "Vendor"} | ${
            p.policy_number
          } | ${p.carrier} | Expired: ${p.expiration_date}`
        );
      });
      lines.push("");
    }

    if (expiringSoon.length > 0) {
      lines.push("EXPIRING WITHIN 30 DAYS:");
      expiringSoon.forEach((p) => {
        lines.push(
          `- ${p.vendor_name || "Vendor"} | ${
            p.policy_number
          } | ${p.carrier} | Expires: ${p.expiration_date}`
        );
      });
    }

    const body = lines.join("\n");

    await resend.emails.send({
      from: "Vendor Tracker <alerts@yourdomain.com>",
      to: [ALERT_EMAIL],
      subject: "Vendor COI Expiration Report",
      text: body
    });

    return res
      .status(200)
      .json({ ok: true, message: "Alerts sent." });
  } catch (err) {
    console.error("[send-expiration-alerts] ERROR:", err);
    return res
      .status(500)
      .json({ ok: false, error: err.message });
  }
}
