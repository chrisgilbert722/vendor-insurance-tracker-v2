import { sql } from "../../../lib/db";
import { supabaseServer } from "../../../lib/supabaseServer";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false });
  }

  try {
    const supabase = supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return res.status(401).json({ ok: false });
    }

    // Find org
    const orgRows = await sql`
      SELECT org_id
      FROM organization_members
      WHERE user_id = ${user.id}
      ORDER BY created_at ASC
      LIMIT 1;
    `;

    if (!orgRows.length) {
      return res.status(400).json({ ok: false });
    }

    const orgId = orgRows[0].org_id;

    // ✅ Mark onboarding complete
    await sql`
      UPDATE organizations
      SET onboarding_completed = true
      WHERE id = ${orgId};
    `;

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("ONBOARDING COMPLETE ERROR:", err);
    return res.status(500).json({ ok: false });
  }
}
