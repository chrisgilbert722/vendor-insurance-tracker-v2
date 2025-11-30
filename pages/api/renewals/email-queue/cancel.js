// pages/api/renewals/email-queue/cancel.js

import { sql } from "../../../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ ok: false, error: "Use POST" });
  }

  try {
    const { id, orgId } = req.body;

    if (!id || !orgId) {
      return res.status(400).json({
        ok: false,
        error: "Missing id or orgId",
      });
    }

    await sql`
      UPDATE renewal_email_queue
      SET status = 'cancelled'
      WHERE id = ${id}
        AND org_id = ${orgId};
    `;

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[email-queue/cancel] ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
