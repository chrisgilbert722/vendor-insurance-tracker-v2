// pages/api/get-policies.js
import { Client } from "pg";

// 🔥 Master expiration + scoring engine
function computeExpiration(expiration_date_str) {
  if (!expiration_date_str)
    return {
      label: "Unknown",
      level: "unknown",
      daysRemaining: null,
      scorePenalty: 50, // huge penalty
    };

  // Expecting MM/DD/YYYY
  const [mm, dd, yyyy] = expiration_date_str.split("/");
  if (!mm || !dd || !yyyy)
    return {
      label: "Unknown",
      level: "unknown",
      daysRemaining: null,
      scorePenalty: 50,
    };

  const expDate = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
  const today = new Date();
  const diffMs = expDate.getTime() - today.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0)
    return {
      label: "Expired",
      level: "expired",
      daysRemaining: diffDays,
      scorePenalty: 100,
    };
  if (diffDays <= 15)
    return {
      label: "Critical",
      level: "critical",
      daysRemaining: diffDays,
      scorePenalty: 60,
    };
  if (diffDays <= 45)
    return {
      label: "Warning",
      level: "warning",
      daysRemaining: diffDays,
      scorePenalty: 30,
    };

  return {
    label: "Active",
    level: "ok",
    daysRemaining: diffDays,
    scorePenalty: 0,
  };
}

// 🔥 Compute compliance score (0–100)
function computeScore(policy) {
  let score = 100;

  // Penalty based on expiration risk
  score -= policy.expiration.scorePenalty;

  // Future scoring rules:
  // - Missing endorsements  ( -15 )
  // - Weak carrier rating   ( -10 )
  // - Missing fields        ( -5 each )
  // - Incomplete extraction ( -20 )
  // - Missing additional insured ( -25 )

  if (score < 0) score = 0;
  return score;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  let client;
  try {
    client = new Client({
      connectionString: process.env.DATABASE_URL,
    });
    await client.connect();

    const result = await client.query(
      `SELECT id, vendor_name, policy_number, carrier, effective_date, expiration_date, coverage_type, status, created_at
       FROM policies
       ORDER BY created_at DESC`
    );

    // 🔥 Apply the full risk & score engine to each policy
    const policies = result.rows.map((p) => {
      const expiration = computeExpiration(p.expiration_date);
      const complianceScore = computeScore({ expiration });

      return {
        ...p,
        expiration,
        complianceScore,
      };
    });

    await client.end();

    return res.status(200).json({
      ok: true,
      policies,
    });
  } catch (err) {
    console.error("GET POLICIES ERROR:", err);
    if (client) {
      try {
        await client.end();
      } catch {}
      return res.status(500).json({ ok: false, error: err.message });
    }
  }
}
