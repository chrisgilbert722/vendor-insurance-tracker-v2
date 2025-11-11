import { NextResponse } from "next/server";
import { Client } from "pg";

export async function GET() {
  try {
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    });
    await client.connect();

    const res = await client.query(
      "SELECT file_name, carrier, policy_number, effective_date, expiration_date, compliance_status, compliance_score FROM insurance_extracts ORDER BY id DESC"
    );

    await client.end();

    return NextResponse.json({ ok: true, records: res.rows });
  } catch (error: any) {
    console.error("❌ Fetch Error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Database fetch failed" },
      { status: 500 }
    );
  }
}
