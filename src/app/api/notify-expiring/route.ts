import { NextResponse } from "next/server";
import { Client } from "pg";
import { sendComplianceEmail } from "@/lib/email";

export const runtime = "nodejs";

export async function GET() {
  try {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    const result = await client.query(`
      SELECT id, file_name, carrier, expiration_date, compliance_status
      FROM insurance_extracts
      WHERE expiration_date IS NOT NULL
    `);

    const now = new Date();
    const soon = new Date(now);
    soon.setDate(soon.getDate() + 30);

    for (const r of result.rows) {
      const exp = new Date(r.expiration_date);
      const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays <= 30 && diffDays >= 0) {
        await sendComplianceEmail({
          to: "admin@yourdomain.com", // replace or later use dynamic vendor email
          subject: `⚠️ Policy ${r.policy_number || "(unknown)"} expires in ${diffDays} days`,
          message: `
            The policy for carrier <b>${r.carrier}</b> (${r.file_name})
            will expire on <b>${r.expiration_date}</b>.<br><br>
            Please request an updated COI before expiration.
          `,
        });
      }

      if (diffDays < 0) {
        await sendComplianceEmail({
          to: "admin@yourdomain.com",
          subject: `❌ Policy ${r.policy_number || "(unknown)"} has expired!`,
          message: `
            The policy for carrier <b>${r.carrier}</b> (${r.file_name})
            expired on <b>${r.expiration_date}</b>.<br><br>
            Please contact the vendor for renewal.
          `,
        });
      }
    }

    await client.end();
    return NextResponse.json({ ok: true, message: "✅ Checked expiring policies and sent alerts." });
  } catch (error: any) {
    console.error("❌ notify-expiring error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
