// pages/api/vendors/gvi.js
// Global Vendor Intelligence (GVI) — NEON SAFE, NO sql.array, NO sql.join

import { sql } from "../../../lib/db";

/* ============================================================
   HELPERS
============================================================ */

function computeAiScore(expDays, status, failingCount, missingCount) {
  let base = 95;
  if (expDays === null) base = 70;
  else if (expDays < 0) base = 20;
  else if (expDays <= 30) base = 40;
  else if (expDays <= 90) base = 70;

  let factor = 1.0;
  if (status === "fail") factor = 0.4;
  else if (status === "warn") factor = 0.7;

  if (failingCount > 0) factor *= 0.6;
  else if (missingCount > 0) factor *= 0.8;

  return Math.max(0, Math.min(Math.round(base * factor), 100));
}

function computeRenewalStage(daysLeft) {
  if (daysLeft === null) return null;
  if (daysLeft < 0) return 0;
  if (daysLeft <= 1) return 1;
  if (daysLeft <= 3) return 3;
  if (daysLeft <= 7) return 7;
  if (daysLeft <= 30) return 30;
  if (daysLeft <= 90) return 90;
  return 999;
}

/* ============================================================
   MAIN HANDLER
============================================================ */

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "GET only" });
  }

  try {
    const orgId = Number(req.query?.orgId);
    if (!Number.isInteger(orgId)) {
      return res.status(400).json({ ok: false, error: "Invalid orgId" });
    }

    /* -------------------------------------------
       Vendors (BASE TABLE)
    ------------------------------------------- */
    const vendors = await sql`
      SELECT id, name
      FROM vendors
      WHERE org_id = ${orgId}
      ORDER BY name ASC;
    `;

    if (vendors.length === 0) {
      return res.status(200).json({ ok: true, vendors: [] });
    }

    /* -------------------------------------------
       Alerts (JOIN, NO ARRAY)
    ------------------------------------------- */
    const alerts = await sql`
      SELECT v.id AS vendor_id, COUNT(a.id)::int AS count
      FROM vendors v
      LEFT JOIN alerts_v2 a
        ON a.vendor_id = v.id
       AND a.org_id = ${orgId}
      WHERE v.org_id = ${orgId}
      GROUP BY v.id;
    `;

    const alertMap = Object.fromEntries(
      alerts.map((r) => [r.vendor_id, r.count])
    );

    /* -------------------------------------------
       Policies (EARLIEST EXPIRATION)
    ------------------------------------------- */
    const policies = await sql`
      SELECT DISTINCT ON (p.vendor_id)
        p.vendor_id,
        p.coverage_type,
        p.expiration_date
      FROM policies p
      JOIN vendors v ON v.id = p.vendor_id
      WHERE v.org_id = ${orgId}
      ORDER BY p.vendor_id, p.expiration_date ASC;
    `;

    const policyMap = Object.fromEntries(
      policies.map((p) => [p.vendor_id, p])
    );

    const now = Date.now();

    const output = vendors.map((v) => {
      const policy = policyMap[v.id];
      let daysLeft = null;

      if (policy?.expiration_date) {
        daysLeft = Math.floor(
          (new Date(policy.expiration_date).getTime() - now) / 86400000
        );
      }

      return {
        id: v.id,
        name: v.name,
        alertsCount: alertMap[v.id] || 0,
        aiScore: computeAiScore(daysLeft, "pass", 0, 0),
        primaryPolicy: policy || null,
        renewal: {
          stage: computeRenewalStage(daysLeft),
          daysLeft,
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
