// pages/api/renewals/run.js
// Manual/cron entrypoint for the Renewal Engine

import { runRenewalEngineForAllOrgs } from "../../../lib/renewalEngine";

export default async function handler(req, res) {
  // Allow GET for quick tests, POST for cron jobs
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const results = await runRenewalEngineForAllOrgs();
    return res.status(200).json({ ok: true, results });
  } catch (err) {
    console.error("[renewals/run] ERROR", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
