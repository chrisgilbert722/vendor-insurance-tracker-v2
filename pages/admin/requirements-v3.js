// pages/admin/requirements-v3.js
import { useEffect, useState, useMemo } from "react";
import { useRole } from "../../lib/useRole";
import { useOrg } from "../../context/OrgContext";
import ToastV2 from "../../components/ToastV2";

/**
 * REQUIREMENTS ENGINE V3 — UI + Sample Evaluation + Engine Runner
 */

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
  { key: "gte", label: "≥ (Greater or Equal)" },
  { key: "lte", label: "≤ (Less or Equal)" },
  { key: "contains", label: "Contains" },
];

const SEVERITY_COLORS = {
  critical: "#fb7185",
  high: "#f97316",
  medium: "#eab308",
  low: "#22c55e",
};

export default function RequirementsV3Page() {
  const { isAdmin, isManager } = useRole();

  // *** PATCHED — ORG ID FIX ***
  const { activeOrgId: orgId, loadingOrgs } = useOrg();

  const canEdit = isAdmin || isManager;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [groups, setGroups] = useState([]);
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [rules, setRules] = useState([]);

  // Toast
  const [toast, setToast] = useState({
    open: false,
    message: "",
    type: "success",
  });

  // Sample policy JSON
  const [samplePolicyText, setSamplePolicyText] = useState(
    `{
  "policy.coverage_type": "General Liability",
  "policy.glEachOccurrence": 1000000,
  "policy.glAggregate": 2000000,
  "policy.expiration_date": "2025-12-31",
  "policy.carrier": "Sample Carrier"
}`
  );

  const [evaluation, setEvaluation] = useState({
    ok: false,
    error: "",
    results: {}, // ruleId → pass/fail
  });

  const activeGroup = useMemo(
    () => groups.find((g) => g.id === activeGroupId) || null,
    [groups, activeGroupId]
  );

  // *** PATCHED — CORRECT ORG LOADING FLOW ***
  useEffect(() => {
    if (loadingOrgs) return;
    if (!orgId) return;
    loadGroups();
  }, [orgId, loadingOrgs]);
  async function loadGroups() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/requirements-v2/groups?orgId=${encodeURIComponent(orgId)}`
      );
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed to load groups");

      const g = json.groups || [];
      setGroups(g);

      if (g.length) {
        setActiveGroupId(g[0].id);
        await loadRulesForGroup(g[0].id);
      } else {
        setActiveGroupId(null);
        setRules([]);
      }
    } catch (err) {
      console.error("loadGroups error:", err);
      setError(err.message || "Failed to load rule groups.");
    } finally {
      setLoading(false);
    }
  }

  async function loadRulesForGroup(groupId) {
    if (!groupId) {
      setRules([]);
      return;
    }
    setError("");
    try {
      const res = await fetch(
        `/api/requirements-v2/rules?groupId=${encodeURIComponent(groupId)}`
      );
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed to load rules");

      setRules(json.rules || []);
      setEvaluation({ ok: false, error: "", results: {} }); // reset eval
    } catch (err) {
      console.error("loadRulesForGroup error:", err);
      setError(err.message || "Failed to load rules for this group.");
    }
  }

  // GROUP CRUD
  async function handleCreateGroup() {
    if (!canEdit || !orgId) return;
    const name = prompt("New group name:");
    if (!name) return;

    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/requirements-v2/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, name }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);

      const newGroup = json.group;
      setGroups((prev) => [newGroup, ...prev]);
      setActiveGroupId(newGroup.id);
      setRules([]);

      setToast({
        open: true,
        type: "success",
        message: "Group created",
      });
    } catch (err) {
      console.error("createGroup error:", err);
      setToast({ open: true, type: "error", message: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateGroup(patch) {
    if (!activeGroup || !canEdit) return;

    const updated = { ...activeGroup, ...patch };
    setGroups((prev) =>
      prev.map((g) => (g.id === activeGroup.id ? updated : g))
    );

    setSaving(true);
    try {
      const res = await fetch("/api/requirements-v2/groups", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: activeGroup.id,
          name: updated.name,
          description: updated.description,
          is_active: updated.is_active,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);

      setToast({ open: true, type: "success", message: "Group updated" });
    } catch (err) {
      console.error("updateGroup error:", err);
      setToast({ open: true, type: "error", message: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteGroup(groupId) {
    if (!canEdit || !groupId) return;
    if (!window.confirm("Delete this entire group?")) return;

    setSaving(true);
    try {
      const res = await fetch(
        `/api/requirements-v2/groups?id=${encodeURIComponent(groupId)}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);

      const remaining = groups.filter((g) => g.id !== groupId);
      setGroups(remaining);

      if (remaining.length) {
        setActiveGroupId(remaining[0].id);
        await loadRulesForGroup(remaining[0].id);
      } else {
        setActiveGroupId(null);
        setRules([]);
      }

      setToast({ open: true, type: "success", message: "Group deleted" });
    } catch (err) {
      console.error("deleteGroup error:", err);
      setToast({ open: true, type: "error", message: err.message });
    } finally {
      setSaving(false);
    }
  }

  // RULE CRUD
  async function handleCreateRule() {
    if (!activeGroup || !canEdit) return;

    const field_key = prompt("Field key:");
    if (!field_key) return;

    const expected_value = prompt("Expected value:");
    if (!expected_value) return;

    setSaving(true);
    try {
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
      setToast({ open: true, type: "success", message: "Rule created" });
    } catch (err) {
      console.error("createRule error:", err);
      setToast({ open: true, type: "error", message: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateRule(ruleId, patch) {
    if (!canEdit || !ruleId) return;

    const current = rules.find((r) => r.id === ruleId);
    if (!current) return;

    const updated = { ...current, ...patch };
    setRules((prev) => prev.map((r) => (r.id === ruleId ? updated : r)));

    setSaving(true);
    try {
      const res = await fetch("/api/requirements-v2/rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);

      setToast({ open: true, type: "success", message: "Rule updated" });
    } catch (err) {
      console.error("updateRule error:", err);
      setToast({ open: true, type: "error", message: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteRule(ruleId) {
    if (!canEdit || !ruleId) return;
    if (!window.confirm("Delete this rule?")) return;

    setSaving(true);
    try {
      const res = await fetch(
        `/api/requirements-v2/rules?id=${encodeURIComponent(ruleId)}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);

      setRules((prev) => prev.filter((r) => r.id !== ruleId));
      setToast({ open: true, type: "success", message: "Rule deleted" });
    } catch (err) {
      console.error("deleteRule error:", err);
      setToast({ open: true, type: "error", message: err.message });
    } finally {
      setSaving(false);
    }
  }

  // ENGINE RUNNER
  async function handleRunEngine() {
    try {
      setSaving(true);

      const res = await fetch("/api/engine/run-v3", { method: "POST" });
      const json = await res.json();

      if (json.ok) {
        setToast({
          open: true,
          type: "success",
          message: json.message || "Engine run completed",
        });
      } else {
        throw new Error(json.error || "Engine failed");
      }
    } catch (err) {
      setToast({
        open: true,
        type: "error",
        message: err.message,
      });
    } finally {
      setSaving(false);
    }
  }

  // LOCAL EVALUATION
  function handleEvaluateSamplePolicy() {
    setEvaluation({ ok: false, error: "", results: {} });

    let parsed = {};
    try {
      parsed = JSON.parse(samplePolicyText);
    } catch (err) {
      setToast({
        open: true,
        type: "error",
        message: "Invalid JSON",
      });
      setEvaluation({
        ok: false,
        error: "Invalid JSON",
        results: {},
      });
      return;
    }

    if (!rules.length) {
      setEvaluation({
        ok: false,
        error: "No rules in this group.",
        results: {},
      });
      return;
    }

    const results = {};
    for (const r of rules) {
      results[r.id] = evaluateRule(r, parsed);
    }

    setEvaluation({ ok: true, error: "", results });
    setToast({
      open: true,
      type: "success",
      message: "Sample policy evaluated",
    });
  }
return (
  <div
    style={{
      minHeight: "100vh",
      position: "relative",
      background:
        "radial-gradient(circle at top left,#020617 0%, #020617 40%, #000 100%)",
      padding: "30px 40px 40px",
      color: "#e5e7eb",
    }}
  >
    <div style={{ marginBottom: 18 }}>
      <div
        style={{
          display: "inline-flex",
          gap: 8,
          padding: "4px 10px",
          borderRadius: 999,
          border: "1px solid rgba(148,163,184,0.4)",
          background:
            "linear-gradient(120deg,rgba(15,23,42,0.92),rgba(15,23,42,0.7))",
          marginBottom: 6,
        }}
      >
        <span style={{ fontSize: 10, color: "#9ca3af" }}>
          Requirements Engine V3
        </span>
        <span style={{ fontSize: 10, color: "#38bdf8" }}>
          Coverage • Limits • Endorsements
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
            background:
              "linear-gradient(90deg,#38bdf8,#a5b4fc,#e5e7eb)",
            WebkitBackgroundClip: "text",
            color: "transparent",
          }}
        >
          coverage rules
        </span>{" "}
        that power alerts automatically.
      </h1>

      <p
        style={{ marginTop: 6, maxWidth: 680, fontSize: 13, color: "#cbd5f5" }}
      >
        Each rule is evaluated whenever a vendor uploads a policy.
      </p>
    </div>
    {error && (
      <div
        style={{
          marginBottom: 12,
          padding: "8px 10px",
          borderRadius: 10,
          border: "1px solid rgba(248,113,113,0.9)",
          background: "rgba(127,29,29,0.95)",
          color: "#fecaca",
        }}
      >
        {error}
      </div>
    )}

    {!canEdit && (
      <div
        style={{
          marginBottom: 14,
          padding: "8px 10px",
          borderRadius: 10,
          border: "1px solid rgba(148,163,184,0.6)",
          background: "rgba(15,23,42,0.9)",
        }}
      >
        You are in read-only mode.
      </div>
    )}
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "260px 1.7fr 1.3fr",
        gap: 18,
      }}
    >
      {/* LEFT — GROUPS */}
      <div
        style={{
          borderRadius: 20,
          padding: 14,
          background:
            "linear-gradient(135deg,rgba(15,23,42,0.98),rgba(15,23,42,0.9))",
          border: "1px solid rgba(148,163,184,0.5)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 6,
          }}
        >
          <div style={{ fontSize: 11, color: "#9ca3af" }}>Groups</div>
          <button
            disabled={!canEdit || !orgId}
            onClick={handleCreateGroup}
            style={{
              borderRadius: 999,
              padding: "6px 10px",
              border: "1px solid rgba(59,130,246,0.9)",
              background:
                "radial-gradient(circle at top left,#3b82f6,#1d4ed8,#0f172a)",
              color: "#e0f2fe",
            }}
          >
            + New
          </button>
        </div>

        <div
          style={{
            marginTop: 6,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            maxHeight: 520,
            overflowY: "auto",
          }}
        >
          {loading ? (
            <div style={{ fontSize: 12, color: "#9ca3af" }}>
              Loading groups…
            </div>
          ) : groups.length === 0 ? (
            <div
              style={{
                padding: 10,
                borderRadius: 12,
                border: "1px dashed rgba(148,163,184,0.6)",
                fontSize: 12,
                color: "#9ca3af",
              }}
            >
              No requirement groups yet.
            </div>
          ) : (
            groups.map((g) => (
              <button
                key={g.id}
                onClick={() => {
                  setActiveGroupId(g.id);
                  loadRulesForGroup(g.id);
                }}
                style={{
                  textAlign: "left",
                  borderRadius: 14,
                  padding: "8px 9px",
                  border:
                    activeGroupId === g.id
                      ? "1px solid rgba(59,130,246,0.9)"
                      : "1px solid rgba(51,65,85,0.9)",
                  background:
                    activeGroupId === g.id
                      ? "rgba(15,23,42,0.98)"
                      : "rgba(15,23,42,0.94)",
                  color: "#e5e7eb",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 500 }}>{g.name}</div>
                <div style={{ fontSize: 11, color: "#9ca3af" }}>
                  {g.description || "No description"} · {g.rule_count} rules
                </div>
              </button>
            ))
          )}
        </div>
      </div>
      {/* MIDDLE — RULES */}
      <div
        style={{
          borderRadius: 20,
          padding: 14,
          background:
            "radial-gradient(circle at top left,rgba(15,23,42,0.98),rgba(15,23,42,0.9))",
          border: "1px solid rgba(148,163,184,0.55)",
        }}
      >
        {activeGroup ? (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
      {/* END RIGHT PANEL WRAPS */}
      </div>
    </div>

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
        }}
      >
        Saving…
      </div>
    )}

    <ToastV2
      open={toast.open}
      message={toast.message}
      type={toast.type}
      onClose={() => setToast({ ...toast, open: false })}
    />
  </div>
);
function RuleCard({ rule, onUpdate, onDelete, canEdit }) {
  const sevColor =
    SEVERITY_COLORS[rule.severity] || SEVERITY_COLORS.medium;

  return (
    <div
      style={{
        borderRadius: 14,
        padding: 10,
        border: "1px solid rgba(51,65,85,0.95)",
        background: "rgba(15,23,42,0.96)",
      }}
    >
      <div style={{ display: "flex", gap: 10, marginBottom: 6 }}>
        <select
          value={rule.field_key}
          onChange={(e) => onUpdate({ field_key: e.target.value })}
          disabled={!canEdit}
          style={{
            flex: 1,
            borderRadius: 999,
            padding: "6px 8px",
            background: "rgba(15,23,42,0.96)",
            color: "#e5e7eb",
          }}
        >
          {FIELD_OPTIONS.map((f) => (
            <option key={f.key} value={f.key}>
              {f.label}
            </option>
          ))}
        </select>

        <select
          value={rule.operator}
          onChange={(e) => onUpdate({ operator: e.target.value })}
          disabled={!canEdit}
          style={{
            width: 130,
            borderRadius: 999,
            padding: "6px 8px",
            background: "rgba(15,23,42,0.96)",
            color: "#e5e7eb",
          }}
        >
          {OPERATOR_OPTIONS.map((op) => (
            <option key={op.key} value={op.key}>
              {op.label}
            </option>
          ))}
        </select>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
        <input
          value={rule.expected_value}
          onChange={(e) => onUpdate({ expected_value: e.target.value })}
          disabled={!canEdit}
          style={{
            flex: 1,
            borderRadius: 999,
            padding: "6px 9px",
            background: "rgba(15,23,42,0.96)",
            color: "#e5e7eb",
          }}
        />

        <select
          value={rule.severity}
          onChange={(e) => onUpdate({ severity: e.target.value })}
          disabled={!canEdit}
          style={{
            width: 120,
            borderRadius: 999,
            padding: "6px 8px",
            background: "rgba(15,23,42,0.96)",
            color: sevColor,
          }}
        >
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>
      <input
        value={rule.requirement_text || ""}
        onChange={(e) => onUpdate({ requirement_text: e.target.value })}
        disabled={!canEdit}
        placeholder="Plain language requirement"
        style={{
          width: "100%",
          borderRadius: 999,
          padding: "6px 9px",
          background: "rgba(15,23,42,0.96)",
          color: "#e5e7eb",
          marginBottom: 6,
        }}
      />

      <input
        value={rule.internal_note || ""}
        onChange={(e) => onUpdate({ internal_note: e.target.value })}
        disabled={!canEdit}
        placeholder="Internal note"
        style={{
          width: "100%",
          borderRadius: 999,
          padding: "6px 9px",
          background: "rgba(15,23,42,0.96)",
          color: "#9ca3af",
          marginBottom: 6,
        }}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 4,
        }}
      >
        <label style={{ fontSize: 11, color: "#9ca3af", display: "flex" }}>
          <input
            type="checkbox"
            checked={rule.is_active ?? true}
            onChange={(e) => onUpdate({ is_active: e.target.checked })}
            disabled={!canEdit}
          />
          Active
        </label>

        <button
          disabled={!canEdit}
          onClick={onDelete}
          style={{
            borderRadius: 999,
            padding: "3px 7px",
            border: "1px solid rgba(248,113,113,0.8)",
            background: "rgba(127,29,29,0.9)",
            color: "#fecaca",
            fontSize: 11,
          }}
        >
          Delete
        </button>
      </div>
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
  const op = rule.operator || "equals";

  if (rawVal === undefined || rawVal === null) return false;

  const normalize = (v) => {
    if (typeof v === "number") return v;
    if (typeof v === "string") {
      const n = parseFloat(v.replace(/[^0-9.-]/g, ""));
      return isNaN(n) ? null : n;
    }
    return null;
  };

  if (op === "equals") return String(rawVal) === String(expected);
  if (op === "not_equals") return String(rawVal) !== String(expected);
  if (op === "contains")
    return String(rawVal).toLowerCase().includes(String(expected).toLowerCase());
  if (op === "gte") return normalize(rawVal) >= normalize(expected);
  if (op === "lte") return normalize(rawVal) <= normalize(expected);

  return false;
}
