// pages/api/renewals/hydrate.js
// SAFE HYDRATOR — V2 Compatible (no reference to old renewalEngine)

import { sql } from "../../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    // Load all policies with expiration dates
    const policies = await sql`
      SELECT id, org_id, vendor_id, expiration_date, coverage_type
      FROM policies
      WHERE expiration_date IS NOT NULL;
    `;

    let created = 0;

    for (const p of policies) {
      // Check if schedule already exists
      const existing = await sql`
        SELECT id
        FROM policy_renewal_schedule
        WHERE policy_id = ${p.id}
        LIMIT 1;
      `;

      if (existing.length > 0) continue;

      // Insert new schedule
      await sql`
        INSERT INTO policy_renewal_schedule (
          org_id,
          policy_id,
          vendor_id,
          expiration_date,
          coverage_type,
          next_check_at,
          status
        )
        VALUES (
          ${p.org_id},
          ${p.id},
          ${p.vendor_id},
          ${p.expiration_date},
          ${p.coverage_type},
          NOW(),
          'active'
        );
      `;

      created++;
    }

    return res
      .status(200)
      .json({ ok: true, created, totalPolicies: policies.length });
  } catch (err) {
    console.error("[renewals/hydrate] ERROR", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
