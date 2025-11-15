// pages/api/metrics/snapshot.js
import { Client } from "pg";

// same expiration engine as get-policies
function computeExpiration(expiration_date_str) {
  if (!expiration_date_str)
    return { level: "unknown", daysRemaining: null, scorePenalty: 50 };

  const [mm, dd, yyyy] = expiration_date_str.split("/");
  if (!mm || !dd || !yyyy)
    return { level: "unknown", daysRemaining: null, scorePenalty: 50 };

  const expDate = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
  const today = new Date();
  const diffMs = expDate.getTime() - today.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0)
    return { level: "expired", daysRemaining: diffDays, scorePenalty: 100 };
  if (diffDays <= 15)
    return { level: "critical", daysRemaining: diffDays, scorePenalty: 60 };
  if (diffDays <= 45)
    return { level: "warning", daysRemaining: diffDays, scorePenalty: 30 };

  return { level: "ok", daysRemaining: diffDays, scorePenalty: 0 };
}

function computeScore(expiration) {
  let score = 100;
  score -= expiration.scorePenalty;
  if (score < 0) score = 0;
  return score;
}

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  let client;
  try {
    client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    const result = await client.query(
      `SELECT expiration_date
       FROM policies`
    );

    let expired = 0;
    let critical = 0;
    let warning = 0;
    let ok = 0;

    let totalScore = 0;
    let scoredCount = 0;

    for (const row of result.rows) {
      const expiration = computeExpiration(row.expiration_date);
      const score = computeScore(expiration);

      switch (expiration.level) {
        case "expired":
          expired++;
          break;
        case "critical":
          critical++;
          break;
        case "warning":
          warning++;
          break;
        case "ok":
          ok++;
          break;
        default:
          break;
      }

      totalScore += score;
      scoredCount++;
    }

    const avgScore = scoredCount > 0 ? totalScore / scoredCount : null;

    await client.query(
      `INSERT INTO dashboard_metrics
        (expired_count, critical_count, warning_count, ok_count, avg_score)
       VALUES ($1, $2, $3, $4, $5)`,
      [expired, critical, warning, ok, avgScore]
    );

    await client.end();

    return res.status(200).json({
      ok: true,
      expired,
      critical,
      warning,
      ok,
      avgScore,
    });
  } catch (err) {
    console.error("METRICS SNAPSHOT ERROR:", err);
    if (client) {
      try { await client.end(); } catch {}
    }
    return res.status(500).json({ ok: false, error: err.message });
  }
}
