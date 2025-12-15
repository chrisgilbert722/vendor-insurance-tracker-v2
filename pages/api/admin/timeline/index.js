// pages/api/admin/timeline/index.js
// UUID-safe, skip-safe admin compliance timeline (direct SQL)

import { sql } from "../../../../lib/db";
import { cleanUUID } from "../../../../lib/uuid";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "GET only" });
  }

  try {
    const orgId = cleanUUID(req.query.orgId);

    // HARD GUARD — never crash UI
    if (!orgId) {
      return res.status(200).json({
        ok: false,
        skipped: true,
        events: [],
      });
    }

    const limit = Math.max(
      1,
      Math.min(500, Number(req.query.limit || 100))
    );

    const rows = await sql`
      SELECT
        id,
        org_id,
        vendor_id,
        alert_id,
        event_type,
        source,
        payload,
        occurred_at
      FROM compliance_events
      WHERE org_id = ${orgId}
      ORDER BY occurred_at DESC
      LIMIT ${limit};
    `;

    return res.status(200).json({
      ok: true,
      events: rows || [],
    });
  } catch (err) {
    // NEVER bubble to UI
    console.error("[admin/timeline] swallowed error:", err);
    return res.status(200).json({
      ok: false,
      skipped: true,
      events: [],
    });
  }
}

