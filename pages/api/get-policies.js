// pages/api/get-policies.js
// Bearer-token auth + ACTIVE ORG AWARE + DASHBOARD SAFE

import { sql } from "../../lib/db";
import { supabaseServer } from "../../lib/supabaseServer";

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

    const supabase = supabaseServer();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const userId = data.user.id;

    /* ---------------------------------------------
       RESOLVE ORG (ACTIVE ORG FIRST)
    ---------------------------------------------- */
    let orgId = null;

    // Prefer explicit orgId from dashboard
    if (req.query?.orgId && /^\d+$/.test(req.query.orgId)) {
      orgId = Number(req.query.orgId);
    } else {
      // Fallback: first org membership (legacy safety)
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

      orgId = orgRows[0].org_id;
    }

    /* ---------------------------------------------
       FETCH POLICIES (DASHBOARD-COMPLETE SHAPE)
    ---------------------------------------------- */
    const rows = await sql`
      SELECT
        p.id,
        p.org_id,
        p.vendor_id,
        v.name AS vendor_name,
        p.policy_number,
        p.carrier,
        p.effective_date,
        p.expiration_date,
        p.coverage_type,
        p.status,
        p.limit_each_occurrence,
        p.auto_limit,
        p.work_comp_limit,
        p.created_at
      FROM policies p
      LEFT JOIN vendors v ON v.id = p.vendor_id
      WHERE p.org_id = ${orgId}
      ORDER BY p.created_at DESC
    `;

    return res.status(200).json({ ok: true, policies: rows });
  } catch (err) {
    console.error("[get-policies]", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
