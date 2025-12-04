// /lib/ruleEngineV3.js
// Rule Engine V3 — core evaluation logic (no DB, pure functions)

/*
RULE SHAPES (for reference)

Rule:
{
  id: string,
  label: string,
  field: string,        // e.g. "expiration_date", "limit_each_occurrence"
  target: "policy" | "vendor" | "org",
  operator: string,     // "lt" | "lte" | "gt" | "gte" | "eq" | "ne" | "in" | "missing" | "present" | "beforeDays" | "afterDays"
  value: any,           // operator-dependent
  severity: "critical" | "high" | "medium" | "low",
  weight: number,       // numeric weight for scoring
  aiHint?: string       // suggestion text
}

RuleGroup:
{
  id: string,
  label: string,
  description?: string,
  logic: "ALL" | "ANY",         // how rules combine
  scope: "anyPolicy" | "allPolicies" | "perVendor",
  rules: Rule[],
  weight?: number,
  defaultSeverity?: "critical" | "high" | "medium" | "low"
}

Context:
{
  vendor?: any,
  org?: any,
  policies: any[],
}
*/

function severityToScore(severity) {
  switch (severity) {
    case "critical":
      return 100;
    case "high":
      return 80;
    case "medium":
      return 55;
    case "low":
      return 30;
    default:
      return 40;
  }
}

function normalizeNumber(val) {
  if (val == null || val === "") return null;
  const n = Number(val);
  return Number.isNaN(n) ? null : n;
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  // supports "MM/DD/YYYY"
  const parts = String(dateStr).split("/");
  if (parts.length !== 3) return null;
  const [mm, dd, yyyy] = parts;
  const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const diffMs = d.getTime() - Date.now();
  return Math.floor(diffMs / 86400000);
}

function getTargetSource(rule, ctx, policy) {
  if (rule.target === "policy") return policy || {};
  if (rule.target === "vendor") return ctx.vendor || {};
  if (rule.target === "org") return ctx.org || {};
  // default to policy
  return policy || {};
}

function getFieldValue(source, field) {
  if (!field) return undefined;
  // support simple path like "limits.general" if needed
  if (field.indexOf(".") === -1) {
    return source[field];
  }
  const parts = field.split(".");
  let cur = source;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

function evaluateOperator(operator, rawValue, ruleValue) {
  const op = operator || "eq";

  switch (op) {
    case "missing":
      return rawValue == null || rawValue === "";
    case "present":
      return !(rawValue == null || rawValue === "");
    case "eq":
      return String(rawValue) === String(ruleValue);
    case "ne":
      return String(rawValue) !== String(ruleValue);
    case "in":
      if (!Array.isArray(ruleValue)) return false;
      return ruleValue.map(String).includes(String(rawValue));
    case "lt": {
      const a = normalizeNumber(rawValue);
      const b = normalizeNumber(ruleValue);
      if (a == null || b == null) return false;
      return a < b;
    }
    case "lte": {
      const a = normalizeNumber(rawValue);
      const b = normalizeNumber(ruleValue);
      if (a == null || b == null) return false;
      return a <= b;
    }
    case "gt": {
      const a = normalizeNumber(rawValue);
      const b = normalizeNumber(ruleValue);
      if (a == null || b == null) return false;
      return a > b;
    }
    case "gte": {
      const a = normalizeNumber(rawValue);
      const b = normalizeNumber(ruleValue);
      if (a == null || b == null) return false;
      return a >= b;
    }
    case "beforeDays": {
      const days = daysUntil(rawValue);
      const threshold = normalizeNumber(ruleValue);
      if (days == null || threshold == null) return false;
      // "beforeDays" means within or under the threshold window
      return days <= threshold;
    }
    case "afterDays": {
      const days2 = daysUntil(rawValue);
      const threshold2 = normalizeNumber(ruleValue);
      if (days2 == null || threshold2 == null) return false;
      return days2 >= threshold2;
    }
    default:
      return false;
  }
}

/**
 * Evaluate a single rule against one policy + context
 */
function evaluateRule(rule, ctx, policy) {
  const source = getTargetSource(rule, ctx, policy);
  const value = getFieldValue(source, rule.field);

  const matched = evaluateOperator(rule.operator, value, rule.value);

  const severity = rule.severity || "medium";
  const weight = typeof rule.weight === "number" ? rule.weight : 1;

  const failing = !matched;
  const missing =
    rule.operator === "missing" || rule.operator === "present"
      ? value == null || value === ""
      : false;

  return {
    ruleId: rule.id,
    label: rule.label,
    field: rule.field,
    operator: rule.operator,
    expected: rule.value,
    actual: value,
    severity,
    weight,
    matched,
    failing,
    missing,
    aiHint: rule.aiHint || null,
  };
}

/**
 * Evaluate a rule group against a vendor + its policies
 */
function evaluateRuleGroup(group, ctx) {
  const scope = group.scope || "anyPolicy";
  const logic = group.logic || "ALL";

  const policyResults = [];
  const failingRules = [];
  const missingData = [];

  let anyPolicyPass = false;
  let allPoliciesPass = true;

  const policies = Array.isArray(ctx.policies) ? ctx.policies : [];

  if (scope === "perVendor") {
    // Vendor-level or org-level rules, not per policy
    const vendorResults = group.rules.map((rule) =>
      evaluateRule(rule, ctx, null)
    );

    const passed =
      logic === "ALL"
        ? vendorResults.every((r) => r.matched)
        : vendorResults.some((r) => r.matched);

    vendorResults.forEach((r) => {
      if (r.failing) failingRules.push(r);
      if (r.missing) missingData.push(r);
    });

    const score = computeGroupScore(group, vendorResults);

    return {
      groupId: group.id,
      label: group.label,
      scope,
      logic,
      passed,
      policiesEvaluated: 0,
      score,
      failingRules,
      missingData,
    };
  }

  // Policy-scoped evaluation
  for (const policy of policies) {
    const ruleResults = group.rules.map((rule) =>
      evaluateRule(rule, ctx, policy)
    );

    const passedThisPolicy =
      logic === "ALL"
        ? ruleResults.every((r) => r.matched)
        : ruleResults.some((r) => r.matched);

    if (passedThisPolicy) anyPolicyPass = true;
    if (!passedThisPolicy) allPoliciesPass = false;

    ruleResults.forEach((r) => {
      if (r.failing) failingRules.push({ ...r, policyId: policy.id });
      if (r.missing) missingData.push({ ...r, policyId: policy.id });
    });

    policyResults.push({
      policyId: policy.id,
      passed: passedThisPolicy,
      rules: ruleResults,
    });
  }

  let passed;
  if (scope === "allPolicies") {
    passed = allPoliciesPass;
  } else {
    // "anyPolicy"
    passed = anyPolicyPass;
  }

  const score = computeGroupScore(group, failingRules.length ? failingRules : policyResults.flatMap(p => p.rules));

  return {
    groupId: group.id,
    label: group.label,
    scope,
    logic,
    passed,
    policiesEvaluated: policies.length,
    score,
    failingRules,
    missingData,
    policyResults,
  };
}

function computeGroupScore(group, results) {
  if (!results || !results.length) {
    return 100;
  }

  // start from full score and subtract penalties
  let score = 100;
  let totalPenalty = 0;

  results.forEach((r) => {
    if (!r.failing) return;
    const sevScore = severityToScore(r.severity);
    const weight = typeof r.weight === "number" ? r.weight : 1;
    totalPenalty += (sevScore / 100) * 15 * weight; // 0–15 per failing rule scaled by severity
  });

  const groupWeight = typeof group.weight === "number" ? group.weight : 1;
  score -= totalPenalty * groupWeight;

  if (score < 0) score = 0;
  if (score > 100) score = 100;

  return Math.round(score);
}

/**
 * High-level evaluation for an org/vendor
 * rulesGroups: RuleGroup[]
 * ctx: { vendor, org, policies }
 */
export function evaluateRuleEngineV3(ruleGroups, ctx) {
  const groups = Array.isArray(ruleGroups) ? ruleGroups : [];
  const groupResults = groups.map((g) => evaluateRuleGroup(g, ctx));

  // Global score = average of group scores, weighted
  let total = 0;
  let weightSum = 0;

  groupResults.forEach((gr) => {
    const w = typeof gr.weight === "number" ? gr.weight : 1;
    total += (gr.score || 0) * w;
    weightSum += w;
  });

  const globalScore =
    weightSum === 0 ? 100 : Math.round(total / Math.max(weightSum, 1));

  const failingGroups = groupResults.filter((g) => !g.passed);

  return {
    globalScore,
    groupResults,
    failingGroups,
  };
}
