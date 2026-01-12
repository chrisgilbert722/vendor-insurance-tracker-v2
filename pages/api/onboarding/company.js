// pages/api/onboarding/company.js
import { sql } from "@db";
import { getUserOrg } from "@/lib/getUserOrg";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { orgId } = await getUserOrg(req, res);
    if (!orgId) return; // getUserOrg already responded

    const { companyName, industry, hqLocation, vendorCount } = req.body;

    await sql`
      UPDATE organizations
      SET
        name = ${companyName},
        industry = ${industry},
        hq_location = ${hqLocation},
        vendor_count = ${vendorCount},
        onboarding_step = 1,
        updated_at = NOW()
      WHERE id = ${orgId};
    `;

    return res.json({ ok: true });
  } catch (err) {
    console.error("[onboarding/company] error:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
