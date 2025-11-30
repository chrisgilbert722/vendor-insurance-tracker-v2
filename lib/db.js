// lib/db.js
// Neon serverless client — unified DB helper

import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set.");
}

// Raw SQL tag
export const sql = neon(process.env.DATABASE_URL);

// Safe query helper (required by CRON + widget)
export async function query(queryString, ...params) {
  try {
    return await sql(queryString, ...params);
  } catch (err) {
    console.error("[DB ERROR]", err);
    throw err;
  }
}
