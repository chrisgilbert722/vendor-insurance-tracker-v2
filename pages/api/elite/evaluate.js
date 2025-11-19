// --- Elite Evaluation API (Phase C – Drop 3) ---
// Place at: /pages/api/elite/evaluate.js

import { EliteEngine } from "../../../lib/elite/engine";
import { getDefaultEliteRules } from "../../../lib/elite/defaultRules";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { coidata } = req.body || {};
    if (!coidata || typeof coidata !== "object") {
      return res.status(400).json({ ok: false, error: "Missing coidata" });
    }

    // In the future you can load rules from DB.
    // For now we use the default Elite rules.
    const rules = getDefaultEliteRules();
    const engine = new EliteEngine(rules);

    const ruleResults = engine.evaluateAll(coidata);

    // Overall verdict:
    // - if ANY FAIL => FAIL
    // - else if ANY WARN => WARN
    // - else PASS
    let overall = "pass";
    if (ruleResults.some((r) => r.result === "fail")) {
      overall = "fail";
    } else if (ruleResults.some((r) => r.result === "warn")) {
      overall = "warn";
    }

    return res.status(200).json({
      ok: true,
      overall,
      rules: ruleResults,
    });
  } catch (err) {
    console.error("Elite evaluate error:", err);
    return res.status(500).json({
      ok: false,
      error: "Elite engine error",
    });
  }
}
