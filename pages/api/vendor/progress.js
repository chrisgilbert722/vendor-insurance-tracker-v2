// pages/api/vendor/progress.js
// Vendor Progress Tracker — UACC

import { sql } from "../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res
      .status(405)
      .json({ ok: false, error: "Method not allowed. Use GET." });
  }

  try {
    const orgId = Number(req.query.orgId || 0);
    const vendorId = Number(req.query.vendorId || 0);

    if (!orgId || !vendorId) {
      return res.status(400).json({
        ok: false,
        error: "Missing orgId or vendorId",
      });
    }

    const rows = await sql`
      SELECT failing, passing, missing, status, summary
      FROM vendor_compliance_cache
      WHERE org_id = ${orgId}
        AND vendor_id = ${vendorId}
      LIMIT 1;
    `;

    if (!rows.length) {
      return res.status(200).json({
        ok: true,
        progress: {
          total_rules: 0,
          fixed_rules: 0,
          remaining_rules: 0,
          progress_pct: 0,
          status: "unknown",
          summary: "No compliance data yet.",
        },
      });
    }

    const row = rows[0];

    const failing = row.failing || [];
    const passing = row.passing || [];
    const missing = row.missing || [];

    const total_rules =
      failing.length + passing.length + missing.length || 0;
    const fixed_rules = passing.length;
    const remaining_rules = failing.length + missing.length;

    const progress_pct =
      total_rules === 0
        ? 0
        : Math.round((fixed_rules / total_rules) * 100);

    return res.status(200).json({
      ok: true,
      progress: {
        total_rules,
        fixed_rules,
        remaining_rules,
        progress_pct,
        status: row.status || "unknown",
        summary: row.summary || "",
      },
    });
  } catch (err) {
    console.error("[vendor/progress] ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
}
