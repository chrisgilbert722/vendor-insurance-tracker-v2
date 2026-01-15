// pages/api/vendors/gvi.js
// Global Vendor Intelligence (GVI) — UI SAFE

import { sql } from "../../lib/db";

/* ============================================================
   AI SCORE
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

    const vendors = await sql`
      SELECT
        id,
        name,
        COALESCE(contract_status, 'unknown') AS status
      FROM vendors
      WHERE org_id = ${orgId}
      ORDER BY name ASC
    `;

    if (!vendors.length) {
      return res.status(200).json({ ok: true, vendors: [] });
    }

    const vendorIds = vendors.map(v => v.id);

    const alertRows = await sql`
      SELECT vendor_id, COUNT(*)::int AS count
      FROM alerts_v2
      WHERE org_id = ${orgId}
        AND vendor_id IN (${sql.join(vendorIds)})
      GROUP BY vendor_id
    `;

    const alertMap = Object.fromEntries(
      alertRows.map(r => [r.vendor_id, r.count])
    );

    const output = vendors.map(v => ({
      id: v.id,
      name: v.name,
      status: v.status,                 // ✅ THIS FIXES THE CRASH
      alertsCount: alertMap[v.id] || 0,
      aiScore: 100,
      primaryPolicy: null,
      renewal: null
    }));

    return res.status(200).json({ ok: true, vendors: output });
  } catch (err) {
    console.error("[vendors/gvi]", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
