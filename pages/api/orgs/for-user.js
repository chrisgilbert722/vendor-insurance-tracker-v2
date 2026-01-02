// pages/api/orgs/for-user.js
// ============================================================
// ORGS FOR USER — CANONICAL + UUID SAFE
// - Auth UUID → users.auth_user_id → users.id
// - NO guessing
// - NO cross-user leakage
// ============================================================

import { createClient } from "@supabase/supabase-js";
import { sql } from "../../../lib/db";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  try {
    // ----------------------------------------
    // 1. AUTH — VERIFY SESSION
    // ----------------------------------------
    const auth = req.headers.authorization || "";
    const token = auth.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ ok: false, error: "No auth token" });
    }

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({ ok: false, error: "Invalid session" });
    }

    const authUserId = data.user.id; // UUID from Supabase Auth

    // ----------------------------------------
    // 2. MAP AUTH USER → INTERNAL USER (INT)
    // ----------------------------------------
    const userRows = await sql`
      SELECT id
      FROM users
      WHERE auth_user_id = ${authUserId}
      LIMIT 1;
    `;

    if (!userRows.length) {
      // User exists in auth, but not in app DB yet
      return res.status(200).json({
        ok: true,
        orgs: [],
      });
    }

    const internalUserId = userRows[0].id;

    // ----------------------------------------
    // 3. LOAD ORGS FOR INTERNAL USER
    // ----------------------------------------
    const orgs = await sql`
      SELECT
        o.id,
        o.name,
        o.external_uuid
      FROM organization_members om
      JOIN organizations o ON o.id = om.org_id
      WHERE om.user_id = ${internalUserId}
      ORDER BY o.id ASC;
    `;

    return res.status(200).json({
      ok: true,
      orgs,
    });
  } catch (err) {
    console.error("[api/orgs/for-user] error:", err);
    return res.status(500).json({
      ok: false,
      error: "Failed to load organizations",
    });
  }
}
