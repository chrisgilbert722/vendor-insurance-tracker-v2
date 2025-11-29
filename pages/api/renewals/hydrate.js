// pages/api/renewals/hydrate.js
import { sql } from "../../../lib/db";
import { ensureRenewalScheduleForPolicy } from "../../../lib/renewalEngine";

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const policies = await sql`
      SELECT id, org_id, vendor_id, expiration_date, coverage_type
      FROM policies
      WHERE expiration_date IS NOT NULL;
    `;

    let created = 0;
    for (const p of policies) {
      const id = await ensureRenewalScheduleForPolicy(p);
      if (id) created++;
    }

    return res.status(200).json({ ok: true, created, total: policies.length });
  } catch (err) {
    console.error("[renewals/hydrate] ERROR", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
