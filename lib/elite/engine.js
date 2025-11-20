// lib/elite/engine.js
import {
  CONDITION_TYPES,
  ACTION_TYPES,
  EliteRule,
} from "./models";

/**
 * Default severity weights used if none are provided.
 * These should roughly match the sliders in the UI.
 */
const DEFAULT_SEVERITY_WEIGHTS = {
  high: 1.0,
  medium: 0.7,
  low: 0.4,
};

export class EliteEngine {
  /**
   * @param {EliteRule[]} rules
   * @param {Object} options
   *   - severityWeightsByGroup: {
   *       [groupId]: { high: number, medium: number, low: number }
   *     }
   */
  constructor(rules = [], options = {}) {
    this.rules = rules;
    this.severityWeightsByGroup = options.severityWeightsByGroup || {}; // optional, can be overridden per call
  }

  /**
   * Backwards-compatible per-rule evaluation.
   * This is the same shape you already had, with some extra fields added (non-breaking).
   */
  evaluateOne(rule, coidata) {
    let passed = true;

    for (const condition of rule.conditions || []) {
      const ok = this.evaluateCondition(condition, coidata);
      if (!ok) {
        passed = false;
        break;
      }
    }

    // NOTE: keep the same result mapping as before: pass uses rule.action.type, fail forces FAIL
    const resultType = passed
      ? (rule.action?.type || ACTION_TYPES.PASS)
      : ACTION_TYPES.FAIL;

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      result: resultType,
      label: rule.action?.label,
      passed,
    };
  }

  /**
   * Backwards compatible:
   * Returns an array of per-rule results (same as original implementation).
   */
  evaluateAll(coidata) {
    return this.rules.map((rule) => this.evaluateOne(rule, coidata));
  }

  /**
   * NEW: Evaluate all rules and return both:
   *  - detailed rule results (with severity + weights)
   *  - aggregated risk/compliance score summary
   *
   * @param {Object} coidata - COI data object
   * @param {Object} severityWeightsByGroup - optional override:
   *   { [groupId]: { high, medium, low } }
   */
  evaluateWithSummary(coidata, severityWeightsByGroup = null) {
    const weightsMap =
      severityWeightsByGroup || this.severityWeightsByGroup || {};

    const enriched = this.rules.map((rule) => {
      const groupId = rule.groupId || rule.group_id || "default";

      // get severity from rule if present, otherwise assume "medium"
      const severityKey = (rule.severity || "medium").toLowerCase();

      // find weights for this group if provided, else fall back to defaults
      const groupWeights =
        weightsMap[groupId] ||
        weightsMap.default ||
        DEFAULT_SEVERITY_WEIGHTS;

      const severityWeight =
        groupWeights[severityKey] ?? DEFAULT_SEVERITY_WEIGHTS[severityKey] ?? 1.0;

      // reuse the existing evaluation logic
      const baseResult = this.evaluateOne(rule, coidata);

      return {
        ...baseResult,
        groupId,
        severity: severityKey,
        severityWeight,
      };
    });

    // Aggregate risk/compliance score based on severity-weighted outcomes
    let totalWeight = 0;
    let failedWeight = 0;
    let warnWeight = 0;

    for (const r of enriched) {
      totalWeight += r.severityWeight;
      if (r.result === ACTION_TYPES.FAIL) {
        failedWeight += r.severityWeight;
      } else if (r.result === ACTION_TYPES.WARN) {
        warnWeight += r.severityWeight;
      }
    }

    // Basic scoring model:
    //  - All pass  => 100
    //  - More failed weight => lower score
    //  - Warns count half as much as fails
    let score = 100;
    if (totalWeight > 0) {
      const failRatio = failedWeight / totalWeight;
      const warnRatio = warnWeight / totalWeight;
      const penalty = failRatio * 100 + warnRatio * 50;
      score = Math.max(0, Math.round(100 - penalty));
    }

    return {
      rules: enriched,
      summary: {
        totalWeight,
        failedWeight,
        warnWeight,
        score, // 0–100 compliance score (higher is better)
      },
    };
  }

  evaluateCondition(condition, coidata) {
    switch (condition.type) {
      case CONDITION_TYPES.EXPIRES_IN_DAYS:
        return this.expiresWithin(coidata, condition.value);

      case CONDITION_TYPES.LIMITS_MISSING:
        return this.limitsMissing(coidata);

      case CONDITION_TYPES.POLICY_TYPE:
        return coidata.policyType === condition.value;

      case CONDITION_TYPES.LIMIT_BELOW:
        return Number(coidata.limit || 0) < Number(condition.value);

      case CONDITION_TYPES.ANY_FIELD_EMPTY:
        return this.anyFieldEmpty(coidata);

      default:
        return false;
    }
  }
  expiresWithin(coidata, days) {
    if (!coidata.expirationDate) return false;
    const now = new Date();
    const exp = new Date(coidata.expirationDate);
    const diff = (exp - now) / (1000 * 60 * 60 * 24);
    return diff <= days;
  }

  limitsMissing(coidata) {
    return (
      !coidata.generalLiabilityLimit ||
      !coidata.autoLimit ||
      !coidata.workCompLimit
    );
  }

  anyFieldEmpty(coidata) {
    return Object.values(coidata).some((v) => !v || v === "");
  }
}
