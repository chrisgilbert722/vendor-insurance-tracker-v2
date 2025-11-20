// --- Elite Evaluation API (G-MODE SEVERITY & SCORING UPGRADE) ---
// Path: /pages/api/elite/evaluate.js

import { EliteEngine } from "../../../lib/elite/engine";
import { getDefaultEliteRules } from "../../../lib/elite/defaultRules";

/**
 * This API now returns:
 *  - rule-by-rule evaluation (pass/warn/fail)
 *  - severity level per rule
 *  - severity-weight per rule (from sliders)
 *  - a full compliance score (0–100)
 *  - summary breakdown (failedWeight, warnWeight, totalWeight)
 *
 * It is fully backward-compatible with the previous version.
 */

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { coidata, severityWeightsByGroup } = req.body || {};

    if (!coidata || typeof coidata !== "object") {
      return res.status(400).json({ ok: false, error: "Missing coidata" });
    }

    // Load rules (later this will come from DB)
    const rules = getDefaultEliteRules();

    // Create engine with optional severity weighting from UI
    const engine = new EliteEngine(rules, {
      severityWeightsByGroup: severityWeightsByGroup || {},
    });

    // Use the NEW severity-weighted evaluation engine
    const evaluation = engine.evaluateWithSummary(
      coidata,
      severityWeightsByGroup || {}
    );

    const { summary, rules: ruleResults } = evaluation;

    // Compute overall verdict using weighted logic:
    // FAIL if score < 50, WARN if score < 80, PASS otherwise.
    let overall = "pass";
    if (summary.score < 50) overall = "fail";
    else if (summary.score < 80) overall = "warn";

    return res.status(200).json({
      ok: true,
      overall,
      score: summary.score,
      summary,
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
