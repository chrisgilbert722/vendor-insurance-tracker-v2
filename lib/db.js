// lib/db.js
// Neon serverless client — no manual SSL needed
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set.");
}

// sql`...` returns an array of rows
export const sql = neon(process.env.DATABASE_URL);
