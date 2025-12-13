import { sql } from "./db";

export async function requireApiKey(req) {
  const auth = req.headers.authorization || "";
  const token = auth.replace("Bearer ", "");

  if (!token) throw new Error("Missing API key");

  const rows = await sql`
    SELECT org_id FROM api_keys WHERE key = ${token} AND enabled = true
  `;
  if (!rows.length) throw new Error("Invalid API key");

  return rows[0].org_id;
}
