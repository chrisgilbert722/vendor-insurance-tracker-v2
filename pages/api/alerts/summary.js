// pages/api/alerts/summary.js
import { Client } from "pg";

// Helpers
function parseExpiration(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  const [mm, dd, yyyy] = parts;
  const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function computeDaysLeft(dateStr) {
  const d = parseExpiration(dateStr);
  if (!d) return null;
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

    // Load all policies with vendor emails
    const pol = await client.query(
      `SELECT 
         p.id,
         p.vendor_id,
         p.vendor_name,
         p.policy_number,
         p.carrier,
         p.coverage_type,
         p.expiration_date,
         p.status,
         v.email AS vendor_email
       FROM public.policies p
       LEFT JOIN public.vendors v ON v.id = p.vendor_id
       ORDER BY p.expiration_date ASC NULLS LAST`
    );

    const policies = pol.rows || [];

    const expired = [];
    const critical = [];
    const warning = [];

    for (const p of policies) {
      const daysLeft = computeDaysLeft(p.expiration_date);

      const base = {
        ...p,
        daysLeft,
      };

      if (daysLeft === null) continue;

      if (daysLeft < 0) expired.push(base);
      else if (daysLeft <= 30) critical.push(base);
      else if (daysLeft <= 90) warning.push(base);
    }

    // Load all vendors for compliance check
    const vend = await client.query(
      `SELECT id, name FROM public.vendors ORDER BY id ASC`
    );

    const vendors = vend.rows || [];

    const nonCompliant = [];

    for (const v of vendors) {
      try {
        const url = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/requirements/check?vendorId=${v.id}`;
        const resp = await fetch(url);
        const json = await resp.json();

        if (json.ok && json.missing.length > 0) {
          nonCompliant.push({
            vendor_id: v.id,
            vendor_name: v.name,
            missing: json.missing,
          });
        }
      } catch (err) {
        console.error("Compliance check failed for vendor", v.id, err);
      }
    }

    return res.status(200).json({
      ok: true,
      counts: {
        expired: expired.length,
        critical: critical.length,
        warning: warning.length,
        nonCompliant: nonCompliant.length,
      },
      expired,
      critical,
      warning,
      nonCompliant,
    });
  } catch (err) {
    console.error("alerts summary error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  } finally {
    try {
      await client.end();
    } catch {}
  }
}
