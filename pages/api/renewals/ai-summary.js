// pages/api/renewals/ai-summary.js
import { sql } from "../../../lib/db";
import { resolveOrg } from "../../../lib/resolveOrg";

export default async function handler(req, res) {
  // ✅ Allow GET and POST (frontend may POST later)
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ ok: false });
  }

  try {
    // 🔒 Resolve org (external UUID → internal INT)
    const orgId = await resolveOrg(req, res);
    if (!orgId) return; // resolveOrg already responded

    // 🔎 Gather minimal facts (SAFE if empty)
    const rows = await sql`
      SELECT
        COUNT(*) FILTER (WHERE p.expires_at < NOW()) AS expired,
        COUNT(*) FILTER (
          WHERE p.expires_at >= NOW()
            AND p.expires_at < NOW() + INTERVAL '30 days'
        ) AS expiring_soon,
        COUNT(*) AS total
      FROM policies p
      JOIN vendors v ON v.id = p.vendor_id
      WHERE v.org_id = ${orgId};
    `;

    const stats = rows?.[0] || {
      expired: 0,
      expiring_soon: 0,
      total: 0,
    };

    // 🧠 Deterministic summary (no AI yet — SAFE)
    const summary =
      Number(stats.total) === 0
        ? "No vendor policies found yet."
        : `You have ${stats.total} policies. ${stats.expired} are expired and ${stats.expiring_soon} expire within 30 days.`;

    return res.status(200).json({
      ok: true,
      summary,
      stats,
    });
  } catch (err) {
    console.error("[renewals/ai-summary] ERROR:", err);

    // 🔇 NEVER break UI — return safe empty payload
    return res.status(200).json({
      ok: true,
      summary: "Renewal data is not available yet.",
      stats: { expired: 0, expiring_soon: 0, total: 0 },
    });
  }
}
