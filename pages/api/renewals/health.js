// pages/api/renewals/health.js
import { query, sql } from "../../../lib/db";

export default async function handler(req, res) {
  const jobName = "renewals-cron";

  try {
    // HEARTBEAT ROW
    const rows = await query(
      `
      SELECT job_name, last_run_at, last_status, last_error, run_count, updated_at
      FROM cron_renewals_heartbeat
      WHERE job_name = $1
      LIMIT 1
      `,
      jobName
    );

    const row = rows[0];

    // BASIC "NO RECORD" CASE
    if (!row) {
      // still return queue metrics so you can see backlog even if cron never ran
      const [pendingRow] = await sql`
        SELECT COUNT(*)::int AS count
        FROM renewal_email_queue
        WHERE status = 'pending';
      `;
      const pendingCount = Number(pendingRow?.count || 0);

      return res.status(200).json({
        ok: false,
        health: "missing",
        message: "No heartbeat record yet",
        queuePending: pendingCount,
        queueFailedLastHour: 0,
        queueStalePending: 0,
      });
    }

    const now = new Date();
    const lastRunAt = row.last_run_at ? new Date(row.last_run_at) : null;

    let diffMinutes = null;
    if (lastRunAt) {
      diffMinutes = Math.round((now - lastRunAt) / 60000);
    }

    // QUEUE METRICS
    const [pendingRow] = await sql`
      SELECT COUNT(*)::int AS count
      FROM renewal_email_queue
      WHERE status = 'pending';
    `;
    const pendingCount = Number(pendingRow?.count || 0);

    const [failedLastHourRow] = await sql`
      SELECT COUNT(*)::int AS count
      FROM renewal_email_queue
      WHERE status = 'failed'
        AND last_attempt_at >= NOW() - INTERVAL '1 hour';
    `;
    const failedLastHour = Number(failedLastHourRow?.count || 0);

    const [staleRow] = await sql`
      SELECT COUNT(*)::int AS count
      FROM renewal_email_queue
      WHERE status = 'pending'
        AND created_at <= NOW() - INTERVAL '24 hours';
    `;
    const stalePending = Number(staleRow?.count || 0);

    const [lastFailRow] = await sql`
      SELECT MAX(last_attempt_at) AS last_failure_at
      FROM renewal_email_queue
      WHERE status = 'failed';
    `;
    const lastFailureAt = lastFailRow?.last_failure_at || null;

    // QUEUE STATUS (for SLA-ish signal)
    let queueStatus = "clear";
    if (failedLastHour > 0) {
      queueStatus = "failing";
    } else if (stalePending > 0) {
      queueStatus = "late";
    } else if (pendingCount > 0) {
      queueStatus = "backlog";
    }

    // OVERALL HEALTH
    let health = "unknown";

    if (!lastRunAt) {
      health = "unknown";
    } else if (row.last_status === "error" || queueStatus === "failing") {
      health = "error";
    } else if (diffMinutes !== null && diffMinutes > 60) {
      health = "stale";
    } else if (queueStatus === "backlog" || queueStatus === "late") {
      health = "warning";
    } else if (diffMinutes !== null && diffMinutes <= 10) {
      health = "healthy";
    } else {
      health = "warning";
    }

    return res.status(200).json({
      ok: true,
      jobName,
      health,
      lastRunAt: row.last_run_at,
      lastStatus: row.last_status,
      lastError: row.last_error,
      runCount: row.run_count,
      diffMinutes,
      queuePending: pendingCount,
      queueFailedLastHour: failedLastHour,
      queueStalePending: stalePending,
      lastFailureAt,
      queueStatus,
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      health: "error",
      error: err?.message || "Unknown error",
    });
  }
}
