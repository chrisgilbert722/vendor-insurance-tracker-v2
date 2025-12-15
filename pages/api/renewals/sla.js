// pages/api/renewals/sla.js
// ============================================================
// RENEWALS SLA — UUID SAFE + SKIP SAFE
// Never throws. Never casts UUIDs. Enterprise-grade.
// ============================================================

import { sql } from "../../../lib/db";
import { cleanUUID } from "../../../lib/uuid";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ ok: false, error: "GET only" });
  }

  try {
    const orgId = cleanUUID(req.query.orgId);

    // HARD SKIP — dashboard safety
    if (!orgId) {
      return res.status(200).json({
        ok: true,
        skipped: true,
        total: 0,
        breached: 0,
        dueSoon: 0,
        onTrack: 0,
      });
    }

    // SLA rules:
    // - breached: expired
    // - dueSoon: expires within 7 days
    // - onTrack: everything else

    const rows = await sql`
      SELECT
        expiration_date
      FROM policies
      WHERE org_id = ${orgId}
        AND expiration_date IS NOT NULL;
    `;

    let breached = 0;
    let dueSoon = 0;
    let onTrack = 0;

    const now = Date.now();

    for (const r of rows) {
      const exp = new Date(r.expiration_date).getTime();
      const daysLeft = Math.floor((exp - now) / 86400000);

      if (daysLeft < 0) breached += 1;
      else if (daysLeft <= 7) dueSoon += 1;
      else onTrack += 1;
    }

    return res.status(200).json({
      ok: true,
      total: rows.length,
      breached,
      dueSoon,
      onTrack,
    });
  } catch (err) {
    console.error("[renewals/sla] ERROR:", err);

    // NEVER BREAK DASHBOARD
    return res.status(200).json({
      ok: false,
      total: 0,
      breached: 0,
      dueSoon: 0,
      onTrack: 0,
    });
  }
}
