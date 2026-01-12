// src/lib/db.js
import "server-only";
import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("Missing DATABASE_URL environment variable");
}

export const sql = neon(DATABASE_URL);
