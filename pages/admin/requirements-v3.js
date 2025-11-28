// ----------------------------
// SECTION 1 — IMPORTS + STATE
// ----------------------------

import { useEffect, useState, useMemo } from "react";
import { useRole } from "../../lib/useRole";
import { useOrg } from "../../context/OrgContext";
import ToastV2 from "../../components/ToastV2";

const FIELD_OPTIONS = [
  { key: "policy.coverage_type", label: "Coverage Type" },
  { key: "policy.glEachOccurrence", label: "GL Each Occurrence" },
  { key: "policy.glAggregate", label: "GL Aggregate" },
  { key: "policy.expiration_date", label: "Expiration Date" },
  { key: "policy.carrier", label: "Carrier Name" },
];

const OPERATOR_OPTIONS = [
  { key: "equals", label: "Equals" },
  { key: "not_equals", label: "Not Equals" },
  { key: "gte", label: "≥ Greater or Equal" },
  { key: "lte", label: "≤ Less or Equal" },
  { key: "contains", label: "Contains" },
];

const SEVERITY_COLORS = {
  critical: "#ff4d6d",
  high: "#ffa600",
  medium: "#f8c300",
  low: "#22c55e",
};

export default function RequirementsV3Page() {
  const { isAdmin, isManager } = useRole();
  const { activeOrgId: orgId, loadingOrgs } = useOrg();
  const canEdit = isAdmin || isManager;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [groups, setGroups] = useState([]);
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [rules, setRules] = useState([]);

  const [toast, setToast] = useState({ open: false, message: "", type: "success" });

  const [samplePolicyText, setSamplePolicyText] = useState(
`{
  "policy.coverage_type": "General Liability",
  "policy.glEachOccurrence": 1000000,
  "policy.glAggregate": 2000000,
  "policy.expiration_date": "2025-12-31",
  "policy.carrier": "Sample Carrier"
}`
  );

  const [evaluation, setEvaluation] = useState({ ok: false, error: "", results: {} });

  const activeGroup = useMemo(
    () => groups.find((g) => g.id === activeGroupId) || null,
    [groups, activeGroupId]
  );

  // LOAD GROUPS
  useEffect(() => {
    if (loadingOrgs) return;
    if (!orgId) {
      setLoading(false);
      return;
    }
    loadGroups();
  }, [orgId, loadingOrgs]);

  async function loadGroups() {
    setLoading(true);
    try {
      const res = await fetch(`/api/requirements-v2/groups?orgId=${orgId}`);
      const json = await res.json();

      if (!json.ok) throw new Error(json.error);

      const list = json.groups || [];
      setGroups(list);

      if (list.length) {
        setActiveGroupId(list[0].id);
        await loadRulesForGroup(list[0].id);
      } else {
        setActiveGroupId(null);
        setRules([]);
      }
    } catch (err) {
      setError(err.message || "Failed to load groups.");
    } finally {
      setLoading(false);
    }
  }
// --------------------------------
// SECTION 2 — RULE LOADER + GROUPS
// --------------------------------

async function loadRulesForGroup(groupId) {
  if (!groupId) {
    setRules([]);
    setEvaluation({ ok: false, error: "", results: {} });
    return;
  }

  try {
    const res = await fetch(`/api/requirements-v2/rules?groupId=${groupId}`);
    const json = await res.json();

    if (!json.ok) throw new Error(json.error);
    setRules(json.rules || []);
    setEvaluation({ ok: false, error: "", results: {} });
  } catch (err) {
    setError(err.message);
  }
}

async function handleCreateGroup() {
  if (!canEdit || !orgId) return;

  const name = prompt("New group name:");
  if (!name) return;

  try {
    setSaving(true);

    const res = await fetch("/api/requirements-v2/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, name }),
    });

    const json = await res.json();
    if (!json.ok) throw new Error(json.error);

    setGroups((prev) => [json.group, ...prev]);
    setActiveGroupId(json.group.id);
    setRules([]);

    setToast({ open: true, type: "success", message: "Group created." });
  } catch (err) {
    setToast({ open: true, type: "error", message: err.message });
  } finally {
    setSaving(false);
  }
}

async function handleUpdateGroup(patch) {
  if (!canEdit || !activeGroup) return;

  const updated = { ...activeGroup, ...patch };
  setGroups((prev) => prev.map((g) => (g.id === activeGroup.id ? updated : g)));

  try {
    setSaving(true);

    const res = await fetch("/api/requirements-v2/groups", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });

    const json = await res.json();
    if (!json.ok) throw new Error(json.error);

    setToast({ open: true, type: "success", message: "Group updated." });
  } catch (err) {
    setToast({ open: true, type: "error", message: err.message });
  } finally {
    setSaving(false);
  }
}

async function handleDeleteGroup(id) {
  if (!canEdit || !id) return;
  if (!window.confirm("Delete group & all rules?")) return;

  try {
    setSaving(true);

    const res = await fetch(`/api/requirements-v2/groups?id=${id}`, {
      method: "DELETE",
    });

    const json = await res.json();
    if (!json.ok) throw new Error(json.error);

    const remaining = groups.filter((g) => g.id !== id);
    setGroups(remaining);

    if (remaining.length) {
      setActiveGroupId(remaining[0].id);
      await loadRulesForGroup(remaining[0].id);
    } else {
      setActiveGroupId(null);
      setRules([]);
    }

    setToast({ open: true, type: "success", message: "Group deleted." });
  } catch (err) {
    setToast({ open: true, type: "error", message: err.message });
  } finally {
    setSaving(false);
  }
}
// ---------------------------
// SECTION 3 — RULE CRUD
// ---------------------------

async function handleCreateRule() {
  if (!activeGroup || !canEdit) return;

  const field_key = prompt("Field key:");
  if (!field_key) return;
  const expected_value = prompt("Expected value:");
  if (!expected_value) return;

  try {
    setSaving(true);

    const res = await fetch("/api/requirements-v2/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        groupId: activeGroup.id,
        field_key,
        operator: "equals",
        expected_value,
        severity: "medium",
      }),
    });

    const json = await res.json();
    if (!json.ok) throw new Error(json.error);

    setRules((prev) => [...prev, json.rule]);
    setToast({ open: true, type: "success", message: "Rule created." });
  } catch (err) {
    setToast({ open: true, type: "error", message: err.message });
  } finally {
    setSaving(false);
  }
}

async function handleUpdateRule(ruleId, patch) {
  if (!ruleId || !canEdit) return;

  const updated = { ...rules.find((r) => r.id === ruleId), ...patch };
  setRules((prev) => prev.map((r) => (r.id === ruleId ? updated : r)));

  try {
    setSaving(true);

    const res = await fetch("/api/requirements-v2/rules", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });

    const json = await res.json();
    if (!json.ok) throw new Error(json.error);

    setToast({ open: true, type: "success", message: "Rule updated." });
  } catch (err) {
    setToast({ open: true, type: "error", message: err.message });
  } finally {
    setSaving(false);
  }
}

async function handleDeleteRule(ruleId) {
  if (!ruleId || !canEdit) return;
  if (!window.confirm("Delete this rule?")) return;

  try {
    setSaving(true);

    const res = await fetch(`/api/requirements-v2/rules?id=${ruleId}`, {
      method: "DELETE",
    });

    const json = await res.json();
    if (!json.ok) throw new Error(json.error);

    setRules((prev) => prev.filter((r) => r.id !== ruleId));
    setToast({ open: true, type: "success", message: "Rule deleted." });
  } catch (err) {
    setToast({ open: true, type: "error", message: err.message });
  } finally {
    setSaving(false);
  }
}
// -----------------------------------
// SECTION 4 — ENGINE + SAMPLE EVAL
// -----------------------------------

async function handleRunEngine() {
  try {
    setSaving(true);
    const res = await fetch("/api/engine/run-v3", { method: "POST" });
    const json = await res.json();

    if (!json.ok) throw new Error(json.error);

    setToast({ open: true, type: "success", message: json.message });
  } catch (err) {
    setToast({ open: true, type: "error", message: err.message });
  } finally {
    setSaving(false);
  }
}

function handleEvaluateSamplePolicy() {
  setEvaluation({ ok: false, error: "", results: {} });

  let parsed;
  try {
    parsed = JSON.parse(samplePolicyText);
  } catch {
    return setToast({
      open: true,
      type: "error",
      message: "Invalid JSON.",
    });
  }

  const results = {};
  for (const r of rules) {
    results[r.id] = evaluateRule(r, parsed);
  }

  setEvaluation({ ok: true, error: "", results });
  setToast({ open: true, type: "success", message: "Sample evaluated." });
}
// -----------------------------------
// SECTION 5 — FULL RENDER + RULECARD
// -----------------------------------

return (
  <div style={{ minHeight: "100vh", color: "#e5e7eb", padding: 40 }}>
    <h1 style={{ fontSize: 26, marginBottom: 20 }}>
      Define <span style={{ color: "#38bdf8" }}>coverage rules</span>
    </h1>

    {error && (
      <div style={{ background: "rgba(127,29,29,0.9)", padding: 12, borderRadius: 10 }}>
        {error}
      </div>
    )}

    {/* TODO: add your left column + UI */}
    {/* RULE LIST + RULECARD BELOW */}

    <ToastV2
      open={toast.open}
      message={toast.message}
      type={toast.type}
      onClose={() => setToast((p) => ({ ...p, open: false }))}
    />
  </div>
);
}

function RuleCard({ rule, onUpdate, onDelete, canEdit }) {
  const sevColor = SEVERITY_COLORS[rule.severity] || SEVERITY_COLORS.medium;

  return (
    <div style={{ border: "1px solid #334155", padding: 12, borderRadius: 12 }}>
      <div>
        <strong>{rule.field_key}</strong> ({rule.operator}) → {rule.expected_value}
      </div>
      <button onClick={() => onDelete(rule.id)}>Delete</button>
    </div>
  );
}

function operatorLabel(op) {
  const found = OPERATOR_OPTIONS.find((o) => o.key === op);
  return found ? found.label : op;
}

function evaluateRule(rule, policyObj) {
  if (!rule || rule.is_active === false) return false;
  const rawVal = policyObj[rule.field_key];
  const expected = rule.expected_value;

  switch (rule.operator) {
    case "equals":
      return String(rawVal) === String(expected);
    case "not_equals":
      return String(rawVal) !== String(expected);
    case "contains":
      return String(rawVal).toLowerCase().includes(String(expected).toLowerCase());
    case "gte":
      return Number(rawVal) >= Number(expected);
    case "lte":
      return Number(rawVal) <= Number(expected);
    default:
      return false;
  }
}
