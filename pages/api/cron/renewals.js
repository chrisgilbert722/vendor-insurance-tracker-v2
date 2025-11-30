// pages/api/cron/renewals.js
// FULLY WIRED AUTOPILOT CRON — Renewals + Email Brain + Queue + Heartbeat

import { query } from "../../../src/lib/db";
import { runRenewalEngineAllOrgsV2 } from "../../../lib/renewalEngineV2";
import { autoEmailBrain } from "../../../lib/autoEmailBrain";
import { processRenewalEmailQueue } from "../../../lib/autoEmailBrain";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const jobName = "renewals-cron";
  const startedAt = new Date();
  let summary = {
    renewalEngine: null,
    queueCreated: 0,
    queueSent: 0,
    failures: [],
  };

  try {
    /*
    ============================================================
    1. RUN RENEWAL ENGINE FOR ALL ORGS
    ============================================================
    */
    const renewalOutput = await runRenewalEngineAllOrgsV2();
    summary.renewalEngine = renewalOutput;

    /*
    ============================================================
    2. GENERATE + QUEUE AUTO EMAILS (AI)
    ============================================================
    */
    const queued = await autoEmailBrain();
    summary.queueCreated = queued?.count || 0;

    /*
    ============================================================
    3. SEND QUEUED EMAILS
    ============================================================
    */
    const sendResults = await processRenewalEmailQueue(40);
    summary.queueSent = sendResults.filter(r => r.status === "sent").length;
    summary.failures = sendResults
      .filter(r => r.status === "failed")
      .map(f => f.id);

    /*
    ============================================================
    4. HEARTBEAT — SUCCESS
    ============================================================
    */
    await query(
      `
      INSERT INTO cron_renewals_heartbeat
        (job_name, last_run_at, last_status, last_error, run_count)
      VALUES ($1, NOW(), 'ok', '', 1)
      ON CONFLICT (job_name)
      DO UPDATE SET
        last_run_at = NOW(),
        last_status = 'ok',
        last_error = '',
        run_count = cron_renewals_heartbeat.run_count + 1,
        updated_at = NOW()
      `,
      jobName
    );

    return res.status(200).json({
      ok: true,
      jobName,
      startedAt,
      finishedAt: new Date(),
      summary,
    });

  } catch (err) {
    /*
    ============================================================
    5. HEARTBEAT — FAILURE
    ============================================================
    */
    const msg = err?.message || "Unknown error";

    await query(
      `
      INSERT INTO cron_renewals_heartbeat
        (job_name, last_run_at, last_status, last_error, run_count)
      VALUES ($1, NOW(), 'error', $2, 1)
      ON CONFLICT (job_name)
      DO UPDATE SET
        last_run_at = NOW(),
        last_status = 'error',
        last_error = $2,
        run_count = cron_renewals_heartbeat.run_count + 1,
        updated_at = NOW()
      `,
      jobName,
      msg
    );

    return res.status(500).json({
      ok: false,
      jobName,
      error: msg,
    });
  }
}
