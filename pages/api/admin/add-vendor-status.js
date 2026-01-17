// pages/api/admin/add-vendor-status.js
// ============================================================
// ONE-TIME MIGRATION: Add status column to vendors table
// - Adds status column with default 'active'
// - Safe to run multiple times (idempotent)
// ============================================================

import { sql } from "@db";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    // Check if column already exists
    const colCheck = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'vendors'
        AND column_name = 'status';
    `;

    if (colCheck.length > 0) {
      return res.status(200).json({
        ok: true,
        message: "Column 'status' already exists",
        migrated: false,
      });
    }

    // Add the status column with default 'active'
    await sql`
      ALTER TABLE vendors
      ADD COLUMN status VARCHAR(20) DEFAULT 'active' NOT NULL;
    `;

    // Create index for efficient filtering
    await sql`
      CREATE INDEX IF NOT EXISTS idx_vendors_status
      ON vendors (status);
    `;

    return res.status(200).json({
      ok: true,
      message: "Added 'status' column to vendors table",
      migrated: true,
    });
  } catch (err) {
    console.error("[add-vendor-status] error:", err);
    return res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
}
