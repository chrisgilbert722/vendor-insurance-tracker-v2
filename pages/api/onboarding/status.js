// pages/api/onboarding/status.js
// Returns whether onboarding is complete for an org

import { sql } from "../../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ ok: false, error: "GET only" });
  }

  try {
    const { orgId } = req.query;

    if (!orgId) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing orgId in query." });
    }

    // Adjust table/columns here if your schema is slightly different
    const rows = await sql`
      SELECT onboarding_step, first_upload_at
      FROM organizations
      WHERE id = ${orgId}
      LIMIT 1;
    `;

    if (!rows.length) {
      return res
        .status(404)
        .json({ ok: false, error: "Organization not found." });
    }

    const org = rows[0];

    const onboardingStep = org.onboarding_step ?? 0;
    const hasUpload = !!org.first_upload_at;

    // You can tune this logic, but this is the basic idea:
    const isComplete = onboardingStep >= 6 || hasUpload;

    return res.status(200).json({
      ok: true,
      onboardingComplete: isComplete,
      onboardingStep,
      hasUpload,
    });
  } catch (err) {
    console.error("[onboarding/status] ERROR:", err);
    return res
      .status(500)
      .json({ ok: false, error: err.message || "Status failed." });
  }
}
