// pages/api/vendors/update-emails.js
// STEP 3 — Save Missing Vendor Emails (Fix Mode)
// Enables automation without CSV re-upload

import { createClient } from "@supabase/supabase-js";
import { sql } from "../../../lib/db";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function getBearerToken(req) {
  const auth = req.headers.authorization || "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    /* -------------------------------------------------
       1) AUTH
    -------------------------------------------------- */
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({
        ok: false,
        error: "Authentication session missing",
      });
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ ok: false, error: "Invalid session" });
    }

    const userId = data.user.id;

    /* -------------------------------------------------
       2) INPUT
    -------------------------------------------------- */
    const { orgId, vendors } = req.body || {};

    if (!orgId || !Array.isArray(vendors) || vendors.length === 0) {
      return res.status(400).json({
        ok: false,
        error: "Missing orgId or vendors",
      });
    }

    /* -------------------------------------------------
       3) VERIFY ORG MEMBERSHIP
    -------------------------------------------------- */
    const orgRows = await sql`
      SELECT o.id
      FROM organizations o
      JOIN organization_members om
        ON om.org_id = o.id
      WHERE o.external_uuid = ${orgId}
        AND om.user_id = ${userId}
      LIMIT 1;
    `;

    if (!orgRows.length) {
      return res.status(403).json({
        ok: false,
        error: "Not authorized for organization",
      });
    }

    const orgIdInt = orgRows[0].id;

    /* -------------------------------------------------
       4) UPDATE VENDOR EMAILS
       (vendorName is used as stable key for now)
    -------------------------------------------------- */
    let updated = 0;

    for (const v of vendors) {
      if (!v.vendorName || !v.email) continue;

      const result = await sql`
        UPDATE vendors
        SET email = ${v.email},
            updated_at = now()
        WHERE org_id = ${orgIdInt}
          AND name = ${v.vendorName}
          AND (email IS NULL OR email = '');
      `;

      if (result.count > 0) updated += result.count;
    }

    /* -------------------------------------------------
       5) RETURN RESULT
    -------------------------------------------------- */
    return res.status(200).json({
      ok: true,
      updated,
    });
  } catch (err) {
    console.error("[vendors/update-emails]", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Failed to update vendor emails",
    });
  }
}
