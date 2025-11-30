import { query } from "../../../lib/db";

export default async function handler(req, res) {
  const jobName = "renewals-cron";

  try {
    const rows = await query(
      `
      SELECT job_name, last_run_at, last_status, last_error, run_count, updated_at
      FROM cron_renewals_heartbeat
      WHERE job_name = $1
      LIMIT 1
      `,
      jobName
    );

    if (!rows[0]) {
      return res.status(200).json({
        ok: false,
        health: "missing",
        message: "No heartbeat record exists",
      });
    }

    const row = rows[0];
    const lastRunAt = row.last_run_at ? new Date(row.last_run_at) : null;

    const now = new Date();
    const diffMinutes = lastRunAt
      ? Math.round((now - lastRunAt) / 60000)
      : null;

    let health = "unknown";

    if (!lastRunAt) health = "unknown";
    else if (row.last_status === "error") health = "error";
    else if (diffMinutes <= 10) health = "healthy";
    else if (diffMinutes <= 60) health = "warning";
    else health = "stale";

    return res.status(200).json({
      ok: true,
      health,
      lastRunAt: row.last_run_at,
      lastStatus: row.last_status,
      lastError: row.last_error,
      runCount: row.run_count,
      diffMinutes,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
