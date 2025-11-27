// pages/api/rules/evaluate.js

/**
 * Backend evaluation engine for Requirements V3.5
 * - Supports multi-condition rules (logic: "all" | "any")
 * - Supports endorsement fields (endorsement.*)
 * - Mirrors frontend evaluateRule(), but runs on server
 *
 * This endpoint can be called directly (for debugging)
 * or required/imported by /api/engine/run-v3 to batch-evaluate
 * rules against many policies.
 */

export const config = {
  api: { bodyParser: true },
};

/**
 * Normalize numeric-like values (handles commas, $, spaces, etc)
 */
function normalizeNum(v) {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const clean = v.replace(/[^0-9.\-]/g, "");
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

/**
 * Evaluate a single condition against a policy object
 * condition: { field_key, operator, expected_value }
 */
function evaluateCondition(condition, policy) {
  if (!condition || !condition.field_key) return false;

  const { field_key, operator, expected_value } = condition;
  const rawVal = policy?.[field_key];

  switch (operator) {
    case "equals":
      return String(rawVal) === String(expected_value);

    case "not_equals":
      return String(rawVal) !== String(expected_value);

    case "contains":
      return String(rawVal || "")
        .toLowerCase()
        .includes(String(expected_value || "").toLowerCase());

    case "gte": {
      const a = normalizeNum(rawVal);
      const b = normalizeNum(expected_value);
      if (a === null || b === null) return false;
      return a >= b;
    }

    case "lte": {
      const a = normalizeNum(rawVal);
      const b = normalizeNum(expected_value);
      if (a === null || b === null) return false;
      return a <= b;
    }

    default:
      // Unknown operator → fail safe
      return false;
  }
}

/**
 * Evaluate a multi-condition rule against a policy
 *
 * Rule shape:
 * {
 *   logic: "all" | "any",
 *   conditions: [{ field_key, operator, expected_value }, ...],
 *   field_key, operator, expected_value  // legacy top-level
 *   ...
 * }
 *
 * Returns: { passed: boolean, conditionResults: boolean[] }
 */
export function evaluateRule(rule, policy) {
  if (!rule || rule.is_active === false) {
    return { passed: false, conditionResults: [] };
  }

  const logic = rule.logic || "all";

  const conditions =
    Array.isArray(rule.conditions) && rule.conditions.length
      ? rule.conditions
      : [
          {
            field_key: rule.field_key,
            operator: rule.operator,
            expected_value: rule.expected_value,
          },
        ];

  const conditionResults = conditions.map((c) =>
    evaluateCondition(c, policy)
  );

  let passed;
  if (logic === "any") {
    passed = conditionResults.some(Boolean);
  } else {
    // default = ALL
    passed = conditionResults.every(Boolean);
  }

  return { passed, conditionResults };
}

/**
 * API handler:
 * POST /api/rules/evaluate
 * Body: { rule, policy }
 * Response: { ok, passed, conditionResults }
 */
export default async function handler(req, res) {
  const { method } = req;

  if (method !== "POST") {
    return res
      .status(405)
      .json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { rule, policy } = req.body || {};

    if (!rule || typeof rule !== "object") {
      return res
        .status(400)
        .json({ ok: false, error: "Missing rule in body" });
    }

    const { passed, conditionResults } = evaluateRule(rule, policy || {});
    return res.json({ ok: true, passed, conditionResults });
  } catch (err) {
    console.error("RULE EVALUATE API ERROR:", err);
    return res
      .status(500)
      .json({ ok: false, error: err.message || "Evaluation failed" });
  }
}
