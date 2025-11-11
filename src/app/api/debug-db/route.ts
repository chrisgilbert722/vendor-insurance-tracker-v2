import { NextResponse } from "next/server";
import { Client } from "pg";

export async function GET() {
  const url = process.env.DATABASE_URL || "(missing)";
  try {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    // Show current db/user/schema + whether 'public.policies' is visible
    const current = await client.query(`
      SELECT
        current_database() AS db,
        current_user      AS "user",
        current_schema()  AS schema,
        version()         AS pg_version
    `);

    const tables = await client.query(`
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_name = 'policies'
      ORDER BY table_schema, table_name
    `);

    // Show the active search_path
    const sp = await client.query(`SHOW search_path`);

    await client.end();

    return NextResponse.json({
      ok: true,
      from_env_DATABASE_URL: url,
      connection: current.rows?.[0],
      search_path: sp.rows?.[0],
      found_tables_named_policies: tables.rows,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message, from_env_DATABASE_URL: url },
      { status: 500 }
    );
  }
}
