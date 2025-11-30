// pages/api/cron/renewals.js
// FULL AUTOPILOT: Renewal Engine + Email Brain + Queue Sender + Heartbeat

import { query } from "../../../lib/db";
import { runRenewalEngineAllOrgsV2 } from "../../../lib/renewalEngineV2";
import { autoEmailBrain, processRenewalEmailQueue } from "../../../lib/autoEmailBrain";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const jobName = "renewals-cron";
  const startedAt = new Date();

  let summary = {
    renewalEngine: null,
    queued: 0,
    sent: 0,
    failed: [],
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
    2. GENERATE AUTO EMAILS + QUEUE THEM
    ============================================================
    */
    const queued = await autoEmailBrain();
    summary.queued = queued?.count || 0;


    /*
    ============================================================
    3. PROCESS EMAIL QUEUE (SEND EMAILS)
    ============================================================
    */
    const sendResults = await processRenewalEmailQueue(40);

    summary.sent = sendResults.filter(r => r.status === "sent").length;
    summary.failed = sendResults
      .filter(r => r.status === "failed")
      .map(r => r.id);


    /*
    ============================================================
    4. WRITE HEARTBEAT (SUCCESS)
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


    /*
    ============================================================
    RETURN SUCCESS
    ============================================================
    */
    return res.status(200).json({
      ok: true,
      jobName,
      startedAt,
      finishedAt: new Date(),
      summary,
    });

  } catch (err) {
    const msg = err?.message || "Unknown error";

    /*
    ============================================================
    WRITE HEARTBEAT (FAILURE)
    ============================================================
    */
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

    /*
    ============================================================
    RETURN FAILURE
    ============================================================
    */
    return res.status(500).json({
      ok: false,
      jobName,
      error: msg,
    });
  }
}
