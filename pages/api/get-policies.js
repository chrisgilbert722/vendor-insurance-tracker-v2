// pages/api/get-policies.js
import { Client } from "pg";

function computeStatus(expiration_date_str) {
  if (!expiration_date_str) return { label: "unknown", level: "unknown" };

  // Expecting MM/DD/YYYY
  const [mm, dd, yyyy] = expiration_date_str.split("/");
  if (!mm || !dd || !yyyy) return { label: "unknown", level: "unknown" };

  const expDate = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
  const today = new Date();
  const diffMs = expDate.getTime() - today.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { label: "Expired", level: "expired" };
  if (diffDays <= 30) return { label: "Expires ≤ 30 days", level: "critical" };
  if (diffDays <= 90) return { label: "Expires ≤ 90 days", level: "warning" };
  return { label: "Active", level: "ok" };
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

    const policies = result.rows.map((p) => {
      const statusInfo = computeStatus(p.expiration_date);
      return { ...p, computedStatus: statusInfo };
    });

    await client.end();

    return res.status(200).json({
      ok: true,
      policies,
    });
  } catch (err) {
    console.error("GET POLICIES ERROR:", err);
    if (client) {
      try { await client.end(); } catch {}
    }
    return res.status(500).json({ ok: false, error: err.message });
  }
}
