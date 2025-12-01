import { sql } from "../../../lib/db";
import { getUserOrg } from "../../../lib/getUserOrg";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false });
  }

  try {
    const { orgId } = await getUserOrg(req, res);
    const { vendorName, vendorEmail } = req.body;

    await sql`
      INSERT INTO vendors (org_id, name, email, created_at)
      VALUES (${orgId}, ${vendorName}, ${vendorEmail}, NOW());
    `;

    await sql`
      UPDATE organizations
      SET onboarding_step = 5,
          updated_at = NOW()
      WHERE id = ${orgId};
    `;

    res.json({ ok: true });
  } catch (err) {
    console.error("[onboarding/vendors]", err);
    res.status(500).json({ ok: false });
  }
}
