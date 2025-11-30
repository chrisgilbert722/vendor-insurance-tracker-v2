// pages/api/vendors/gvi.js
import { sql } from "../../../lib/db";

// Small helper
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

  let score = Math.round(base * factor);
  if (score < 0) score = 0;
  if (score > 100) score = 100;
  return score;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res
      .status(405)
      .json({ ok: false, error: "Method not allowed. Use GET." });
  }

  try {
    const orgId = Number(req.query.orgId || 0);
    if (!orgId) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing orgId in query string." });
    }

    // 1) Load vendors in this org
    const vendors = await sql`
      SELECT id, name, org_id
      FROM vendors
      WHERE org_id = ${orgId}
      ORDER BY name ASC;
    `;

    if (!vendors.length) {
      return res.status(200).json({ ok: true, vendors: [] });
    }

    const vendorIds = vendors.map((v) => v.id);

    // 2) Compliance cache
    const complianceRows = await sql`
      SELECT vendor_id, failing, passing, missing, status, summary
      FROM vendor_compliance_cache
      WHERE org_id = ${orgId}
        AND vendor_id = ANY(${vendorIds});
    `;

    const complianceMap = {};
    for (const row of complianceRows) {
      complianceMap[row.vendor_id] = row;
    }

    // 3) Alerts counts
    const alertRows = await sql`
      SELECT vendor_id, COUNT(*) AS count
      FROM alerts_v2
      WHERE org_id = ${orgId}
        AND vendor_id = ANY(${vendorIds})
      GROUP BY vendor_id;
    `;

    const alertMap = {};
    for (const row of alertRows) {
      alertMap[row.vendor_id] = Number(row.count || 0);
    }

    // 4) Primary policy per vendor (by earliest expiration)
    const policyRows = await sql`
      SELECT p.vendor_id, p.coverage_type, p.expiration_date
      FROM policies p
      WHERE p.org_id = ${orgId}
        AND p.vendor_id = ANY(${vendorIds});
    `;

    const policyMap = {};
    for (const p of policyRows) {
      if (!policyMap[p.vendor_id]) {
        policyMap[p.vendor_id] = p;
      } else {
        const existing = policyMap[p.vendor_id];
        if (
          existing.expiration_date &&
          p.expiration_date &&
          new Date(p.expiration_date) < new Date(existing.expiration_date)
        ) {
          policyMap[p.vendor_id] = p;
        }
      }
    }

    // 5) Assemble rows
    const now = new Date();
    const rowsOut = vendors.map((v) => {
      const comp = complianceMap[v.id] || {};
      const failing = comp.failing || [];
      const passing = comp.passing || [];
      const missing = comp.missing || [];

      const totalRules =
        failing.length + passing.length + missing.length || 0;
      const fixedRules = passing.length;
      const remainingRules = failing.length + missing.length;

      let expDays = null;
      let expDate = null;
      let primaryCoverage = null;
      const primary = policyMap[v.id];
      if (primary && primary.expiration_date) {
        expDate = primary.expiration_date;
        const d = new Date(primary.expiration_date);
        expDays = Math.floor((d - now) / (1000 * 60 * 60 * 24));
        primaryCoverage = primary.coverage_type;
      }

      const status = comp.status || "unknown";
      const summary = comp.summary || "No compliance evaluation yet.";
      const alertsCount = alertMap[v.id] || 0;
      const aiScore = computeAiScore(
        expDays,
        status,
        failing.length,
        missing.length
      );

      return {
        id: v.id,
        name: v.name,
        org_id: v.org_id,
        compliance: {
          status,
          summary,
          totalRules,
          fixedRules,
          remainingRules,
        },
        alertsCount,
        aiScore,
        primaryPolicy: {
          coverage_type: primaryCoverage,
          expiration_date: expDate,
          daysLeft: expDays,
        },
      };
    });

    return res.status(200).json({ ok: true, vendors: rowsOut });
  } catch (err) {
    console.error("[vendors/gvi] ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
