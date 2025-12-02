// pages/api/vendor/fix-issue.js
import { sql } from "../../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Use POST" });
  }

  try {
    const { vendorId, orgId, code } = req.body;

    if (!vendorId || !orgId || !code) {
      return res.status(400).json({
        ok: false,
        error: "vendorId, orgId, and code are required",
      });
    }

    // Mark matching unresolved alert as resolved
    await sql`
      UPDATE alerts_v2
      SET 
        resolved = TRUE,
        resolved_at = NOW()
      WHERE vendor_id = ${vendorId}
        AND org_id = ${orgId}
        AND code = ${code}
        AND resolved = FALSE;
    `;

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[fix-issue]", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
