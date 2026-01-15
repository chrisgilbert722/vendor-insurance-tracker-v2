// pages/api/vendors.js
// Dashboard-safe vendors endpoint (Bearer auth + org scoped)

import { sql } from "../../lib/db";
import { createClient } from "@supabase/supabase-js";

// Supabase admin (server only)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    // ---------------------------
    // AUTH — Bearer token required
    // ---------------------------
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

    // ---------------------------
    // Resolve orgId
    // ---------------------------
    const orgId =
      req.query?.orgId && /^\d+$/.test(req.query.orgId)
        ? Number(req.query.orgId)
        : null;

    if (!orgId) {
      return res.status(400).json({ ok: false, error: "Missing orgId" });
    }

    // ---------------------------
    // Fetch vendors
    // ---------------------------
    const rows = await sql`
      SELECT
        id,
        name AS vendor_name,
        status,
        created_at
      FROM vendors
      WHERE org_id = ${orgId}
      ORDER BY name ASC
    `;

    return res.status(200).json({
      ok: true,
      vendors: rows,
    });
  } catch (err) {
    console.error("[api/vendors]", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
