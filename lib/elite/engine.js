import {
  CONDITION_TYPES,
  ACTION_TYPES,
  EliteRule,
} from "./models";

export class EliteEngine {
  constructor(rules = []) {
    this.rules = rules;
  }

  evaluateOne(rule, coidata) {
    let passed = true;

    for (const condition of rule.conditions) {
      const ok = this.evaluateCondition(condition, coidata);
      if (!ok) {
        passed = false;
        break;
      }
    }

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      result: passed ? rule.action.type : ACTION_TYPES.FAIL,
      label: rule.action.label,
    };
  }

  evaluateAll(coidata) {
    return this.rules.map(rule => this.evaluateOne(rule, coidata));
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
    return Object.values(coidata).some(v => !v || v === "");
  }
}
