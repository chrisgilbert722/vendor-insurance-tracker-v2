// pages/api/onboarding/analyze-csv.js
// ============================================================
// AI ONBOARDING — VENDOR CSV ANALYSIS
// - Logs vendors_analyzed activity
// - Safe for autopilot + resume
// ============================================================

import { analyzeVendorCsv } from "../../../lib/onboardingAiBrain";
import { sql } from "../../../lib/db";
import { resolveOrg } from "../../../lib/resolveOrg";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { csvText } = req.body;

    if (!csvText) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing csvText in body" });
    }

    // 🔑 Resolve external_uuid -> INTERNAL org INT (optional but preferred)
    const orgIdInt = await resolveOrg(req, res);

    // Run analysis (unchanged behavior)
    const result = await analyzeVendorCsv({
      orgId: orgIdInt || null,
      csvText,
    });

    // Count CSV rows (best-effort)
    const rowCount =
      typeof csvText === "string"
        ? Math.max(csvText.split("\n").length - 1, 0)
        : null;

    // ---------------- 🔥 AI ACTIVITY LOG ----------------
    if (orgIdInt) {
      await sql`
        INSERT INTO ai_activity_log (org_id, event_type, message, metadata)
        VALUES (
          ${orgIdInt},
          'vendors_analyzed',
          'AI analyzed vendor CSV',
          ${JSON.stringify({
            rowCount,
            hasOrgContext: true,
          })}
        );
      `;
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error("[onboarding/analyze-csv] error", err);
    return res.status(500).json({
      ok: false,
      error: err?.message || "Unknown error",
    });
  }
}
