// pages/api/orgs/for-user.js

import { sql } from "../../../lib/db";
import { supabaseServer } from "../../../lib/supabaseServer";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
  }

  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({
        ok: false,
        error: "Missing auth token",
      });
    }

    // ✅ CORRECT: create server-side Supabase client
    const supabase = supabaseServer();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({
        ok: false,
        error: "Invalid session",
      });
    }

    const userId = data.user.id;
    const email = data.user.email;

    let orgs = await sql`
      SELECT
        o.id,
        o.name,
        o.external_uuid,
        o.onboarding_step
      FROM organization_members om
      JOIN organizations o ON o.id = om.org_id
      WHERE om.user_id = ${userId}
      ORDER BY o.id ASC;
    `;

    // Auto-create org if user has none
    if (!orgs || orgs.length === 0) {
      const [org] = await sql`
        INSERT INTO organizations (name, onboarding_step)
        VALUES (
          ${email ? `${email.split("@")[0]}'s Organization` : "My Organization"},
          1
        )
        RETURNING id, name, external_uuid, onboarding_step;
      `;

      await sql`
        INSERT INTO organization_members (org_id, user_id, role)
        VALUES (${org.id}, ${userId}, 'owner');
      `;

      orgs = [org];
    }

    return res.status(200).json({
      ok: true,
      orgs: orgs || [],
    });
  } catch (err) {
    console.error("[api/orgs/for-user] error:", err);
    return res.status(500).json({
      ok: false,
      error: "Internal server error",
    });
  }
}
