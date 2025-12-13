// pages/api/renewals/auto-email-run.js
// Auto-Email Brain Phase 3 — cron entrypoint (BUILD SAFE)

import { sql } from "../../../lib/db";
import {
  planAutoEmailForRenewal,
  processRenewalEmailQueue,
} from "../../../lib/autoEmailBrain";
import { computeRenewalStage } from "../../../lib/renewalEngineV2";

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res
      .status(405)
      .json({ ok: false, error: "Use GET or POST." });
  }

  try {
    // 1) Load orgs
    const orgRows = await sql`SELECT DISTINCT org_id FROM policies;`;

    const summary = [];

    for (const org of orgRows) {
      const orgId = org.org_id;

      // Load org name (correct table)
      let orgName = `Org #${orgId}`;
      try {
        const orgMeta = await sql`
          SELECT name FROM orgs WHERE id = ${orgId} LIMIT 1;
        `;
        if (orgMeta[0]?.name) orgName = orgMeta[0].name;
      } catch (_) {}

      // 2) Find due renewal schedules
      const schedules = await sql`
        SELECT
          prs.*,
          v.name AS vendor_name,
          p.coverage_type,
          p.expiration_date
        FROM policy_renewal_schedule prs
        JOIN vendors v ON v.id = prs.vendor_id
        JOIN policies p ON p.id = prs.policy_id
        WHERE prs.org_id = ${orgId}
          AND prs.status = 'active'
          AND prs.next_check_at <= NOW();
      `;

      const now = new Date();
      const plans = [];

      for (const row of schedules) {
        const exp = new Date(row.expiration_date);
        const daysLeft = Math.floor((exp - now) / 86400000);

        const stage = computeRenewalStage({
          expiration_date: row.expiration_date,
        });

        if (stage === null) continue;

        // Compliance summary (optional)
        const compRows = await sql`
          SELECT summary
          FROM vendor_compliance_cache
          WHERE org_id = ${orgId}
            AND vendor_id = ${row.vendor_id}
          LIMIT 1;
        `;
        const complianceSummary = compRows[0]?.summary || "";

        // 3) Plan emails (vendor + broker handled internally)
        await planAutoEmailForRenewal({
          scheduleRow: row,
          orgName,
          vendorName: row.vendor_name,
          coverage: row.coverage_type,
          stage,
          daysLeft,
          expDate: row.expiration_date,
          complianceSummary,
        });

        // 4) Update schedule to prevent spam
        await sql`
          UPDATE policy_renewal_schedule
          SET next_check_at = NOW() + INTERVAL '24 hours',
              last_checked_at = NOW()
          WHERE id = ${row.id};
        `;

        plans.push({ policyId: row.policy_id, stage, daysLeft });
      }

      // 5) Send queued emails
      const processed = await processRenewalEmailQueue(50);

      summary.push({
        orgId,
        plannedEmails: plans.length,
        processed: processed.length,
      });
    }

    return res.status(200).json({ ok: true, summary });
  } catch (err) {
    console.error("[auto-email-run] ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
