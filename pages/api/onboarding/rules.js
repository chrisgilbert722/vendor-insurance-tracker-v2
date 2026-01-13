import { sql } from "@db";
import { getUserOrg } from "@/lib/getUserOrg";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "POST only" });
  }

  try {
    const result = await getUserOrg(req, res);
    if (!result?.orgId) return; // getUserOrg already responded

    const { orgId } = result;
    const { strictness, expirationWindow, missingSeverity } = req.body || {};

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

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[onboarding/rules] error:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
