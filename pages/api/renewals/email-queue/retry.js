// pages/api/renewals/email-queue/retry.js

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
      SET status = 'pending'
      WHERE id = ${id}
        AND org_id = ${orgId};
    `;

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[email-queue/retry] ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
