// pages/api/onboarding/set-execution-email.js
import { sql } from "../../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { orgId, email } = req.body;

    if (!orgId || !email) {
      return res.status(400).json({
        ok: false,
        error: "Missing orgId or email",
      });
    }

    await sql`
      UPDATE organizations
      SET execution_email = ${email}
      WHERE id = ${orgId};
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
