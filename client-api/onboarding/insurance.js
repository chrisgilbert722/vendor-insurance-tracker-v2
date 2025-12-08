import { sql } from "../../../lib/db";
import { getUserOrg } from "../../../lib/getUserOrg";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false });
  }

  try {
    const { orgId } = await getUserOrg(req, res);
    const { coverages } = req.body;

    // Clear old selections
    await sql`
      DELETE FROM organization_coverages
      WHERE org_id = ${orgId};
    `;

    // Insert new selections
    for (const c of coverages) {
      await sql`
        INSERT INTO organization_coverages (org_id, coverage_name)
        VALUES (${orgId}, ${c});
      `;
    }

    await sql`
      UPDATE organizations
      SET onboarding_step = 2,
          updated_at = NOW()
      WHERE id = ${orgId};
    `;

    res.json({ ok: true });
  } catch (err) {
    console.error("[onboarding/insurance]", err);
    res.status(500).json({ ok: false });
  }
}
