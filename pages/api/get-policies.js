// pages/api/get-policies.js
// FINAL — Bearer-token auth (matches onboarding + CSV upload)

import { sql } from "../../lib/db";
import { createClient } from "@supabase/supabase-js";

// Supabase admin (server-only)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    /* ---------------------------------------------
       AUTH — REQUIRE BEARER TOKEN
    ---------------------------------------------- */
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const userId = data.user.id;

    /* ---------------------------------------------
       RESOLVE ORG
    ---------------------------------------------- */
    const orgRows = await sql`
      SELECT org_id
      FROM organization_members
      WHERE user_id = ${userId}
      ORDER BY created_at ASC
      LIMIT 1
    `;

    if (!orgRows.length) {
      return res.status(200).json({ ok: true, policies: [], noOrg: true });
    }

    const orgId = orgRows[0].org_id;

    /* ---------------------------------------------
       FETCH POLICIES
    ---------------------------------------------- */
    const rows = await sql`
      SELECT
        id,
        vendor_name,
        policy_number,
        carrier,
        effective_date,
        expiration_date,
        coverage_type,
        status,
        created_at
      FROM policies
      WHERE org_id = ${orgId}
      ORDER BY created_at DESC
    `;

    return res.status(200).json({ ok: true, policies: rows });
  } catch (err) {
    console.error("[get-policies]", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
