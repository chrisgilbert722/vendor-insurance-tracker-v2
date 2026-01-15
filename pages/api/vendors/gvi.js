// pages/api/vendors/gvi.js
// Global Vendor Intelligence (GVI) — NEON SAFE, NO sql.array, NO ALIASES

import { sql } from "../../../lib/db";

/* ===================== HELPERS ===================== */

function computeAiScore(expDays, status, failingCount, missingCount) {
  let base = 95;
  if (expDays === null) base = 70;
  else if (expDays < 0) base = 20;
  else if (expDays <= 30) base = 40;
  else if (expDays <= 90) base = 70;

  let factor = 1;
  if (status === "fail") factor *= 0.4;
  else if (status === "warn") factor *= 0.7;

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

/* ===================== HANDLER ===================== */

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "GET only" });
  }

  try {
    const orgId = Number(req.query?.orgId);
    if (!Number.isInteger(orgId)) {
      return res.status(400).json({ ok: false, error: "Invalid orgId" });
    }

    const vendors = await sql`
      SELECT id, name, contract_status AS status
      FROM vendors
      WHERE org_id = ${orgId}
      ORDER BY name ASC;
    `;

    if (vendors.length === 0) {
      return res.status(200).json({ ok: true, vendors: [] });
    }

    const vendorIds = vendors.map(v => v.id);

    const policies = await sql`
      SELECT vendor_id, coverage_type, expiration_date
      FROM policies
      WHERE org_id = ${orgId}
        AND vendor_id IN (${sql.join(vendorIds)});
    `;

    const policyMap = {};
    for (const p of policies) {
      if (
        !policyMap[p.vendor_id] ||
        new Date(p.expiration_date) <
          new Date(policyMap[p.vendor_id].expiration_date)
      ) {
        policyMap[p.vendor_id] = p;
      }
    }

    const now = new Date();

    const output = vendors.map(v => {
      const policy = policyMap[v.id];
      let expDays = null;

      if (policy?.expiration_date) {
        expDays = Math.floor(
          (new Date(policy.expiration_date) - now) / 86400000
        );
      }

      const stage = computeRenewalStage(expDays);

      return {
        id: v.id,
        name: v.name,
        status: v.status,
        aiScore: computeAiScore(expDays, v.status, 0, 0),
        primaryPolicy: policy || null,
        renewal: {
          stage,
          daysLeft: expDays,
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
