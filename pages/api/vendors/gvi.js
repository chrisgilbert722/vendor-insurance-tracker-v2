// pages/api/vendors/gvi.js
// Global Vendor Intelligence (GVI)
// ✅ NEON SAFE
// ✅ Correct imports
// ❌ NO sql.join
// ❌ NO sql.array

import { sql } from "@db";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "GET only" });
  }

  try {
    const orgId = Number(req.query?.orgId);
    if (!Number.isInteger(orgId)) {
      return res.status(400).json({ ok: false, error: "Invalid orgId" });
    }

    /* ============================================================
       1) Vendors
    ============================================================ */
    const vendors = await sql`
      SELECT id, name, contract_status
      FROM vendors
      WHERE org_id = ${orgId}
      ORDER BY name ASC;
    `;

    if (vendors.length === 0) {
      return res.status(200).json({ ok: true, vendors: [] });
    }

    /* ============================================================
       2) Alerts per vendor
    ============================================================ */
    const alertRows = await sql`
      SELECT vendor_id, COUNT(*)::int AS count
      FROM alerts_v2
      WHERE org_id = ${orgId}
      GROUP BY vendor_id;
    `;

    const alertMap = {};
    for (const r of alertRows) {
      alertMap[r.vendor_id] = r.count;
    }

    /* ============================================================
       3) Earliest policy per vendor
    ============================================================ */
    const policyRows = await sql`
      SELECT DISTINCT ON (vendor_id)
        vendor_id,
        coverage_type,
        expiration_date
      FROM policies
      WHERE org_id = ${orgId}
      ORDER BY vendor_id, expiration_date ASC;
    `;

    const policyMap = {};
    for (const p of policyRows) {
      policyMap[p.vendor_id] = p;
    }

    const now = Date.now();

    /* ============================================================
       4) Output
    ============================================================ */
    const output = vendors.map((v) => {
      const policy = policyMap[v.id] || null;

      let daysLeft = null;
      if (policy?.expiration_date) {
        daysLeft = Math.floor(
          (new Date(policy.expiration_date).getTime() - now) / 86400000
        );
      }

      let aiScore = 95;
      if (daysLeft === null) aiScore = 70;
      else if (daysLeft < 0) aiScore = 20;
      else if (daysLeft <= 30) aiScore = 40;
      else if (daysLeft <= 90) aiScore = 70;

      return {
        id: v.id,
        name: v.name,
        alertsCount: alertMap[v.id] || 0,
        aiScore,
        primaryPolicy: policy,
        renewal: {
          daysLeft,
          stage:
            daysLeft === null
              ? "unknown"
              : daysLeft < 0
              ? "expired"
              : daysLeft <= 30
              ? "critical"
              : daysLeft <= 90
              ? "warning"
              : "ok",
        },
      };
    });

    return res.status(200).json({ ok: true, vendors: output });
  } catch (err) {
    console.error("[vendors/gvi]", err);
    return res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
}
