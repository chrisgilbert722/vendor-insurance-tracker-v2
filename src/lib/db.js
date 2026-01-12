// src/lib/db.js
// Neon serverless DB helper
// Exports `sql` for tagged-template queries used across API routes

import "server-only";
import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("Missing DATABASE_URL environment variable");
}

// `sql` is a tagged template function:
//   const rows = await sql`SELECT * FROM table WHERE id = ${id}`;
export const sql = neon(DATABASE_URL);
