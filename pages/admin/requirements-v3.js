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

  const [toast, setToast] = useState({
    open: false,
    message: "",
    type: "success",
  });

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
    results: {},
  });

  const activeGroup = useMemo(
    () => groups.find((g) => g.id === activeGroupId) || null,
    [groups, activeGroupId]
  );

  // --------------------------
  // LOAD GROUPS
  // --------------------------
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

      if (!json.ok) throw new Error(json.error || "Failed to load groups");

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
      setError(err.message);
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

      setGroups((p) => [json.group, ...p]);
      setActiveGroupId(json.group.id);
      setRules([]);
      setToast({ open: true, type: "success", message: "Group created" });
    } catch (err) {
      setToast({ open: true, type: "error", message: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateGroup(patch) {
    if (!activeGroup) return;
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
      setToast({ open: true, type: "success", message: "Group updated" });
    } catch (err) {
      setToast({ open: true, type: "error", message: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteGroup(id) {
    if (!id) return;
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

      setToast({ open: true, type: "success", message: "Group deleted" });
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
    if (!activeGroup) return;
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

      setRules((p) => [...p, json.rule]);
      setToast({ open: true, type: "success", message: "Rule created" });
    } catch (err) {
      setToast({ open: true, type: "error", message: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateRule(ruleId, patch) {
    const updated = { ...rules.find((r) => r.id === ruleId), ...patch };
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
      setToast({ open: true, type: "success", message: "Rule updated" });
    } catch (err) {
      setToast({ open: true, type: "error", message: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteRule(ruleId) {
    if (!ruleId) return;
    if (!window.confirm("Delete this rule?")) return;

    try {
      setSaving(true);
      const res = await fetch(`/api/requirements-v2/rules?id=${ruleId}`, {
        method: "DELETE",
      });
      const json = await res.json();

      if (!json.ok) throw new Error(json.error);
      setRules((p) => p.filter((r) => r.id !== ruleId));

      setToast({ open: true, type: "success", message: "Rule deleted" });
    } catch (err) {
      setToast({ open: true, type: "error", message: err.message });
    } finally {
      setSaving(false);
    }
  }
{/* MIDDLE PANEL — RULES */}
<div
  style={{
    borderRadius: 22,
    padding: 20,
    background: "rgba(15,23,42,0.75)",
    border: "1px solid rgba(80,120,255,0.25)",
    boxShadow:
      "0 0 25px rgba(64,106,255,0.25), inset 0 0 20px rgba(20,30,60,0.45)",
    backdropFilter: "blur(12px)",
  }}
>
  <div style={{ marginBottom: 10 }}>
    <strong style={{ fontSize: 16 }}>Rules</strong>
    <div style={{ color: "#94a3b8", fontSize: 12 }}>
      Select a group to view and edit its rules.
    </div>
  </div>

  <button
    onClick={handleCreateRule}
    disabled={!activeGroup}
    style={{
      width: "100%",
      padding: "8px 14px",
      borderRadius: 12,
      border: "1px solid #38bdf8",
      background: activeGroup
        ? "linear-gradient(90deg,#0ea5e9,#2563eb)"
        : "rgba(148,163,184,0.2)",
      color: activeGroup ? "white" : "#64748b",
      marginBottom: 14,
      fontSize: 14,
      cursor: activeGroup ? "pointer" : "not-allowed",
    }}
  >
    + New rule
  </button>

  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    {!activeGroup ? (
      <div
        style={{
          padding: 16,
          borderRadius: 14,
          border: "1px dashed rgba(148,163,184,0.45)",
          color: "#94a3b8",
          fontSize: 13,
        }}
      >
        Select a group to view rules.
      </div>
    ) : rules.length === 0 ? (
      <div
        style={{
          padding: 16,
          borderRadius: 14,
          border: "1px dashed rgba(148,163,184,0.45)",
          color: "#94a3b8",
          fontSize: 13,
        }}
      >
        No rules yet.
      </div>
    ) : (
      rules.map((r) => (
        <div
          key={r.id}
          style={{
            padding: 16,
            borderRadius: 14,
            border: "1px solid rgba(148,163,184,0.4)",
            background: "rgba(255,255,255,0.02)",
            backdropFilter: "blur(6px)",
          }}
        >
          <div style={{ marginBottom: 6 }}>
            <strong style={{ fontSize: 14 }}>{r.field_key}</strong>
            <span style={{ marginLeft: 6, color: "#a5b4fc" }}>
              {operatorLabel(r.operator)}
            </span>
            <span style={{ marginLeft: 6, color: "#38bdf8" }}>
              {r.expected_value}
            </span>
          </div>
          {/* Rule details + editor */}
          <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12 }}>
            Severity:
            <span
              style={{
                marginLeft: 6,
                color: SEVERITY_COLORS[r.severity] || "#f8c300",
                fontWeight: 600,
              }}
            >
              {r.severity.toUpperCase()}
            </span>
          </div>

          {/* Update + Delete */}
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() =>
                handleUpdateRule(r.id, {
                  severity:
                    r.severity === "critical"
                      ? "high"
                      : r.severity === "high"
                      ? "medium"
                      : r.severity === "medium"
                      ? "low"
                      : "critical",
                })
              }
              style={{
                flex: 1,
                padding: "6px 10px",
                borderRadius: 10,
                border: "1px solid #38bdf8",
                background: "rgba(14,165,233,0.2)",
                color: "#38bdf8",
                fontSize: 12,
              }}
            >
              Toggle Severity
            </button>

            <button
              onClick={() => handleDeleteRule(r.id)}
              style={{
                flex: 1,
                padding: "6px 10px",
                borderRadius: 10,
                border: "1px solid rgba(248,113,113,0.6)",
                background: "rgba(248,113,113,0.1)",
                color: "#f87171",
                fontSize: 12,
              }}
            >
              Delete Rule
            </button>
          </div>
        </div>
      ))
    )}
  </div>
</div>
{/* RIGHT PANEL — LIVE PREVIEW + SAMPLE POLICY */}
<div
  style={{
    borderRadius: 22,
    padding: 20,
    background: "rgba(15,23,42,0.75)",
    border: "1px solid rgba(80,120,255,0.25)",
    boxShadow:
      "0 0 25px rgba(64,106,255,0.25), inset 0 0 20px rgba(20,30,60,0.45)",
    backdropFilter: "blur(12px)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: 20,
  }}
>

  {/* LIVE RULE PREVIEW TITLE */}
  <div>
    <strong style={{ fontSize: 16 }}>Live Rule Preview</strong>
    <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12 }}>
      Run the engine across all vendors using the current rule definitions.
    </div>

    <button
      onClick={handleRunEngine}
      disabled={saving}
      style={{
        padding: "10px 16px",
        borderRadius: 12,
        border: "1px solid #10b981",
        background: saving
          ? "rgba(16,185,129,0.15)"
          : "linear-gradient(90deg,#10b981,#059669)",
        color: "white",
        fontWeight: 500,
        cursor: saving ? "not-allowed" : "pointer",
        marginBottom: 16,
      }}
    >
      {saving ? "Running..." : "Run engine now"}
    </button>

    {/* SIMPLE RULE PREVIEW LIST */}
    {activeGroup && rules.length > 0 ? (
      <div
        style={{
          borderTop: "1px solid rgba(51,65,85,0.6)",
          paddingTop: 12,
        }}
      >
        {rules.map((r, idx) => (
          <div
            key={r.id}
            style={{
              padding: "8px 0",
              borderBottom:
                idx === rules.length - 1
                  ? "none"
                  : "1px solid rgba(51,65,85,0.35)",
              fontSize: 13,
              color: "#cbd5f5",
            }}
          >
            IF{" "}
            <span style={{ color: "#93c5fd" }}>{r.field_key}</span>{" "}
            {operatorLabel(r.operator)}{" "}
            <span style={{ color: "#a5b4fc" }}>{r.expected_value}</span>{" "}
            →{" "}
            <span
              style={{
                color: SEVERITY_COLORS[r.severity] || "#f8c300",
              }}
            >
              {r.severity.toUpperCase()} ALERT
            </span>
          </div>
        ))}
      </div>
    ) : (
      <div
        style={{
          paddingTop: 12,
          borderTop: "1px solid rgba(51,65,85,0.6)",
          fontSize: 13,
          color: "#94a3b8",
        }}
      >
        Add rules to preview logic.
      </div>
    )}
  </div>

  {/* SAMPLE POLICY EVAL BLOCK */}
  <div
    style={{
      borderTop: "1px solid rgba(51,65,85,0.7)",
      paddingTop: 10,
      marginTop: "auto",
    }}
  >
    <div
      style={{
        fontSize: 12,
        textTransform: "uppercase",
        color: "#94a3b8",
        letterSpacing: 1.2,
        marginBottom: 6,
      }}
    >
      Sample policy evaluation
    </div>

    {/* JSON INPUT */}
    <textarea
      value={samplePolicyText}
      onChange={(e) => setSamplePolicyText(e.target.value)}
      rows={7}
      style={{
        width: "100%",
        borderRadius: 12,
        padding: 10,
        border: "1px solid rgba(51,65,85,0.6)",
        background: "rgba(15,23,42,0.85)",
        color: "#e2e8f0",
        fontFamily: "monospace",
        fontSize: 12,
        marginBottom: 10,
        resize: "vertical",
      }}
    />

    <button
      onClick={handleEvaluateSamplePolicy}
      disabled={!activeGroup || !rules.length}
      style={{
        padding: "10px 16px",
        width: "100%",
        borderRadius: 12,
        border: "1px solid #818cf8",
        background:
          !activeGroup || !rules.length
            ? "rgba(129,140,248,0.15)"
            : "linear-gradient(90deg,#6366f1,#4f46e5)",
        color: "white",
        fontSize: 13,
        cursor: !activeGroup || !rules.length ? "not-allowed" : "pointer",
      }}
    >
      Evaluate sample policy
    </button>
  </div>
</div>
