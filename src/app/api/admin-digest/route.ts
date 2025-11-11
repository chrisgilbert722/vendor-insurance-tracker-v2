import { NextResponse } from "next/server";
import { Client } from "pg";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);
export const runtime = "nodejs";

export async function GET() {
  let client: Client | null = null;
  try {
    client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
    await client.connect();

    const q = `
      SELECT carrier, policy_number, expiration_date
      FROM insurance_extracts
      WHERE expiration_date IS NOT NULL
        AND expiration_date BETWEEN NOW() AND NOW() + INTERVAL '30 days'
      ORDER BY expiration_date ASC
      LIMIT 200;
    `;
    const { rows } = await client.query(q);
    await client.end();

    const total = rows.length;
    const body = total === 0
      ? `<p>No policies expiring in the next 30 days.</p>`
      : `
        <p>${total} policies expiring in the next 30 days:</p>
        <table style="border-collapse: collapse; width: 100%;">
          <tr>
            <th style="text-align:left; padding: 6px; border-bottom: 1px solid #ddd;">Carrier</th>
            <th style="text-align:left; padding: 6px; border-bottom: 1px solid #ddd;">Policy #</th>
            <th style="text-align:left; padding: 6px; border-bottom: 1px solid #ddd;">Expires</th>
          </tr>
          ${rows.map(r => `
            <tr>
              <td style="padding: 6px; border-bottom: 1px solid #eee;">${r.carrier || "-"}</td>
              <td style="padding: 6px; border-bottom: 1px solid #eee;">${r.policy_number || "-"}</td>
              <td style="padding: 6px; border-bottom: 1px solid #eee;">${new Date(r.expiration_date).toDateString()}</td>
            </tr>
          `).join("")}
        </table>
      `;

    await resend.emails.send({
      from: "digest@coibot.ai",
      to: "admin@yourdomain.com", // change to your admin email
      subject: `COI Digest — ${total} expiring in next 30 days`,
      html: `
        <div style="font-family: Arial; padding: 16px;">
          <h2>Weekly COI Digest</h2>
          ${body}
          <p style="color:#999; font-size:12px; margin-top: 10px;">
            COIbot — Automated Compliance Monitoring
          </p>
        </div>
      `,
    });

    return NextResponse.json({ ok: true, message: `Sent digest for ${total} items.` });
  } catch (err: any) {
    if (client) await client.end().catch(() => {});
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
