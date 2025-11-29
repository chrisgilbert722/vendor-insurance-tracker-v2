// pages/api/dashboard/overview.js
import { sql } from "../../../lib/db";
import { getAlertStatsV2 } from "../../../lib/alertsV2Engine";

export default async function handler(req, res) {
  try {
    const orgId = req.query.orgId;
    if (!orgId) {
      return res.status(400).json({ ok: false, error: "Missing orgId" });
    }

    //
    // 1. Load vendors
    //
    const vendors = await sql`
      SELECT id FROM vendors WHERE org_id = ${orgId};
    `;
    const vendorCount = vendors.length;

    //
    // 2. Policies for expiration logic
    //
    const policies = await sql`
      SELECT id, expiration_date
      FROM policies
      WHERE org_id = ${orgId};
    `;

    const today = new Date();
    const addDays = (n) => {
      const d = new Date(today);
      d.setDate(d.getDate() + n);
      return d;
    };

    let expiredCount = 0;
    let critical30 = 0;
    let warning90 = 0;

    policies.forEach((p) => {
      if (!p.expiration_date) return;

      const exp = new Date(p.expiration_date);

      if (exp < today) expiredCount++;
      else if (exp < addDays(30)) critical30++;
      else if (exp < addDays(90)) warning90++;
    });

    //
    // 3. Elite fails (old alert system)
    //
    const eliteFails = await sql`
      SELECT COUNT(*) 
      FROM alerts
      WHERE org_id = ${orgId}
        AND severity = 'critical';
    `;
    const eliteFailCount = Number(eliteFails[0]?.count || 0);

    //
    // 4. Compliance (vendor_compliance_cache)
    //
    const compliance = await sql`
      SELECT vendor_id, status, passing, failing, missing
      FROM vendor_compliance_cache
      WHERE org_id = ${orgId};
    `;

    let pass = 0;
    let warn = 0;
    let fail = 0;

    let allFailures = [];

    compliance.forEach((c) => {
      if (c.status === "pass") pass++;
      else if (c.status === "warn") warn++;
      else if (c.status === "fail") fail++;

      const failingRules = c.failing || [];
      failingRules.forEach((f) => {
        if (f?.field_key) allFailures.push(f.field_key);
      });
    });

    //
    // 5. Top violations
    //
    const violationMap = {};
    allFailures.forEach((v) => {
      violationMap[v] = (violationMap[v] || 0) + 1;
    });

    const topViolations = Object.entries(violationMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, count]) => ({ label, count }));

    //
    // 6. Trajectory metrics
    //
    const metrics = await sql`
      SELECT snapshot_date, avg_score
      FROM dashboard_metrics
      WHERE snapshot_date IS NOT NULL
      ORDER BY snapshot_date ASC
      LIMIT 20;
    `;

    const trajectory = metrics.map((m) => ({
      label: m.snapshot_date.toISOString().slice(0, 10),
      score: Number(m.avg_score),
    }));

    //
    // ⭐ 7. Severity breakdown — Alerts V2 integration
    //
    const severityBreakdown = await getAlertStatsV2(Number(orgId));
    // structure:
    // { critical: n, high: n, medium: n, low: n }

    //
    // 8. Global score
    //
    const globalScore =
      compliance.length > 0
        ? Math.round(
            (pass * 100 + warn * 50 + fail * 0) / compliance.length
          )
        : 0;

    //
    // FINAL RETURN PAYLOAD
    //
    return res.status(200).json({
      ok: true,
      overview: {
        vendorCount,
        globalScore,
        passRate: compliance.length ? pass / compliance.length : 0,
        vendorsEvaluated: compliance.length,

        alerts: {
          expired: expiredCount,
          critical30d: critical30,
          warning90d: warning90,
          eliteFails: eliteFailCount,
        },

        engineSnapshot: { pass, warn, fail },
        trajectory,
        passWarnFail: { pass, warn, fail },
        topViolations,

        // ⭐ THIS IS WHAT FEEDS YOUR NEW DASHBOARD WIDGET
        severityBreakdown,
      },
    });
  } catch (err) {
    console.error("DASHBOARD OVERVIEW ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message || "Internal error",
    });
  }
}
