// pages/api/renewals/email-queue/list.js

import { sql } from "../../../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res
      .status(405)
      .json({ ok: false, error: "Use GET" });
  }

  try {
    const orgId = Number(req.query.orgId || 0);
    const status = req.query.status || "all";
    const limit = Number(req.query.limit || 100);

    if (!orgId) {
      return res.status(400).json({
        ok: false,
        error: "Missing orgId",
      });
    }

    let whereClause = sql`
      org_id = ${orgId}
    `;

    if (status !== "all") {
      whereClause = sql`${whereClause} AND status = ${status}`;
    }

    const rows = await sql`
      SELECT *
      FROM renewal_email_queue
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${limit};
    `;

    return res.status(200).json({ ok: true, items: rows });
  } catch (err) {
    console.error("[email-queue/list] ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
