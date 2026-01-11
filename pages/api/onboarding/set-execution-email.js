// pages/api/onboarding/set-execution-email.js
import { sql } from "../../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const { orgId, email } = req.body;

  if (!orgId || !email) {
    return res.status(400).json({
      ok: false,
      error: "Missing orgId or email",
    });
  }

  try {
    // 🔑 Persist execution email
    // 🔒 AND advance onboarding_step so Step 4 is considered complete
    await sql`
      UPDATE organizations
      SET
        execution_email = ${email},
        onboarding_step = GREATEST(onboarding_step, 3)
      WHERE external_uuid = ${orgId};
    `;

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[set-execution-email]", err);
    return res.status(500).json({
      ok: false,
      error: "Failed to save execution email",
    });
  }
}

