import { Client } from "pg";

// Simple helper shared with dashboard risk logic
function parseExpiration(dateStr) {
  if (!dateStr) return null;
  const [mm, dd, yyyy] = dateStr.split("/");
  if (!mm || !dd || !yyyy) return null;
  return new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
}

function computeDaysLeft(dateStr) {
  const d = parseExpiration(dateStr);
  if (!d || Number.isNaN(d.getTime())) return null;
  return Math.floor((d - new Date()) / (1000 * 60 * 60 * 24));
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    const result = await client.query(
      `SELECT id,
              vendor_id,
              vendor_name,
              policy_number,
              carrier,
              coverage_type,
              expiration_date,
              status
       FROM public.policies
       ORDER BY expiration_date ASC NULLS LAST`
    );

    const policies = result.rows || [];

    const expired = [];
    const critical = []; // ≤30 days
    const warning = [];  // 31–90 days

    for (const p of policies) {
      const daysLeft = computeDaysLeft(p.expiration_date);
      const base = {
        id: p.id,
        vendor_id: p.vendor_id,
        vendor_name: p.vendor_name || "Unknown vendor",
        policy_number: p.policy_number || "Unknown policy",
        carrier: p.carrier || "Unknown carrier",
        coverage_type: p.coverage_type || "Unknown coverage",
        expiration_date: p.expiration_date || null,
        daysLeft,
        status: p.status || "active",
      };

      if (daysLeft === null) continue;

      if (daysLeft < 0) {
        expired.push(base);
      } else if (daysLeft <= 30) {
        critical.push(base);
      } else if (daysLeft <= 90) {
        warning.push(base);
      }
    }

    return res.status(200).json({
      ok: true,
      counts: {
        expired: expired.length,
        critical: critical.length,
        warning: warning.length,
      },
      expired: expired.slice(0, 25),
      critical: critical.slice(0, 25),
      warning: warning.slice(0, 25),
    });
  } catch (err) {
    console.error("alerts/summary error:", err);
    return res
      .status(500)
      .json({ ok: false, error: err.message || "Failed to load alerts" });
  } finally {
    try {
      await client.end();
    } catch {
      // ignore
    }
  }
}
