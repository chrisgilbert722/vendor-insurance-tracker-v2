import { sql } from "../../../lib/db";
import { getUserOrg } from "../../../lib/getUserOrg";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false });
  }

  try {
    const { orgId } = await getUserOrg(req, res);
    const { strictness, expirationWindow, missingSeverity } = req.body;

    await sql`
      UPDATE organizations
      SET
        strictness = ${strictness},
        expiration_warning_days = ${expirationWindow},
        default_missing_severity = ${missingSeverity},
        onboarding_step = 3,
        updated_at = NOW()
      WHERE id = ${orgId};
    `;

    res.json({ ok: true });
  } catch (err) {
    console.error("[onboarding/rules]", err);
    res.status(500).json({ ok: false });
  }
}
