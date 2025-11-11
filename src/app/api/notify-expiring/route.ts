import { NextResponse } from "next/server";
import { Resend } from "resend";
import { Client } from "pg";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function GET() {
  try {
    // ✅ Force Postgres to use the 'public' schema every time
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      options: "-c search_path=public",
    });

    await client.connect();

    // ✅ Query policies expiring within the next 15 days
    const { rows } = await client.query(`
      SELECT v.vendor_name, v.email, p.policy_number, p.expiration_date
      FROM policies p
      JOIN vendors v ON v.id = p.vendor_id
      WHERE p.expiration_date < NOW() + INTERVAL '15 days'
      AND p.expiration_date > NOW()
    `);

    // ✅ If no results, exit early
    if (rows.length === 0) {
      await client.end();
      return NextResponse.json({
        ok: true,
        message: "No expiring policies today.",
      });
    }

    // ✅ Send renewal reminder emails via Resend
    for (const row of rows) {
      await resend.emails.send({
        from: "alerts@coibot.ai",
        to: row.email,
        subject: `🚨 Policy Expiring Soon: ${row.policy_number}`,
        html: `
          <h2>Policy Expiring Soon</h2>
          <p>Hello ${row.vendor_name},</p>
          <p>Your policy <strong>${row.policy_number}</strong> is expiring on 
          <strong>${new Date(row.expiration_date).toDateString()}</strong>.</p>
          <p>Please upload your renewed certificate to remain compliant.</p>
          <br/>
          <p style="color:gray;font-size:12px;">COIbot AI — Automated Compliance Monitoring</p>
        `,
      });
    }

    await client.end();

    return NextResponse.json({
      ok: true,
      message: `✅ Sent ${rows.length} renewal alerts.`,
    });

  } catch (error: any) {
    console.error("❌ Error in notify-expiring route:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
