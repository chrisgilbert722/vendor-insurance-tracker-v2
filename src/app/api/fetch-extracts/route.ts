import { NextResponse } from "next/server";
import { Client } from "pg";

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
      SELECT
        id,
        file_name,
        carrier,
        policy_number,
        effective_date,
        expiration_date,
        compliance_status,
        compliance_score,
        created_at
      FROM insurance_extracts
      ORDER BY created_at DESC
      LIMIT 1000;
    `;
    const { rows } = await client.query(q);
    await client.end();

    return NextResponse.json({ ok: true, records: rows });
  } catch (err: any) {
    if (client) await client.end().catch(() => {});
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
