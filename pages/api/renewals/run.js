// pages/api/renewals/run.js
// Renewal Engine V2 — Manual / Cron Entrypoint

import { runRenewalEngineAllOrgsV2 } from "../../../lib/renewalEngineV2";

export default async function handler(req, res) {
  // Allow GET for testing, POST for cron / automation
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    // Run renewal engine V2 for all orgs
    const results = await runRenewalEngineAllOrgsV2();

    return res.status(200).json({
      ok: true,
      engine: "v2",
      results,
    });
  } catch (err) {
    console.error("[renewals/run] ERROR", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
