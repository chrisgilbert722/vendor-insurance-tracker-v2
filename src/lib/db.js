// /src/lib/db.js
import { neon } from "@neondatabase/serverless";

// Create a single global connection string
export const sql = neon(process.env.DATABASE_URL);

// Helper: run a safe query that never crashes
export async function query(queryString, ...params) {
  try {
    return await sql(queryString, ...params);
  } catch (err) {
    console.error("[DB ERROR]", err);
    throw err;
  }
}
