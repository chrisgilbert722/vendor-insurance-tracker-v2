import { sql } from "../../../lib/db";
import { getUserOrg } from "../../../lib/getUserOrg";
import { sendEmail } from "../../../lib/sendEmail";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false });
  }

  try {
    const { orgId } = await getUserOrg(req, res);
    const { emails } = req.body; // array of emails

    for (const email of emails) {
      await sql`
        INSERT INTO organization_invites (org_id, email, created_at)
        VALUES (${orgId}, ${email}, NOW());
      `;

      await sendEmail({
        to: email,
        subject: "You've been invited",
        body: "You've been invited to join the compliance portal.",
      });
    }

    await sql`
      UPDATE organizations
      SET onboarding_step = 4,
          updated_at = NOW()
      WHERE id = ${orgId};
    `;

    res.json({ ok: true });
  } catch (err) {
    console.error("[onboarding/team]", err);
    res.status(500).json({ ok: false });
  }
}
