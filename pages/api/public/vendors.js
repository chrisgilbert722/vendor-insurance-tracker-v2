// pages/api/vendors.js
// Dashboard-safe vendor loader (Bearer auth + active org)

import { sql } from "../../lib/db";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    // ---------------------------------------------
    // AUTH — BEARER TOKEN (DASHBOARD SESSION)
    // ---------------------------------------------
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

    // ---------------------------------------------
    // RESOLVE ORG (ACTIVE ORG FIRST)
    // ---------------------------------------------
    let orgId = null;

    if (req.query?.orgId && /^\d+$/.test(req.query.orgId)) {
      orgId = Number(req.query.orgId);
    } else {
      const rows = await sql`
        SELECT org_id
        FROM organization_members
        WHERE user_id = ${userId}
        ORDER BY created_at ASC
        LIMIT 1
      `;
      if (!rows.length) {
        return res.json({ ok: true, vendors: [] });
      }
      orgId = rows[0].org_id;
    }

    // ---------------------------------------------
    // FETCH VENDORS
    // ---------------------------------------------
    const vendors = await sql`
      SELECT
        id,
        vendor_name,
        status,
        created_at
      FROM vendors
      WHERE org_id = ${orgId}
      ORDER BY vendor_name ASC
    `;

    return res.json({ ok: true, vendors });
  } catch (err) {
    console.error("[vendors]", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
