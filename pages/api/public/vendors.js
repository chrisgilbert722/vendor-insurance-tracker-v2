import { sql } from "../../../lib/db";
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
       AUTH — SUPABASE SESSION (NOT API KEY)
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

    /* ---------------------------------------------
       ORG — REQUIRE orgId FROM QUERY
    ---------------------------------------------- */
    const orgId = Number(req.query?.orgId);
    if (!orgId || Number.isNaN(orgId)) {
      return res.status(400).json({ ok: false, error: "Missing orgId" });
    }

    /* ---------------------------------------------
       FETCH VENDORS (UI-SAFE SHAPE)
    ---------------------------------------------- */
    const vendors = await sql`
      SELECT
        id,
        name,
        status,
        created_at
      FROM vendors
      WHERE org_id = ${orgId}
      ORDER BY name ASC
    `;

    return res.status(200).json({
      ok: true,
      vendors,
    });
  } catch (err) {
    console.error("[public/vendors]", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
