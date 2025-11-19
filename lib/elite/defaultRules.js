// --- Elite Default Rules (Phase C – Drop 3) ---
// Place at: /lib/elite/defaultRules.js

import {
  CONDITION_TYPES,
  ACTION_TYPES,
  EliteCondition,
  EliteAction,
  EliteRule,
} from "./models";

export function getDefaultEliteRules() {
  const rules = [];

  // 1) Expires in 30 days -> WARN
  rules.push(
    new EliteRule({
      id: "exp_30_warn",
      name: "Policy expires within 30 days",
      conditions: [
        new EliteCondition({
          id: "c_exp_30",
          type: CONDITION_TYPES.EXPIRES_IN_DAYS,
          value: 30,
        }),
      ],
      action: new EliteAction({
        id: "a_exp_30",
        type: ACTION_TYPES.WARN,
        label: "Expiring soon",
      }),
    })
  );

  // 2) Expires in 0 days or past -> FAIL
  rules.push(
    new EliteRule({
      id: "exp_0_fail",
      name: "Policy expired",
      conditions: [
        new EliteCondition({
          id: "c_exp_0",
          type: CONDITION_TYPES.EXPIRES_IN_DAYS,
          value: 0,
        }),
      ],
      action: new EliteAction({
        id: "a_exp_0",
        type: ACTION_TYPES.FAIL,
        label: "Expired",
      }),
    })
  );

  // 3) Any major limits missing -> FAIL
  rules.push(
    new EliteRule({
      id: "limits_missing_fail",
      name: "Required limits missing",
      conditions: [
        new EliteCondition({
          id: "c_limits_missing",
          type: CONDITION_TYPES.LIMITS_MISSING,
          value: null,
        }),
      ],
      action: new EliteAction({
        id: "a_limits_missing",
        type: ACTION_TYPES.FAIL,
        label: "Missing limits",
      }),
    })
  );

  // 4) Any key field empty -> WARN
  rules.push(
    new EliteRule({
      id: "any_field_empty_warn",
      name: "Important fields incomplete",
      conditions: [
        new EliteCondition({
          id: "c_any_empty",
          type: CONDITION_TYPES.ANY_FIELD_EMPTY,
          value: null,
        }),
      ],
      action: new EliteAction({
        id: "a_any_empty",
        type: ACTION_TYPES.WARN,
        label: "Data incomplete",
      }),
    })
  );

  return rules;
}
