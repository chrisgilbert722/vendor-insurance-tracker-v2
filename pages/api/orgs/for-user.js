// pages/api/orgs/for-user.js
import { createClient } from "@supabase/supabase-js";
import { sql } from "../../../lib/db";

// Service-role Supabase client (server only)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  try {
    // 🔐 Read auth token (Authorization header)
    const authHeader = req.headers.authorization || "";
    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ ok: false, error: "Missing auth token" });
    }

    // 🔍 Validate Supabase user
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ ok: false, error: "Invalid session" });
    }

    const authUserId = data.user.id;
    const email = data.user.email || null;

    // 🔎 Fetch orgs for this user (INCLUDES onboarding flag)
    let orgs = await sql`
      SELECT
        o.id,
        o.name,
        o.external_uuid,
        o.onboarding_completed
      FROM organization_members om
      JOIN organizations o ON o.id = om.org_id
      WHERE om.user_id = ${authUserId}
      ORDER BY o.id ASC
    `;

    // ✅ SELF-SERVE GUARANTEE
    // If user has NO org → create one automatically
    if (!orgs || orgs.length === 0) {
      const [org] = await sql`
        INSERT INTO organizations (name, onboarding_completed)
        VALUES (
          ${email ? `${email.split("@")[0]}'s Organization` : "My Organization"},
          false
        )
        RETURNING id, name, external_uuid, onboarding_completed
      `;

      await sql`
        INSERT INTO organization_members (org_id, user_id, role)
        VALUES (${org.id}, ${authUserId}, 'owner')
      `;

      orgs = [org];
    }

    // 🚀 Always returns orgs WITH onboarding state
    return res.status(200).json({
      ok: true,
      orgs,
    });
  } catch (err) {
    console.error("[api/orgs/for-user] fatal error:", err);
    return res.status(500).json({
      ok: false,
      error: "Internal server error",
    });
  }
}
