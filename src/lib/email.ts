// src/lib/email.ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

/**
 * Sends a compliance reminder email using Resend
 */
export async function sendComplianceEmail({
  to,
  subject,
  message,
}: {
  to: string;
  subject: string;
  message: string;
}) {
  try {
    await resend.emails.send({
      from: "Compliance Bot <no-reply@yourdomain.com>",
      to,
      subject,
      html: `
        <div style="font-family: Arial; padding: 20px; background: #f9f9f9; border-radius: 8px;">
          <h2>${subject}</h2>
          <p style="font-size: 16px; color: #333;">${message}</p>
          <br />
          <p style="color: #888; font-size: 14px;">– The Vendor Insurance Tracker Bot</p>
        </div>
      `,
    });
    console.log(`📧 Sent compliance email to ${to}`);
  } catch (error) {
    console.error("❌ Email send failed:", error);
  }
}
