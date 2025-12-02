// pages/api/onboarding/sample-summary.js
import { sql } from "../../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Use POST" });
  }

  try {
    const { aiSample } = req.body;

    if (!aiSample) {
      return res.status(400).json({ ok: false, error: "Missing aiSample" });
    }

    // (Optional) Persist calibration into your org_settings table
    // Example:
    // await sql`
    //   UPDATE organizations
    //   SET sample_coi_ai = ${aiSample}
    //   WHERE id = ${orgId}
    // `;

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[sample-summary] ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
