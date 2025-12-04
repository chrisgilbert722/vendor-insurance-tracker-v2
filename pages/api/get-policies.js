// pages/api/get-policies.js
import { sql } from "../../lib/db";

// ---- Risk + Score Engine (Enterprise Mode) ---- //

function computeExpiration(expiration_date_str) {
  if (!expiration_date_str)
    return { daysRemaining: null, label: "Unknown", level: "unknown" };

  const [mm, dd, yyyy] = expiration_date_str.split("/");
  const expDate = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
  const today = new Date();

  const diffMs = expDate.getTime() - today.getTime();
  const daysRemaining = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0)
    return { daysRemaining, label: "Expired", level: "expired" };

  if (daysRemaining <= 30)
    return { daysRemaining, label: "Critical", level: "critical" };

  if (daysRemaining <= 90)
    return { daysRemaining, label: "Warning", level: "warning" };

  return { daysRemaining, label: "Active", level: "ok" };
}

function computeComplianceScore(expiration) {
  if (!expiration.daysRemaining && expiration.daysRemaining !== 0) return 0;

  if (expiration.level === "expired") return 20;
  if (expiration.level === "critical") return 40;
  if (expiration.level === "warning") return 70;
  if (expiration.level === "ok") return 100;

  return 0;
}

function computeRiskBucket(score) {
  if (score >= 90) return "Low Risk";
  if (score >= 70) return "Moderate Risk";
  if (score >= 40) return "High Risk";
  return "Severe Risk";
}

function computeUnderwriterColor(score) {
  if (score >= 90) return "#1b5e20";
  if (score >= 70) return "#b59b00";
  if (score >= 40) return "#cc5200";
  return "#b20000";
}

function computeFlags(expiration) {
  const flags = [];

  if (expiration.level === "expired") flags.push("Expired policy");
  if (expiration.level === "critical") flags.push("Expires in ≤30 days");
  if (expiration.level === "warning") flags.push("Expires in ≤90 days");

  return flags;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    // Neon SQL query
    const rows = await sql`
      SELECT id, vendor_name, policy_number, carrier,
             effective_date, expiration_date, coverage_type,
             status, created_at
      FROM policies
      ORDER BY created_at DESC;
    `;

    const policies = rows.map((row) => {
      const expiration = computeExpiration(row.expiration_date);
      const complianceScore = computeComplianceScore(expiration);
      const riskBucket = computeRiskBucket(complianceScore);
      const underwriterColor = computeUnderwriterColor(complianceScore);
      const flags = computeFlags(expiration);

      return {
        ...row,
        expiration,
        complianceScore,
        riskBucket,
        underwriterColor,
        flags
      };
    });

    return res.status(200).json({ ok: true, policies });
  } catch (err) {
    console.error("GET POLICIES ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}

