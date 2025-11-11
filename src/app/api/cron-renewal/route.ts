import { NextResponse } from "next/server";
import { Resend } from "resend";
import { Client } from "pg";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function GET() {
  try {
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
    await client.connect();

    // ✅ Check for expiring within 15 days and last notification older than 3 days
    const { rows } = await client.query(`
      SELECT v.name AS vendor_name, v.contact_email AS email, 
             p.policy_number, p.expiration_date,
             n.last_notified
      FROM public.policies p
      JOIN public.vendors v ON v.id = p.vendor_id
      LEFT JOIN public.notifications_log n ON n.policy_number = p.policy_number
      WHERE p.expiration_date < NOW() + INTERVAL '15 days'
      AND p.expiration_date > NOW()
      AND (n.last_notified IS NULL OR n.last_notified < NOW() - INTERVAL '3 days');
    `);

    if (rows.length === 0) {
      await client.end();
      return NextResponse.json({ ok: true, message: "No reminders needed today." });
    }

    // ✅ Send emails and update log
    for (const row of rows) {
      await resend.emails.send({
        from: "alerts@coibot.ai",
        to: row.email,
        subject: `🚨 Reminder: Policy ${row.policy_number} Expiring Soon`,
        html: `
          <h2>Policy Renewal Reminder</h2>
          <p>Hi ${row.vendor_name},</p>
          <p>Your policy <strong>${row.policy_number}</strong> will expire on 
          <strong>${new Date(row.expiration_date).toDateString()}</strong>.</p>
          <p>Please upload a renewed COI to remain compliant.</p>
        `,
      });

      await client.query(
        `
        INSERT INTO public.notifications_log (policy_number, last_notified)
        VALUES ($1, NOW())
        ON CONFLICT (policy_number) DO UPDATE SET last_notified = NOW();
      `,
        [row.policy_number]
      );
    }

    await client.end();
    return NextResponse.json({ ok: true, message: `✅ Sent ${rows.length} reminders.` });
  } catch (error: any) {
    console.error("❌ CRON ERROR:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
