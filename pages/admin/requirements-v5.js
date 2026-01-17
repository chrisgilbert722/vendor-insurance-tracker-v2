// pages/admin/requirements-v5.js
// ==========================================================
// REQUIREMENTS ENGINE V5 — FULL UPGRADE
// AI Builder • AI Explain • Conflict Intelligence • V5 Core
// ==========================================================

import { useEffect, useState, useMemo, useRef } from "react";
import { useRole } from "../../lib/useRole";
import { useOrg } from "../../context/OrgContext";
import ToastV2 from "../../components/ToastV2";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

// -------------------------------
// CONSTANTS
// -------------------------------
const ITEM_TYPE = "REQUIREMENT_RULE";

const SEVERITY_COLORS = {
  critical: "#ff4d6d",
  required: "#3b82f6",
  recommended: "#a855f7",
  high: "#ffa600",
  medium: "#f8c300",
  low: "#22c55e",
};

// Fields mappable via AI and UI
const FIELD_OPTIONS = [
  { key: "policy.coverage_type", label: "Coverage Type", type: "string" },
  { key: "policy.glEachOccurrence", label: "GL Each Occurrence", type: "number" },
  { key: "policy.glAggregate", label: "GL Aggregate", type: "number" },
  { key: "policy.expiration_date", label: "Expiration Date", type: "date" },
  { key: "policy.carrier", label: "Carrier Name", type: "string" },
];

// Operators with added type awareness
const OPERATOR_OPTIONS = [
  { key: "equals", label: "Equals" },
  { key: "not_equals", label: "Not Equals" },
  { key: "gte", label: "≥ Greater or Equal" },
  { key: "lte", label: "≤ Less or Equal" },
  { key: "contains", label: "Contains" },
  { key: "in_list", label: "In List" },
  { key: "before", label: "Before (Date)" },
  { key: "after", label: "After (Date)" },
];

// -------------------------------
// V5: Operator Label Helper
// -------------------------------
function operatorLabel(op) {
  return OPERATOR_OPTIONS.find((o) => o.key === op)?.label || op;
}

// -------------------------------
// V5: Safe Value Extraction (nested support)
// Example: "policy.glEachOccurrence" → policy.glEachOccurrence
// -------------------------------
function resolveValue(obj, path) {
  try {
    return path.split(".").reduce((acc, key) => acc?.[key], obj);
  } catch {
    return undefined;
  }
}

// -------------------------------
// V5: Normalize Value for Comparison
// Auto-casts numbers, dates, strings.
// -------------------------------
function normalizeValue(raw, typeHint) {
  if (raw === null || raw === undefined) return null;

  if (typeHint === "number") return Number(raw) || 0;
  if (typeHint === "date") return new Date(raw);

  // Convert everything else to lowercased string
  return String(raw).toLowerCase();
}

// -------------------------------
// V5: RULE EVALUATION CORE
// Stronger, safer, predictable.
// -------------------------------
function evaluateRuleV5(rule, policy) {
  try {
    const fieldDef = FIELD_OPTIONS.find((f) => f.key === rule.field_key);
    const typeHint = fieldDef?.type || "string";

    const rawValue = resolveValue(policy, rule.field_key);
    const value = normalizeValue(rawValue, typeHint);
    const expected = normalizeValue(rule.expected_value, typeHint);

    switch (rule.operator) {
      case "equals":
        return value === expected;

      case "not_equals":
        return value !== expected;

      case "gte":
        return Number(value) >= Number(expected);

      case "lte":
        return Number(value) <= Number(expected);

      case "contains":
        return String(value || "").includes(String(expected));

      case "in_list":
        return String(expected)
          .split(",")
          .map((v) => v.trim().toLowerCase())
          .includes(String(value));

      case "before": // date
        return typeHint === "date" && value < expected;

      case "after": // date
        return typeHint === "date" && value > expected;

      default:
        return false;
    }
  } catch (err) {
    console.error("V5 evaluator error:", err);
    return false;
  }
}

// -------------------------------
// V5: Extract All Rule IDs That Conflict
// -------------------------------
function getConflictedRuleIds(conflicts) {
  const ids = new Set();
  for (const c of conflicts) (c.rules || []).forEach((id) => ids.add(id));
  return [...ids];
}

// -------------------------------
// RULE CARD — Drag Component
// -------------------------------
function RuleCard({
  rule,
  index,
  laneKey,
  onMoveRule,
  onDeleteRule,
  onExplain,
  canEdit,
  conflictedRuleIds,
}) {
  const ref = useRef(null);
  const isBad = conflictedRuleIds.includes(rule.id);

  const [, drop] = useDrop({
    accept: ITEM_TYPE,
    hover(item) {
      if (item.lane !== laneKey) return;
      if (item.index === index) return;
      onMoveRule(item.index, index, laneKey);
      item.index = index;
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: ITEM_TYPE,
    item: { id: rule.id, index, lane: laneKey },
    collect: (m) => ({ isDragging: m.isDragging() }),
  });

  drag(drop(ref));

  // Support both V2 format (name, logic) and legacy V5 format (field_key, operator, expected_value)
  const logic = rule.logic || {};
  const fieldKey = logic.field_key || rule.field_key || "";
  const operator = logic.operator || rule.operator || "";
  const expectedValue = logic.expected_value ?? rule.expected_value ?? "";
  const ruleName = rule.name || "";

  return (
    <div
      ref={ref}
      style={{
        opacity: isDragging ? 0.35 : 1,
        marginBottom: 10,
        padding: 10,
        borderRadius: 12,
        border: isBad
          ? "1px solid rgba(248,113,113,0.7)"
          : "1px solid rgba(80,120,255,0.25)",
        background: "rgba(15,23,42,0.95)",
        boxShadow: isBad
          ? "0 0 12px rgba(239,68,68,0.55)"
          : "0 0 12px rgba(80,120,255,0.15)",
        cursor: canEdit ? "grab" : "default",
      }}
    >
      {ruleName ? (
        <div style={{ fontSize: 13, marginBottom: 6, fontWeight: 500, color: "#e5e7eb" }}>
          {ruleName}
        </div>
      ) : fieldKey ? (
        <div style={{ fontSize: 13, marginBottom: 6 }}>
          IF <span style={{ color: "#93c5fd" }}>{fieldKey}</span>{" "}
          {operatorLabel(operator)}{" "}
          <span style={{ color: "#c4b5fd" }}>{expectedValue}</span>
        </div>
      ) : (
        <div style={{ fontSize: 13, marginBottom: 6, color: "#9ca3af", fontStyle: "italic" }}>
          Empty rule
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <button
          onClick={() => onExplain(rule)}
          style={{
            fontSize: 11,
            padding: "3px 6px",
            borderRadius: 6,
            background: "rgba(56,189,248,0.2)",
            border: "1px solid rgba(56,189,248,0.4)",
            color: "#7dd3fc",
          }}
        >
          Explain
        </button>

        {canEdit && (
          <button
            onClick={() => onDeleteRule(rule.id)}
            style={{
              fontSize: 11,
              padding: "3px 6px",
              borderRadius: 6,
              background: "rgba(239,68,68,0.2)",
              border: "1px solid rgba(239,68,68,0.4)",
              color: "#fca5a5",
            }}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

// -------------------------------
// LANE COLUMN
// -------------------------------
function LaneColumn({
  laneKey,
  label,
  color,
  rules,
  onMoveRule,
  onDeleteRule,
  onExplain,
  canEdit,
  conflictedRuleIds,
}) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 18,
        background: "rgba(15,23,42,0.82)",
        border: "1px solid rgba(80,120,255,0.25)",
      }}
    >
      <div
        style={{
          color,
          borderBottom: `1px solid ${color}`,
          paddingBottom: 6,
          marginBottom: 10,
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        {label}
      </div>

      {rules.length === 0 && (
        <div
          style={{
            fontSize: 12,
            color: "#6b7280",
            padding: 8,
            textAlign: "center",
          }}
        >
          No rules in this lane.
        </div>
      )}

      {rules.map((rule, i) => (
        <RuleCard
          key={rule.id}
          index={i}
          rule={rule}
          laneKey={laneKey}
          conflictedRuleIds={conflictedRuleIds}
          onMoveRule={onMoveRule}
          onDeleteRule={onDeleteRule}
          onExplain={onExplain}
          canEdit={canEdit}
        />
      ))}
    </div>
  );
}

// ==========================================================
// MAIN PAGE COMPONENT
// ==========================================================
export default function RequirementsV5Page() {
  const { isAdmin, isManager } = useRole();
  const { activeOrgId: orgId, loadingOrgs } = useOrg();
  const canEdit = isAdmin || isManager;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [groups, setGroups] = useState([]);
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [rules, setRules] = useState([]);

  const [toast, setToast] = useState({
    open: false,
    message: "",
    type: "success",
  });

  const [samplePolicyText, setSamplePolicyText] = useState(`{
  "policy": {
    "coverage_type": "General Liability",
    "glEachOccurrence": 1000000,
    "glAggregate": 2000000,
    "expiration_date": "2025-12-31",
    "carrier": "Sample Carrier"
  }
}`);

  const [evaluation, setEvaluation] = useState({
    ok: false,
    error: "",
    results: {},
  });

  const [runningEngine, setRunningEngine] = useState(false);
  const [engineLog, setEngineLog] = useState([]);
  const [lastRunAt, setLastRunAt] = useState(null);

  const [aiOpen, setAiOpen] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState("");

  const [aiInput, setAiInput] = useState("");

  const [explainOpen, setExplainOpen] = useState(false);
  const [explainLoading, setExplainLoading] = useState(false);
  const [explainText, setExplainText] = useState("");
  const [explainRule, setExplainRule] = useState(null);

  const [conflicts, setConflicts] = useState([]);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [conflictLoading, setConflictLoading] = useState(false);

  // NEW — vendor requirements saving state
  const [targetVendorId, setTargetVendorId] = useState("");
  const [savingVendorProfile, setSavingVendorProfile] = useState(false);

  const activeGroup = useMemo(
    () => groups.find((g) => g.id === activeGroupId) || null,
    [groups, activeGroupId]
  );

  const conflictedRuleIds = useMemo(
    () => getConflictedRuleIds(conflicts),
    [conflicts]
  );

  const [refreshKey, setRefreshKey] = useState(0);

  // Listen for visibility changes and custom events to trigger refetch
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setRefreshKey((k) => k + 1);
      }
    };

    const handleDataChanged = () => {
      setRefreshKey((k) => k + 1);
    };

    const handleStorage = (e) => {
      if (e?.key === "policies:changed" || e?.key === "vendors:changed") {
        handleDataChanged();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("policies:changed", handleDataChanged);
    window.addEventListener("vendors:changed", handleDataChanged);
    window.addEventListener("onboarding:complete", handleDataChanged);
    window.addEventListener("storage", handleStorage);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("policies:changed", handleDataChanged);
      window.removeEventListener("vendors:changed", handleDataChanged);
      window.removeEventListener("onboarding:complete", handleDataChanged);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  // -------------------------------------
  // LOADERS
  // -------------------------------------
  useEffect(() => {
    if (loadingOrgs) return;
    if (!orgId) {
      setLoading(false);
      return;
    }
    loadGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, loadingOrgs, refreshKey]);

  async function loadGroups() {
    setLoading(true);
    try {
      const res = await fetch(`/api/requirements-v2/groups?orgId=${orgId}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);

      setGroups(Array.isArray(json.groups) ? json.groups : []);
      if (Array.isArray(json.groups) && json.groups.length > 0) {
        const firstId = json.groups[0].id;
        setActiveGroupId(firstId);
        await loadRulesForGroup(firstId);
      } else {
        setActiveGroupId(null);
        setRules([]);
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadRulesForGroup(id) {
    if (!id) {
      setRules([]);
      return;
    }
    try {
      const res = await fetch(`/api/requirements-v2/rules?groupId=${id}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setRules(Array.isArray(json.rules) ? json.rules : []);
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  }

  // -------------------------------------
  // GROUP CRUD
  // -------------------------------------
  async function handleCreateGroup() {
    if (!canEdit) return;
    const name = prompt("New group name:");
    if (!name) return;

    try {
      setSaving(true);
      const res = await fetch(`/api/requirements-v2/groups?orgId=${orgId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);

      setGroups((p) => [json.group, ...p]);
      setActiveGroupId(json.group.id);
      await loadRulesForGroup(json.group.id);
    } catch (err) {
      console.error(err);
      setToast({ open: true, type: "error", message: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateGroup(patch) {
    if (!activeGroup || !canEdit) return;

    const updated = { ...activeGroup, ...patch };
    setGroups((p) => p.map((g) => (g.id === activeGroup.id ? updated : g)));

    try {
      setSaving(true);
      const res = await fetch("/api/requirements-v2/groups", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
    } catch (err) {
      console.error(err);
      setToast({ open: true, type: "error", message: err.message });
      loadGroups();
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteGroup(id) {
    if (!canEdit) return;
    if (!confirm("Delete this group?")) return;

    try {
      setSaving(true);
      const res = await fetch(`/api/requirements-v2/groups?id=${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);

      const remain = groups.filter((g) => g.id !== id);
      setGroups(remain);

      if (remain.length) {
        const newActive = remain[0].id;
        setActiveGroupId(newActive);
        await loadRulesForGroup(newActive);
      } else {
        setActiveGroupId(null);
        setRules([]);
      }
    } catch (err) {
      console.error(err);
      setToast({ open: true, type: "error", message: err.message });
    } finally {
      setSaving(false);
    }
  }

  // -------------------------------------
  // RULE CRUD
  // -------------------------------------
  async function handleCreateRule() {
    if (!activeGroup || !canEdit) return;

    const ruleName = prompt("Rule name (e.g. 'GL Each Occurrence >= 1M'):");
    if (!ruleName) return;
    const severityInput = prompt("Severity (critical/required/recommended):");
    const severity = ["critical", "required", "recommended"].includes(severityInput)
      ? severityInput
      : "required";

    try {
      setSaving(true);
      const res = await fetch("/api/requirements-v2/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          group_id: activeGroup.id,
          name: ruleName,
          description: "",
          severity,
          logic: {},
          is_active: true,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);

      setRules((p) => [...p, json.rule]);
      setToast({ open: true, type: "success", message: "Rule created." });
    } catch (err) {
      console.error(err);
      setToast({ open: true, type: "error", message: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateRule(ruleId, patch) {
    if (!canEdit) return;
    const cur = rules.find((r) => r.id === ruleId);
    if (!cur) return;

    const updated = { ...cur, ...patch };
    setRules((p) => p.map((r) => (r.id === ruleId ? updated : r)));

    try {
      setSaving(true);
      const res = await fetch("/api/requirements-v2/rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
    } catch (err) {
      console.error(err);
      setToast({ open: true, type: "error", message: err.message });
      loadRulesForGroup(activeGroupId);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteRule(ruleId) {
    if (!canEdit) return;
    if (!confirm("Delete rule?")) return;

    try {
      setSaving(true);
      const res = await fetch(`/api/requirements-v2/rules?id=${ruleId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);

      setRules((p) => p.filter((r) => r.id !== ruleId));
    } catch (err) {
      console.error(err);
      setToast({ open: true, type: "error", message: err.message });
    } finally {
      setSaving(false);
    }
  }

  // -------------------------------------
  // DRAG & DROP MOVE
  // -------------------------------------
  function handleMoveRule(dragIndex, hoverIndex, laneKey) {
    setRules((prev) => {
      const lane = prev.filter((r) => r.severity === laneKey);
      const other = prev.filter((r) => r.severity !== laneKey);

      const updated = [...lane];
      const [removed] = updated.splice(dragIndex, 1);
      updated.splice(hoverIndex, 0, removed);

      return [...other, ...updated];
    });
  }

  // -------------------------------------
  // ENGINE RUN (V5 LOGGING, still uses run-v3 backend)
  // -------------------------------------
  async function handleRunEngine() {
    if (!orgId) {
      setToast({
        open: true,
        type: "error",
        message: "No active org. Select or create an org first.",
      });
      return;
    }

    try {
      setRunningEngine(true);
      setEngineLog((prev) => [
        {
          at: new Date().toISOString(),
          level: "info",
          message: "Dispatching Rule Engine V5 run…",
        },
        ...prev,
      ]);

      const res = await fetch("/api/engine/run-v3", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId }),
      });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Engine run failed.");
      }

      // Handle skipped case
      if (json.skipped) {
        const skipReason =
          json.reason === "no_vendors_found"
            ? "No vendors found for this org."
            : json.reason || "Engine skipped.";
        setEngineLog((prev) => [
          {
            at: new Date().toISOString(),
            level: "info",
            message: skipReason,
          },
          ...prev,
        ]);
        setToast({ open: true, type: "success", message: skipReason });
        setRunningEngine(false);
        return;
      }

      const msg =
        json.message ||
        `Engine ran for ${json.vendorsProcessed || json.vendors_evaluated || 0} vendors.`;

      setLastRunAt(new Date().toISOString());
      setEngineLog((prev) => [
        {
          at: new Date().toISOString(),
          level: "success",
          message: msg,
        },
        ...prev,
      ]);
      setToast({ open: true, type: "success", message: msg });
    } catch (err) {
      const msg = err.message || "Engine failed.";
      console.error(err);

      setEngineLog((prev) => [
        {
          at: new Date().toISOString(),
          level: "error",
          message: msg,
        },
        ...prev,
      ]);
      setToast({ open: true, type: "error", message: msg });
    } finally {
      setRunningEngine(false);
    }
  }

  // -------------------------------------
  // SAMPLE POLICY EVALUATION (V5)
  // -------------------------------------
  function handleEvaluateSamplePolicy() {
    setEvaluation({ ok: false, error: "", results: {} });

    let parsed;
    try {
      parsed = JSON.parse(samplePolicyText || "{}");
    } catch {
      return setToast({
        open: true,
        type: "error",
        message: "Invalid JSON in sample policy.",
      });
    }

    const results = {};
    for (const r of rules) {
      results[r.id] = evaluateRuleV5(r, parsed);
    }

    setEvaluation({ ok: true, error: "", results });
    setToast({ open: true, type: "success", message: "Sample evaluated." });
  }

  // -------------------------------------
  // V5 AI RULE BUILDER (real handler)
  // -------------------------------------
  async function handleAiBuildRules() {
    if (!aiInput.trim()) {
      setToast({
        open: true,
        type: "error",
        message: "Enter some text or paste requirements first.",
      });
      return;
    }

    if (!orgId) {
      setToast({
        open: true,
        type: "error",
        message: "No active org. Select or create an org first.",
      });
      return;
    }

    if (!activeGroupId) {
      setToast({
        open: true,
        type: "error",
        message: "Select or create a group first. Rules must belong to a group.",
      });
      return;
    }

    try {
      setSaving(true);
      setToast({
        open: true,
        type: "success",
        message: "Sending to AI builder…",
      });

      const res = await fetch("/api/requirements-v5/ai-build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          groupId: activeGroupId,
          text: aiInput,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "AI builder failed.");
      }

      if (activeGroupId) {
        await loadRulesForGroup(activeGroupId);
      } else {
        await loadGroups();
      }

      setToast({
        open: true,
        type: "success",
        message:
          json.message ||
          `AI created ${json.rules?.length || 0} rules from your input.`,
      });
    } catch (err) {
      console.error("AI build error", err);
      setToast({
        open: true,
        type: "error",
        message:
          err.message ||
          "AI builder endpoint is not configured yet. Ask dev to implement /api/requirements-v5/ai-build.",
      });
    } finally {
      setSaving(false);
    }
  }

  // -------------------------------------
  // AI RULE SUGGEST (existing lightweight flow)
  // -------------------------------------
  function handleOpenAiSuggest() {
    if (!activeGroup) {
      return setToast({
        open: true,
        type: "error",
        message: "Select a group first.",
      });
    }

    setAiOpen(true);
    setAiThinking(true);

    setTimeout(() => {
      const laneName = activeGroup.name || "this lane";
      const suggestion = `IF policy.glEachOccurrence ≥ 1000000 AND coverage_type = "General Liability" → mark as CRITICAL alert in ${laneName}.`;
      setAiSuggestion(suggestion);
      setAiThinking(false);
    }, 600);
  }

  function handleApplyAiSuggestion() {
    if (!aiSuggestion || !activeGroup || !canEdit) {
      setAiOpen(false);
      return;
    }

    const aiText = aiSuggestion;

    (async () => {
      try {
        setSaving(true);
        const res = await fetch("/api/requirements-v2/rules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            group_id: activeGroup.id,
            name: "GL Each Occurrence >= 1M",
            description: aiText,
            severity: "critical",
            logic: {
              field_key: "policy.glEachOccurrence",
              operator: "gte",
              expected_value: 1000000,
            },
            is_active: true,
          }),
        });
        const json = await res.json();
        if (!json.ok) throw new Error(json.error);

        setRules((p) => [...p, json.rule]);
        setToast({
          open: true,
          type: "success",
          message: "AI rule added.",
        });
      } catch (err) {
        console.error(err);
        setToast({ open: true, type: "error", message: err.message });
      } finally {
        setSaving(false);
        setAiOpen(false);
      }
    })();
  }

  // -------------------------------------
  // AI EXPLAIN RULE
  // -------------------------------------
  async function handleExplainRule(rule) {
    if (!rule) return;

    try {
      setExplainOpen(true);
      setExplainLoading(true);
      setExplainRule(rule);
      setExplainText("");

      const res = await fetch("/api/rules/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rule,
          groupName: activeGroup?.name || "",
          samplePolicyText,
        }),
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed to explain rule.");
      setExplainText(json.explanation || "");
    } catch (err) {
      console.error(err);
      setExplainText(
        "AI could not explain this rule.\n\n" + (err.message || "Unknown error.")
      );
    } finally {
      setExplainLoading(false);
    }
  }

  // -------------------------------------
  // CONFLICT AI — V5 HANDLER
  // -------------------------------------
  async function handleScanConflicts() {
    try {
      setConflictLoading(true);
      setConflictOpen(true);

      const res = await fetch(`/api/requirements-v5/conflicts?orgId=${orgId}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Conflict scan failed.");

      setConflicts(json.aiDetails || []);
      setToast({
        open: true,
        type: "success",
        message: "Conflict scan complete.",
      });
    } catch (err) {
      console.error(err);
      setToast({
        open: true,
        type: "error",
        message: err.message || "Conflict scan failed.",
      });
    } finally {
      setConflictLoading(false);
    }
  }

  // -------------------------------------
  // SAVE CURRENT GROUP + RULES → vendor.requirements_json
  // -------------------------------------
  async function handleSaveRequirementsForVendor() {
    if (!canEdit) {
      return setToast({
        open: true,
        type: "error",
        message: "You don't have permission to edit requirements.",
      });
    }

    if (!orgId) {
      return setToast({
        open: true,
        type: "error",
        message: "No active org selected.",
      });
    }

    if (!activeGroup) {
      return setToast({
        open: true,
        type: "error",
        message: "Select a group first.",
      });
    }

    if (!targetVendorId || !String(targetVendorId).trim()) {
      return setToast({
        open: true,
        type: "error",
        message: "Enter a vendor ID.",
      });
    }

    if (!rules.length) {
      return setToast({
        open: true,
        type: "error",
        message: "This group has no rules to save.",
      });
    }

    try {
      setSavingVendorProfile(true);

      const profile = {
        version: "v5",
        orgId,
        groupId: activeGroup.id,
        groupName: activeGroup.name || "",
        description: activeGroup.description || "",
        createdAt: new Date().toISOString(),
        rules,
      };

      const res = await fetch("/api/vendor/save-requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId: targetVendorId,
          orgId,
          requirementsProfile: profile,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to save vendor requirements.");
      }

      setToast({
        open: true,
        type: "success",
        message: `Requirements saved to vendor #${targetVendorId}.`,
      });
    } catch (err) {
      console.error("Save vendor requirements error", err);
      setToast({
        open: true,
        type: "error",
        message: err.message || "Failed to save vendor requirements.",
      });
    } finally {
      setSavingVendorProfile(false);
    }
  }
  // -------------------------------------
  // RENDER — PAGE LAYOUT
  // -------------------------------------
  return (
    <div
      style={{
        minHeight: "100vh",
        position: "relative",
        background:
          "radial-gradient(circle at top,#020617 0%,#020617 55%,#000 100%)",
        padding: "32px 40px 40px",
        color: "#e5e7eb",
        overflow: "hidden",
      }}
    >
      {/* BACKGROUND AURA */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 10% 0%,rgba(56,189,248,0.18),transparent 55%),radial-gradient(circle at 90% 10%,rgba(129,140,248,0.18),transparent 55%)",
          pointerEvents: "none",
        }}
      />

      {/* SCANLINES */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px)",
          backgroundSize: "100% 3px",
          opacity: 0.2,
          pointerEvents: "none",
        }}
      />

      {/* MAIN CONTENT */}
      <div style={{ position: "relative", zIndex: 1 }}>
        {/* HEADER */}
        <div style={{ marginBottom: 18 }}>
          <div
            style={{
              display: "inline-flex",
              gap: 8,
              padding: "4px 10px",
              borderRadius: 999,
              border: "1px solid rgba(148,163,184,0.4)",
              background:
                "linear-gradient(120deg,rgba(15,23,42,0.94),rgba(15,23,42,0.7))",
              marginBottom: 6,
            }}
          >
            <span
              style={{
                fontSize: 10,
                color: "#9ca3af",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Requirements Engine V5
            </span>
            <span
              style={{
                fontSize: 10,
                color: "#38bdf8",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              AI Builder • AI Explain • Conflict Intelligence
            </span>
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 26,
              fontWeight: 600,
            }}
          >
            Define{" "}
            <span
              style={{
                background: "linear-gradient(90deg,#38bdf8,#a5b4fc,#e5e7eb)",
                WebkitBackgroundClip: "text",
                color: "transparent",
              }}
            >
              coverage rules
            </span>{" "}
            that power alerts and AI decisions.
          </h1>

          <p
            style={{
              marginTop: 6,
              maxWidth: 720,
              fontSize: 13,
              color: "#cbd5f5",
            }}
          >
            This is your AI-enhanced insurance brain — automatically building,
            explaining, and auditing all coverage requirements.
          </p>

          <div
            style={{
              marginTop: 6,
              fontSize: 12,
              color: "#9ca3af",
            }}
          >
            Org: <span style={{ color: "#e5e7eb" }}>{orgId || "none"}</span> ·
            Groups: <span style={{ color: "#e5e7eb" }}>{groups.length}</span> ·
            Active:{" "}
            <span style={{ color: "#e5e7eb" }}>
              {activeGroup ? activeGroup.name : "none"}
            </span>
          </div>
        </div>

        {/* ERROR BANNER */}
        {error && (
          <div
            style={{
              marginBottom: 14,
              padding: "8px 10px",
              borderRadius: 10,
              background: "rgba(127,29,29,0.95)",
              border: "1px solid rgba(248,113,113,0.9)",
              color: "#fecaca",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        {/* AI RULE BUILDER */}
        <div
          style={{
            marginBottom: 24,
            padding: "24px 28px",
            borderRadius: 24,
            background: "rgba(15,23,42,0.78)",
            border: "1px solid rgba(80,120,255,0.35)",
            boxShadow:
              "0 0 35px rgba(64,106,255,0.25), inset 0 0 28px rgba(20,30,60,0.5)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div
            style={{
              fontSize: 14,
              textTransform: "uppercase",
              letterSpacing: 1.4,
              color: "#9ca3af",
              marginBottom: 10,
            }}
          >
            AI Rule Builder
          </div>

          <textarea
            value={aiInput}
            onChange={(e) => setAiInput(e.target.value)}
            placeholder={`Paste insurance requirements or type in natural language...
Example: "Vendors must carry GL 1M/2M, Auto 1M CSL, WC statutory + EL 1M.
Must include Additional Insured and Waiver of Subrogation."`}
            rows={5}
            style={{
              width: "100%",
              borderRadius: 18,
              padding: "16px 18px",
              border: "1px solid rgba(80,120,255,0.35)",
              background:
                "linear-gradient(145deg,rgba(15,23,42,0.96),rgba(20,30,60,0.98))",
              color: "#e5e7eb",
              fontSize: 14,
              fontFamily: "system-ui, sans-serif",
              marginBottom: 14,
              resize: "vertical",
              outline: "none",
            }}
          />

          <button
            onClick={handleAiBuildRules}
            disabled={!aiInput.trim() || saving}
            style={{
              padding: "12px 20px",
              borderRadius: 14,
              border: "1px solid rgba(56,189,248,0.9)",
              background: !aiInput.trim()
                ? "rgba(56,189,248,0.28)"
                : "linear-gradient(90deg,#38bdf8,#0ea5e9,#1e3a8a)",
              color: "white",
              fontSize: 15,
              fontWeight: 600,
              cursor: !aiInput.trim() ? "not-allowed" : "pointer",
              boxShadow: "0 0 18px rgba(56,189,248,0.3)",
              transition: "0.2s ease",
            }}
          >
            ⚡ Generate Rules (AI)
          </button>
        </div>

        {/* GRID WRAPPER */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "minmax(0,1.2fr) minmax(0,2fr) minmax(0,1.4fr)",
            gap: 18,
            alignItems: "stretch",
          }}
        >
          {/* LEFT PANEL — GROUPS */}
          <div
            style={{
              borderRadius: 22,
              padding: 18,
              background: "rgba(15,23,42,0.78)",
              border: "1px solid rgba(80,120,255,0.25)",
              boxShadow:
                "0 0 25px rgba(64,106,255,0.25), inset 0 0 20px rgba(20,30,60,0.45)",
              backdropFilter: "blur(12px)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 12,
                    textTransform: "uppercase",
                    letterSpacing: 1.4,
                    color: "#9ca3af",
                  }}
                >
                  Groups
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#cbd5f5",
                  }}
                >
                  Organize lanes of related coverage rules.
                </div>
              </div>

              <button
                onClick={handleCreateGroup}
                disabled={!canEdit || !orgId}
                style={{
                  padding: "8px 14px",
                  borderRadius: 999,
                  border: "1px solid rgba(56,189,248,0.8)",
                  background:
                    "radial-gradient(circle at top,#38bdf8,#0ea5e9,#0f172a)",
                  color: "white",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: !canEdit || !orgId ? "not-allowed" : "pointer",
                  opacity: !canEdit || !orgId ? 0.6 : 1,
                }}
              >
                + New Group
              </button>
            </div>

            <div
              style={{
                marginTop: 4,
                borderRadius: 18,
                border: "1px solid rgba(51,65,85,0.9)",
                background: "rgba(15,23,42,0.96)",
                flex: 1,
                padding: 10,
                overflowY: "auto",
              }}
            >
              {groups.length === 0 ? (
                <div
                  style={{
                    fontSize: 12,
                    color: "#9ca3af",
                    padding: "8px 6px",
                    borderRadius: 12,
                    border: "1px dashed rgba(75,85,99,0.9)",
                    background: "rgba(15,23,42,0.9)",
                  }}
                >
                  No groups yet. Click <strong>+ New Group</strong> to create
                  your first lane.
                </div>
              ) : (
                groups.map((g) => {
                  const isActive = g.id === activeGroupId;

                  const groupHasConflict = conflicts.some((c) =>
                    (c.rules || []).some((id) =>
                      rules.some(
                        (r) => r.id === id && r.group_id === g.id
                      )
                    )
                  );

                  return (
                    <button
                      key={g.id}
                      onClick={() => {
                        setActiveGroupId(g.id);
                        loadRulesForGroup(g.id);
                      }}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        borderRadius: 14,
                        padding: "8px 10px",
                        marginBottom: 6,
                        border: isActive
                          ? "1px solid rgba(56,189,248,0.9)"
                          : "1px solid rgba(51,65,85,0.9)",
                        background: isActive
                          ? "radial-gradient(circle at top,#1d4ed8,#020617)"
                          : "rgba(15,23,42,0.96)",
                        color: "#e5e7eb",
                        cursor: "pointer",
                        transition: "0.2s ease",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          marginBottom: 2,
                        }}
                      >
                        {g.name || "Untitled group"}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#9ca3af",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        {g.description || "No description"} ·{" "}
                        {g.rule_count || 0} rules
                        {groupHasConflict && (
                          <span
                            style={{
                              padding: "2px 6px",
                              borderRadius: 6,
                              fontSize: 10,
                              color: "#fecaca",
                              background: "rgba(127,29,29,0.7)",
                              border: "1px solid rgba(248,113,113,0.8)",
                            }}
                          >
                            ⚠ Conflicts
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* MIDDLE PANEL — GROUP HEADER + LANES */}
          <div
            style={{
              borderRadius: 22,
              padding: 18,
              background: "rgba(15,23,42,0.82)",
              border: "1px solid rgba(80,120,255,0.3)",
              boxShadow:
                "0 0 25px rgba(64,106,255,0.28), inset 0 0 22px rgba(15,23,42,0.9)",
              backdropFilter: "blur(12px)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {activeGroup ? (
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  marginBottom: 12,
                  alignItems: "flex-start",
                }}
              >
                <div style={{ flex: 1 }}>
                  <input
                    value={activeGroup?.name || ""}
                    onChange={(e) =>
                      handleUpdateGroup({ name: e.target.value })
                    }
                    disabled={!canEdit}
                    style={{
                      width: "100%",
                      borderRadius: 12,
                      padding: "8px 10px",
                      border: "1px solid rgba(51,65,85,0.9)",
                      background: "rgba(15,23,42,0.96)",
                      color: "#e5e7eb",
                      fontSize: 14,
                    }}
                  />

                  <textarea
                    value={activeGroup?.description || ""}
                    onChange={(e) =>
                      handleUpdateGroup({
                        description: e.target.value,
                      })
                    }
                    disabled={!canEdit}
                    rows={2}
                    placeholder="Describe what this group enforces…"
                    style={{
                      marginTop: 6,
                      width: "100%",
                      borderRadius: 12,
                      padding: "8px 10px",
                      border: "1px solid rgba(51,65,85,0.9)",
                      background: "rgba(15,23,42,0.96)",
                      color: "#cbd5f5",
                      fontSize: 13,
                      resize: "vertical",
                    }}
                  />
                </div>

                <div
                  style={{
                    width: 140,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 12,
                      color: "#9ca3af",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={activeGroup?.is_active ?? true}
                      onChange={(e) =>
                        handleUpdateGroup({
                          is_active: e.target.checked,
                        })
                      }
                      disabled={!canEdit}
                    />
                    Active
                  </label>

                  <button
                    onClick={handleCreateRule}
                    disabled={!canEdit}
                    style={{
                      padding: "7px 10px",
                      borderRadius: 999,
                      border: "1px solid rgba(56,189,248,0.8)",
                      background:
                        "radial-gradient(circle at top,#0ea5e9,#0f172a)",
                      color: "white",
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: !canEdit ? "not-allowed" : "pointer",
                    }}
                  >
                    + New Rule
                  </button>

                  <button
                    onClick={() => handleDeleteGroup(activeGroup.id)}
                    disabled={!canEdit}
                    style={{
                      padding: "7px 10px",
                      borderRadius: 999,
                      border: "1px solid rgba(248,113,113,0.85)",
                      background:
                        "radial-gradient(circle at top,#b91c1c,#111827)",
                      color: "#fecaca",
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: !canEdit ? "not-allowed" : "pointer",
                    }}
                  >
                    Delete group
                  </button>
                </div>
              </div>
            ) : (
              <div
                style={{
                  fontSize: 13,
                  color: "#9ca3af",
                  marginBottom: 12,
                }}
              >
                Select a group on the left to edit its rules.
              </div>
            )}

            <DndProvider backend={HTML5Backend}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 18,
                  minHeight: 420,
                }}
              >
                {["critical", "required", "recommended"].map((laneKey) => {
                  const laneLabel =
                    laneKey === "critical"
                      ? "Critical / Must-Have"
                      : laneKey === "required"
                      ? "Required"
                      : "Recommended";

                  const laneColor =
                    laneKey === "critical"
                      ? "rgba(248,113,113,0.75)"
                      : laneKey === "required"
                      ? "rgba(59,130,246,0.8)"
                      : "rgba(168,85,247,0.8)";

                  const laneRules = rules.filter(
                    (r) => r.severity === laneKey
                  );

                  return (
                    <LaneColumn
                      key={laneKey}
                      laneKey={laneKey}
                      label={laneLabel}
                      color={laneColor}
                      rules={laneRules}
                      onMoveRule={handleMoveRule}
                      onDeleteRule={handleDeleteRule}
                      onExplain={handleExplainRule}
                      canEdit={canEdit}
                      conflictedRuleIds={conflictedRuleIds}
                    />
                  );
                })}
              </div>
            </DndProvider>
          </div>
          {/* RIGHT PANEL — ENGINE + EVAL + AI SUGGEST + CONFLICT */}
          <div
            style={{
              borderRadius: 22,
              padding: 20,
              background: "rgba(15,23,42,0.78)",
              border: "1px solid rgba(80,120,255,0.25)",
              boxShadow:
                "0 0 25px rgba(64,106,255,0.25), inset 0 0 20px rgba(20,30,60,0.45)",
              backdropFilter: "blur(12px)",
              display: "flex",
              flexDirection: "column",
              gap: 18,
            }}
          >
            {/* ENGINE CONTROL */}
            <div>
              <div
                style={{
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: 1.4,
                  color: "#9ca3af",
                  marginBottom: 4,
                }}
              >
                Live Rule Preview
              </div>

              <div
                style={{
                  fontSize: 13,
                  color: "#cbd5f5",
                  marginBottom: 8,
                }}
              >
                Run the engine across all vendors using the current rule
                definitions.
              </div>

              <button
                onClick={handleRunEngine}
                disabled={runningEngine}
                style={{
                  padding: "9px 14px",
                  borderRadius: 12,
                  border: "1px solid #10b981",
                  background: runningEngine
                    ? "rgba(16,185,129,0.25)"
                    : "linear-gradient(90deg,#10b981,#059669)",
                  color: "white",
                  fontWeight: 500,
                  fontSize: 13,
                  cursor: runningEngine ? "not-allowed" : "pointer",
                  marginBottom: 6,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {runningEngine ? (
                  <>
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: "999px",
                        border: "2px solid rgba(187,247,208,0.9)",
                        borderTopColor: "transparent",
                        animation: "spin 0.9s linear infinite",
                      }}
                    />
                    Running engine…
                  </>
                ) : (
                  <>
                    <span>⚡</span>
                    Run engine now
                  </>
                )}
              </button>

              <button
                onClick={handleScanConflicts}
                disabled={conflictLoading}
                style={{
                  padding: "9px 14px",
                  borderRadius: 12,
                  border: "1px solid rgba(239,68,68,0.9)",
                  background: conflictLoading
                    ? "rgba(239,68,68,0.25)"
                    : "linear-gradient(90deg,#ef4444,#dc2626)",
                  color: "white",
                  fontWeight: 500,
                  fontSize: 13,
                  cursor: conflictLoading ? "not-allowed" : "pointer",
                  marginBottom: 10,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  boxShadow: "0 0 12px rgba(239,68,68,0.4)",
                }}
              >
                {conflictLoading ? (
                  <>
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: "999px",
                        border: "2px solid rgba(254,202,202,0.9)",
                        borderTopColor: "transparent",
                        animation: "spin 0.9s linear infinite",
                      }}
                    />
                    Scanning conflicts…
                  </>
                ) : (
                  <>
                    <span>🧠</span>
                    Scan for Conflicts (AI)
                  </>
                )}
              </button>

              <div
                style={{
                  fontSize: 11,
                  color: "#9ca3af",
                  marginBottom: 8,
                }}
              >
                {lastRunAt ? (
                  <>
                    Last run:{" "}
                    <span style={{ color: "#e5e7eb" }}>
                      {new Date(lastRunAt).toLocaleString()}
                    </span>
                  </>
                ) : (
                  "Engine has not been run in this session."
                )}
              </div>

              <div
                style={{
                  borderRadius: 12,
                  border: "1px solid rgba(51,65,85,0.9)",
                  background: "rgba(15,23,42,0.96)",
                  padding: 8,
                  maxHeight: 150,
                  overflowY: "auto",
                  fontSize: 12,
                  marginBottom: 8,
                }}
              >
                {activeGroup && rules.length > 0 ? (
                  rules.map((r) => {
                    const logic = r.logic || {};
                    const fieldKey = logic.field_key || r.field_key || "";
                    const op = logic.operator || r.operator || "";
                    const expVal = logic.expected_value ?? r.expected_value ?? "";
                    const ruleName = r.name || "";

                    return (
                      <div
                        key={r.id}
                        style={{
                          padding: "4px 0",
                          borderBottom: "1px solid rgba(31,41,55,0.8)",
                        }}
                      >
                        {ruleName ? (
                          <>
                            <span style={{ color: "#e5e7eb" }}>{ruleName}</span>
                            {" → "}
                          </>
                        ) : fieldKey ? (
                          <>
                            IF{" "}
                            <span style={{ color: "#93c5fd" }}>{fieldKey}</span>{" "}
                            {operatorLabel(op)}{" "}
                            <span style={{ color: "#a5b4fc" }}>{expVal}</span>
                            {" → "}
                          </>
                        ) : (
                          <span style={{ color: "#6b7280" }}>Empty rule → </span>
                        )}
                        <span
                          style={{
                            color:
                              SEVERITY_COLORS[r.severity] ||
                              SEVERITY_COLORS.medium,
                          }}
                        >
                          {String(r.severity || "medium").toUpperCase()} ALERT
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ color: "#6b7280" }}>
                    Add rules in the lanes to preview logic.
                  </div>
                )}
              </div>

              <div
                style={{
                  borderRadius: 12,
                  border: "1px solid rgba(55,65,81,0.9)",
                  background:
                    "repeating-linear-gradient(135deg,rgba(15,23,42,1),rgba(15,23,42,1) 6px,rgba(17,24,39,1) 6px,rgba(17,24,39,1) 12px)",
                  padding: 8,
                  maxHeight: 130,
                  overflowY: "auto",
                  fontSize: 11,
                }}
              >
                {engineLog.length === 0 ? (
                  <div style={{ color: "#6b7280" }}>
                    No engine runs yet. Click{" "}
                    <span style={{ color: "#e5e7eb" }}>Run engine now</span> to
                    evaluate all vendors.
                  </div>
                ) : (
                  engineLog.map((entry, idx) => {
                    const color =
                      entry.level === "error"
                        ? "#fecaca"
                        : entry.level === "success"
                        ? "#bbf7d0"
                        : "#e5e7eb";

                    const dotColor =
                      entry.level === "error"
                        ? "#f97373"
                        : entry.level === "success"
                        ? "#4ade80"
                        : "#38bdf8";

                    return (
                      <div
                        key={`${entry.at}-${idx}`}
                        style={{
                          display: "flex",
                          gap: 6,
                          alignItems: "flex-start",
                          marginBottom: 4,
                          color,
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            marginTop: 4,
                            borderRadius: "999px",
                            background: dotColor,
                            boxShadow: `0 0 10px ${dotColor}`,
                          }}
                        />
                        <div>
                          <div
                            style={{
                              color: "#9ca3af",
                              marginBottom: 1,
                            }}
                          >
                            {new Date(entry.at).toLocaleTimeString()}
                          </div>
                          <div>{entry.message}</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* SAVE TO VENDOR REQUIREMENTS_JSON */}
            <div
              style={{
                borderTop: "1px solid rgba(55,65,81,0.9)",
                paddingTop: 12,
                marginTop: 12,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: 1.4,
                  color: "#9ca3af",
                  marginBottom: 6,
                }}
              >
                Vendor Requirements Profile
              </div>

              <div
                style={{
                  fontSize: 12,
                  color: "#cbd5f5",
                  marginBottom: 10,
                }}
              >
                Save the{" "}
                <span style={{ color: "#e5e7eb" }}>
                  current group + rules
                </span>{" "}
                as the vendor&apos;s{" "}
                <code style={{ color: "#38bdf8" }}>requirements_json</code>.
                This is what Document → Alert Intelligence V2 will use on COI
                upload.
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginBottom: 8,
                  alignItems: "center",
                }}
              >
                <input
                  type="number"
                  placeholder="Vendor ID"
                  value={targetVendorId}
                  onChange={(e) => setTargetVendorId(e.target.value)}
                  style={{
                    flex: 1,
                    borderRadius: 10,
                    padding: "6px 10px",
                    border: "1px solid rgba(51,65,85,0.9)",
                    background: "rgba(15,23,42,0.96)",
                    color: "#e5e7eb",
                    fontSize: 12,
                  }}
                />

                <button
                  onClick={handleSaveRequirementsForVendor}
                  disabled={
                    !canEdit ||
                    !orgId ||
                    !activeGroup ||
                    !rules.length ||
                    savingVendorProfile
                  }
                  style={{
                    padding: "7px 12px",
                    borderRadius: 10,
                    border: "1px solid rgba(56,189,248,0.9)",
                    background:
                      !canEdit ||
                      !orgId ||
                      !activeGroup ||
                      !rules.length ||
                      savingVendorProfile
                        ? "rgba(56,189,248,0.25)"
                        : "linear-gradient(90deg,#38bdf8,#0ea5e9)",
                    color: "white",
                    fontSize: 12,
                    fontWeight: 500,
                    cursor:
                      !canEdit ||
                      !orgId ||
                      !activeGroup ||
                      !rules.length ||
                      savingVendorProfile
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  {savingVendorProfile ? "Saving…" : "Save to Vendor"}
                </button>
              </div>

              <div
                style={{
                  fontSize: 11,
                  color: "#9ca3af",
                }}
              >
                Tip: Use different groups as templates (Standard Sub, Roofer,
                Snow Removal, Professional Services, etc.) and map them to each
                vendor individually.
              </div>
            </div>

            {/* SAMPLE POLICY EVALUATION */}
            <div
              style={{
                borderTop: "1px solid rgba(51,65,85,0.9)",
                paddingTop: 10,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: 1.4,
                  color: "#9ca3af",
                  marginBottom: 6,
                }}
              >
                Sample Policy Evaluation
              </div>

              <textarea
                value={samplePolicyText}
                onChange={(e) => setSamplePolicyText(e.target.value)}
                rows={7}
                style={{
                  width: "100%",
                  borderRadius: 12,
                  padding: 10,
                  border: "1px solid rgba(51,65,85,0.9)",
                  background: "rgba(15,23,42,0.96)",
                  color: "#e5e7eb",
                  fontFamily: "monospace",
                  fontSize: 12,
                  marginBottom: 8,
                  resize: "vertical",
                }}
              />

              <button
                onClick={handleEvaluateSamplePolicy}
                disabled={!rules.length}
                style={{
                  width: "100%",
                  padding: "8px 14px",
                  borderRadius: 12,
                  border: "1px solid rgba(129,140,248,0.9)",
                  background: rules.length
                    ? "linear-gradient(90deg,#6366f1,#4f46e5)"
                    : "rgba(129,140,248,0.15)",
                  color: "white",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: rules.length ? "pointer" : "not-allowed",
                }}
              >
                Evaluate sample policy
              </button>

              {evaluation.ok && (
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 11,
                    color: "#9ca3af",
                  }}
                >
                  Sample evaluation complete (
                  {Object.keys(evaluation.results).length} rules scanned).
                </div>
              )}
            </div>

            {/* AI SUGGEST BUTTON */}
            <div style={{ marginTop: 10 }}>
              <button
                onClick={handleOpenAiSuggest}
                style={{
                  padding: "10px 14px",
                  width: "100%",
                  borderRadius: 12,
                  border: "1px solid rgba(168,85,247,0.8)",
                  background:
                    "linear-gradient(120deg,rgba(168,85,247,0.3),rgba(88,28,135,0.4))",
                  color: "#e9d5ff",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                ✨ AI Suggest a Rule
              </button>
            </div>

            {/* AI SUGGEST MODAL */}
            {aiOpen && (
              <div
                style={{
                  marginTop: 14,
                  padding: 14,
                  borderRadius: 16,
                  border: "1px solid rgba(168,85,247,0.4)",
                  background: "rgba(15,23,42,0.9)",
                }}
              >
                {aiThinking ? (
                  <div style={{ fontSize: 12, color: "#c4b5fd" }}>
                    AI analyzing your rules…
                  </div>
                ) : (
                  <>
                    <div
                      style={{
                        fontSize: 13,
                        color: "#e9d5ff",
                        marginBottom: 10,
                      }}
                    >
                      Suggested Rule:
                    </div>

                    <div
                      style={{
                        padding: 10,
                        borderRadius: 8,
                        border: "1px solid rgba(88,28,135,0.6)",
                        background: "rgba(15,23,42,0.95)",
                        color: "#ddd6fe",
                        marginBottom: 12,
                        fontSize: 12,
                      }}
                    >
                      {aiSuggestion}
                    </div>

                    <button
                      onClick={handleApplyAiSuggestion}
                      style={{
                        width: "100%",
                        padding: "8px 14px",
                        borderRadius: 12,
                        background:
                          "linear-gradient(90deg,#a855f7,#7e22ce)",
                        color: "white",
                        fontWeight: 500,
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      ✔ Add Rule to Current Group
                    </button>

                    <button
                      onClick={() => setAiOpen(false)}
                      style={{
                        marginTop: 8,
                        width: "100%",
                        padding: "8px 14px",
                        borderRadius: 12,
                        border: "1px solid #4b5563",
                        color: "#9ca3af",
                        background: "rgba(15,23,42,0.8)",
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* EXPLAIN RULE DRAWER */}
        {explainOpen && (
          <div
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              width: "360px",
              height: "100vh",
              background:
                "linear-gradient(145deg,rgba(15,23,42,0.98),rgba(15,23,42,0.96))",
              borderLeft: "1px solid rgba(148,163,184,0.4)",
              boxShadow: "-20px 0 40px rgba(0,0,0,0.6)",
              padding: "18px",
              zIndex: 999,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#e5e7eb",
                }}
              >
                AI Explanation
              </div>

              <button
                onClick={() => setExplainOpen(false)}
                style={{
                  borderRadius: 999,
                  padding: "4px 8px",
                  fontSize: 12,
                  background: "rgba(15,23,42,0.8)",
                  border: "1px solid rgba(148,163,184,0.6)",
                  color: "#9ca3af",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>

            <div
              style={{
                borderRadius: 12,
                border: "1px solid rgba(51,65,85,0.9)",
                background: "rgba(15,23,42,0.96)",
                padding: 12,
                color: "#cbd5f5",
                fontSize: 13,
                overflowY: "auto",
                flex: 1,
                whiteSpace: "pre-wrap",
              }}
            >
              {explainLoading
                ? "AI is analyzing this rule..."
                : explainText || "No explanation available for this rule."}
            </div>
          </div>
        )}

        {/* CONFLICT DRAWER */}
        {conflictOpen && (
          <div
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              width: "400px",
              height: "100vh",
              background:
                "linear-gradient(145deg,rgba(15,23,42,0.98),rgba(15,23,42,0.96))",
              borderLeft: "1px solid rgba(148,163,184,0.4)",
              boxShadow: "-20px 0 40px rgba(0,0,0,0.6)",
              padding: "22px",
              zIndex: 1000,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#e5e7eb",
                }}
              >
                Conflict Analysis
              </div>

              <button
                onClick={() => setConflictOpen(false)}
                style={{
                  borderRadius: 999,
                  padding: "4px 8px",
                  fontSize: 12,
                  background: "rgba(15,23,42,0.8)",
                  border: "1px solid rgba(148,163,184,0.6)",
                  color: "#9ca3af",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>

            {conflictLoading && (
              <div style={{ color: "#cbd5f5", fontSize: 13 }}>
                AI is analyzing all rules for conflicts…
              </div>
            )}

            {!conflictLoading && conflicts.length === 0 && (
              <div
                style={{
                  fontSize: 13,
                  color: "#9ca3af",
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid rgba(55,65,81,0.6)",
                  background: "rgba(15,23,42,0.8)",
                }}
              >
                ✅ No conflicts detected.
              </div>
            )}

            {!conflictLoading &&
              conflicts.length > 0 &&
              conflicts.map((c, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: 14,
                    borderRadius: 14,
                    marginBottom: 12,
                    background:
                      "linear-gradient(145deg,rgba(31,41,55,0.8),rgba(17,24,39,0.9))",
                    border: "1px solid rgba(239,68,68,0.6)",
                  }}
                >
                  <div
                    style={{
                      color: "#fca5a5",
                      fontWeight: 600,
                      marginBottom: 6,
                      fontSize: 14,
                    }}
                  >
                    ⚠ Conflict #{idx + 1}
                  </div>

                  <div style={{ color: "#e5e7eb", fontSize: 13 }}>
                    {c.summary}
                  </div>

                  <div
                    style={{
                      color: "#fcd34d",
                      fontSize: 12,
                      marginTop: 8,
                      fontStyle: "italic",
                    }}
                  >
                    Suggestion: {c.suggestion}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* SAVING INDICATOR */}
      {saving && (
        <div
          style={{
            position: "fixed",
            right: 18,
            bottom: 18,
            padding: "6px 12px",
            borderRadius: 999,
            background: "rgba(15,23,42,0.9)",
            border: "1px solid rgba(148,163,184,0.7)",
            color: "#e5e7eb",
            fontSize: 12,
            zIndex: 50,
          }}
        >
          Saving…
        </div>
      )}

      {/* TOAST */}
      <ToastV2
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() =>
          setToast((p) => ({
            ...p,
            open: false,
          }))
        }
      />

      {/* GLOBAL SPIN ANIMATION */}
      <style jsx global>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
