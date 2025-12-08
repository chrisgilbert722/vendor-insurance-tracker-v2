// pages/api/onboarding/vendors.js
import { sql } from "../../../lib/db";
import { getUserOrg } from "../../../lib/getUserOrg";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Use POST" });
  }

  try {
    const { orgId } = await getUserOrg(req, res);
    const { vendors } = req.body;

    if (!orgId) {
      return res.status(400).json({ ok: false, error: "Missing orgId" });
    }

    if (!Array.isArray(vendors) || vendors.length === 0) {
      return res
        .status(400)
        .json({ ok: false, error: "Vendors array is required." });
    }

    // Validate vendors
    for (const v of vendors) {
      if (!v.name || !v.email) {
        return res.status(400).json({
          ok: false,
          error: "Each vendor must include name and email.",
        });
      }
      if (!v.email.includes("@")) {
        return res
          .status(400)
          .json({ ok: false, error: `Invalid email: ${v.email}` });
      }
    }

    // Insert vendors in a single transaction
    for (const v of vendors) {
      await sql`
        INSERT INTO vendors (org_id, name, email, created_at)
        VALUES (${orgId}, ${v.name}, ${v.email}, NOW());
      `;
    }

    // Update onboarding step (step 5 = vendor stage)
    await sql`
      UPDATE organizations
      SET onboarding_step = 5,
          updated_at = NOW()
      WHERE id = ${orgId};
    `;

    return res.json({ ok: true, count: vendors.length });
  } catch (err) {
    console.error("[onboarding/vendors]", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
