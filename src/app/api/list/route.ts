import { NextResponse } from "next/server";
import { Client } from "pg";

export async function GET() {
  try {
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    });
    await client.connect();

    const result = await client.query("SELECT * FROM insurance_extracts ORDER BY created_at DESC;");
    await client.end();

    return NextResponse.json({ records: result.rows });
  } catch (error: any) {
    console.error("Error fetching records:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
