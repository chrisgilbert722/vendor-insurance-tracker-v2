// pages/api/renewals/list.js
//
// Renewal Intelligence V3 — Renewal Backlog API
// Returns all policies with expiration dates,
// including renewal status, days left, risk, and alerts count.
//

import { sql } from "../../../lib/db";
import { classifyRenewal } from "../../../lib/classifyRenewal";
import { predictRenewalRisk } from "../../../lib/predictRenewalRisk";

export default async function handler(req, res) {
  try {
    const orgId = Number(req.query.orgId || 0);

    if (!orgId) {
      return res.status(400).json({
        ok: false,
        error: "Missing orgId",
      });
    }

    /* --------------------------------------------------------
       1) Load all policies for this org with expiration_date
    -------------------------------------------------------- */
    const rows = await sql`
      SELECT 
        p.id AS policy_id,
        p.vendor_id,
        p.org_id,
        p.coverage_type,
        p.expiration_date,
        v.name AS vendor_name
      FROM policies p
      JOIN vendors v ON v.id = p.vendor_id
      WHERE p.org_id = ${orgId}
        AND p.expiration_date IS NOT NULL
      ORDER BY p.expiration_date ASC;
    `;

    const now = new Date();

    /* --------------------------------------------------------
       2) Enrich each policy with:
          - days_left
          - renewal_status
          - alert_count
          - renewal_risk (score + label)
    -------------------------------------------------------- */
    const enriched = await Promise.all(
      rows.map(async (p) => {
        const exp = new Date(p.expiration_date);
        const daysLeft = Math.floor((exp - now) / 86400000);

        // Renewal status (pending, due_soon, critical, overdue...)
        const status = classifyRenewal(p.expiration_date);

        // Count vendor alerts
        const alertRows = await sql`
          SELECT COUNT(*)::int AS c
          FROM vendor_alerts
          WHERE vendor_id = ${p.vendor_id};
        `;
        const alertsCount = alertRows[0].c;

        // Renewal Risk Score (0–100)
        const risk = predictRenewalRisk({
          expirationDate: p.expiration_date,
          alertsCount,
        });

        return {
          ...p,
          days_left: daysLeft,
          status,
          alerts_count: alertsCount,
          risk, // { score, label }
        };
      })
    );

    /* --------------------------------------------------------
       RETURN
    -------------------------------------------------------- */
    return res.status(200).json({
      ok: true,
      data: enriched,
    });
  } catch (err) {
    console.error("[renewals/list] ERR:", err);
    return res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
}
