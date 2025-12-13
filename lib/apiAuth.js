import { sql } from "./db";

export async function requireApiKey(req) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ")
    ? auth.slice("Bearer ".length)
    : null;

  if (!token) {
    throw new Error("Missing API key");
  }

  const rows = await sql`
    SELECT org_id
    FROM api_keys
    WHERE key = ${token} AND enabled = true
    LIMIT 1
  `;

  if (!rows.length) {
    throw new Error("Invalid API key");
  }

  return rows[0].org_id;
}
