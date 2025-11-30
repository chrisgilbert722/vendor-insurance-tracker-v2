// pages/api/renewals/escalate.js

import { sql } from "../../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ ok: false, error: "Use POST" });
  }

  try {
    const {
      orgId,
      vendorId,
      policyId,
      actionType, // "broker", "vendor", "internal"
      message,
    } = req.body;

    if (!orgId || !vendorId || !actionType) {
      return res.status(400).json({
        ok: false,
        error: "Missing orgId, vendorId or actionType",
      });
    }

    // Simple logging into an audit-style table (create separately if needed)
    await sql`
      INSERT INTO renewal_escalations (
        org_id,
        vendor_id,
        policy_id,
        action_type,
        message,
        created_at
      )
      VALUES (
        ${orgId},
        ${vendorId},
        ${policyId || null},
        ${actionType},
        ${message || null},
        NOW()
      );
    `;

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[renewals/escalate] ERROR:", err);
    return res
      .status(500)
      .json({ ok: false, error: err.message });
  }
}
