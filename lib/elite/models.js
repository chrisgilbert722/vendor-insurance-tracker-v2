// --- Elite Rule Engine Models V2 ---

export const CONDITION_TYPES = {
  EXPIRES_IN_DAYS: "expires_in_days",
  LIMITS_MISSING: "limits_missing",
  POLICY_TYPE: "policy_type",
  LIMIT_BELOW: "limit_below",
  ANY_FIELD_EMPTY: "any_field_empty",
};

export const ACTION_TYPES = {
  FAIL: "fail",
  WARN: "warn",
  PASS: "pass",
};

export class EliteCondition {
  constructor({ id, type, value }) {
    this.id = id;
    this.type = type;
    this.value = value;
  }
}

export class EliteAction {
  constructor({ id, type, label }) {
    this.id = id;
    this.type = type;
    this.label = label;
  }
}

export class EliteRule {
  constructor({ id, name, conditions = [], action }) {
    this.id = id;
    this.name = name;
    this.conditions = conditions; // array of EliteCondition
    this.action = action; // one EliteAction
  }
}
