// pages/api/renewals/run.js
//
// Renewal Intelligence V3 — Cron / Manual Entrypoint
// This replaces the old V2 engine entirely.
//
// Responsibilities:
//  1. Load all expiring policies
//  2. Classify renewal status (pending / due_soon / critical / overdue)
//  3. Compute renewal risk score
//  4. Auto-queue reminder emails (30d / 14d / 7d / 3d / 1d)
//  5. Log vendor timeline events
//  6. Return detailed renewal results
//

import { sql } from "../../../lib/db";
import { classifyRenewal } from "../../../lib/classifyRenewal";
import { predictRenewalRisk } from "../../../lib/predictRenewalRisk";
import { logRenewalEvent } from "../../../lib/logRenewalEvent";

export default async function handler(req, res) {
  // Allow GET + POST for testing and cron
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    /* --------------------------------------------------------
       1) LOAD ALL POLICIES THAT HAVE AN EXPIRATION DATE
    -------------------------------------------------------- */
    const policies = await sql`
      SELECT 
        p.id AS policy_id,
        p.vendor_id,
        p.org_id,
        p.expiration_date
      FROM policies p
      WHERE p.expiration_date IS NOT NULL
    `;

    const results = [];

    /* --------------------------------------------------------
       PROCESS EACH POLICY
    -------------------------------------------------------- */
    for (const p of policies) {
      const vendorId = p.vendor_id;
      const orgId = p.org_id;
      const expirationDate = p.expiration_date;

      /* --------------------------------------------------------
         2) CLASSIFY RENEWAL STATUS 
           pending | due_soon | critical | overdue | missing
      -------------------------------------------------------- */
      const status = classifyRenewal(expirationDate);

      /* --------------------------------------------------------
         3) COMPUTE RENEWAL RISK SCORE (0–100)
      -------------------------------------------------------- */
      const alertCountRows = await sql`
        SELECT COUNT(*)::int AS c
        FROM vendor_alerts
        WHERE vendor_id = ${vendorId};
      `;

      const alertsCount = alertCountRows[0].c;

      const risk = predictRenewalRisk({
        expirationDate,
        alertsCount,
      });

      /* --------------------------------------------------------
         4) AUTO-QUEUE REMINDER EMAILS
      -------------------------------------------------------- */
      if (
        status === "due_soon" ||
        status === "critical" ||
        status === "overdue"
      ) {
        try {
          await fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL}/api/renewals/queue-email`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                vendorId,
                orgId,
                expirationDate,
                type: status,
              }),
            }
          );
        } catch (err) {
          console.error("[RENEWAL REMINDER ERROR]", err);
        }
      }

      /* --------------------------------------------------------
         5) LOG TIMELINE ENTRY
      -------------------------------------------------------- */
      await logRenewalEvent(
        vendorId,
        "renewal_status",
        `Renewal status: ${status}, risk: ${risk.label}, score: ${risk.score}.`,
        status === "critical" || status === "overdue" ? "critical" : "info"
      );

      /* --------------------------------------------------------
         6) PUSH RESULT ROW
      -------------------------------------------------------- */
      results.push({
        vendorId,
        policyId: p.policy_id,
        expirationDate,
        status,
        risk,
      });
    }

    /* --------------------------------------------------------
       RETURN RESULTS
    -------------------------------------------------------- */
    return res.status(200).json({
      ok: true,
      engine: "v3",
      count: results.length,
      results,
    });
  } catch (err) {
    console.error("[RENEWALS RUN ERROR]", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
