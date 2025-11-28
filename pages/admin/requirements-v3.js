// pages/admin/requirements-v3.js
// --------------------------------
// SECTION 1 — IMPORTS + STATE + LOGIC
// --------------------------------

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

      if (list.length > 0) {
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

  // --------------------------
  // LOAD RULES
  // --------------------------
  async function loadRulesForGroup(groupId) {
    if (!groupId) {
      setRules([]);
      setEvaluation({ ok: false, error: "", results: {} });
      return;
    }

    try {
      const res = await fetch(`/api/requirements-v2/rules?groupId=${groupId}`);
      const json = await res.json();

      if (!json.ok) throw new Error(json.error || "Failed to load rules");

      setRules(json.rules || []);
      setEvaluation({ ok: false, error: "", results: {} });
    } catch (err) {
      setError(err.message || "Failed to load rules.");
    }
  }

  // --------------------------
  // GROUP CRUD
  // --------------------------
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
      if (!json.ok) throw new Error(json.error || "Group creation failed");

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
      if (!json.ok) throw new Error(json.error || "Group update failed");

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
      if (!json.ok) throw new Error(json.error || "Delete failed");

      const remaining = groups.filter((g) => g.id !== id);
      setGroups(remaining);

      if (remaining.length > 0) {
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

  // --------------------------
  // RULE CRUD
  // --------------------------
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
      if (!json.ok) throw new Error(json.error || "Failed to create rule");

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
      if (!json.ok) throw new Error(json.error || "Failed to update rule");

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
      if (!json.ok) throw new Error(json.error || "Failed to delete rule");

      setRules((prev) => prev.filter((r) => r.id !== ruleId));
      setToast({ open: true, type: "success", message: "Rule deleted." });
    } catch (err) {
      setToast({ open: true, type: "error", message: err.message });
    } finally {
      setSaving(false);
    }
  }

  // --------------------------
  // ENGINE + SAMPLE EVAL
  // --------------------------
  async function handleRunEngine() {
    try {
      setSaving(true);
      const res = await fetch("/api/engine/run-v3", { method: "POST" });
      const json = await res.json();

      if (!json.ok) throw new Error(json.error || "Engine run failed");

      setToast({
        open: true,
        type: "success",
        message: json.message || "Engine run complete.",
      });
    } catch (err) {
      setToast({
        open: true,
        type: "error",
        message: err.message || "Engine failed.",
      });
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
    setToast({
      open: true,
      type: "success",
      message: "Sample evaluated.",
    });
  }
  // -----------------------------------
  // SECTION 2 — FULL COCKPIT RENDER
  // -----------------------------------
  return (
    <div
      style={{
        minHeight: "100vh",
        color: "#e5e7eb",
        padding: 40,
        background: "radial-gradient(circle at top, #020617 0, #000 55%)",
      }}
    >
      {/* HEADER */}
      <h1 style={{ fontSize: 26, marginBottom: 8 }}>
        Define{" "}
        <span style={{ color: "#38bdf8" }}>coverage rules</span>{" "}
        that power alerts automatically.
      </h1>
      <p style={{ fontSize: 13, opacity: 0.8, marginBottom: 16 }}>
        Every rule here is evaluated against vendor policies and feeds the Alerts Cockpit.
      </p>

      {/* ERROR BANNER */}
      {error && (
        <div
          style={{
            background: "rgba(127,29,29,0.95)",
            padding: 10,
            borderRadius: 8,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {/* 3 COLUMN LAYOUT */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "260px minmax(0,1.7fr) minmax(0,1.3fr)",
          gap: 24,
          alignItems: "flex-start",
        }}
      >
        {/* ============================
            LEFT COLUMN — GROUPS
        ============================ */}
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
            Groups
          </div>

          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 10 }}>
            Org: {orgId || "none"} <br />
            Groups: {groups.length} <br />
            Active: {activeGroup ? activeGroup.name : "none"}
          </div>

          <button
            onClick={handleCreateGroup}
            disabled={!canEdit}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: "1px solid #38bdf8",
              background: "rgba(56,189,248,0.15)",
              color: "#38bdf8",
              cursor: canEdit ? "pointer" : "not-allowed",
              marginBottom: 12,
              width: "100%",
            }}
          >
            + New Group
          </button>

          {/* GROUP LIST */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              padding: 8,
              borderRadius: 8,
              border: "1px solid rgba(148,163,184,0.4)",
              background: "rgba(15,23,42,0.7)",
            }}
          >
            {loading ? (
              <div style={{ fontSize: 13, opacity: 0.7 }}>Loading groups…</div>
            ) : groups.length === 0 ? (
              <div style={{ fontSize: 13, opacity: 0.7 }}>No groups yet.</div>
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
                    padding: "8px 10px",
                    borderRadius: 6,
                    border:
                      activeGroupId === g.id
                        ? "1px solid #38bdf8"
                        : "1px solid rgba(148,163,184,0.4)",
                    background:
                      activeGroupId === g.id
                        ? "rgba(56,189,248,0.18)"
                        : "rgba(15,23,42,0.9)",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{g.name}</div>
                  <div style={{ fontSize: 11, opacity: 0.7 }}>
                    {g.description || "No description"}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* ACTIVE GROUP EDITOR */}
          {activeGroup && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                Edit Group
              </div>
              <input
                value={activeGroup.name || ""}
                onChange={(e) => handleUpdateGroup({ name: e.target.value })}
                disabled={!canEdit}
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  borderRadius: 6,
                  marginBottom: 8,
                  background: "#020617",
                  border: "1px solid rgba(148,163,184,0.4)",
                  color: "#e5e7eb",
                  fontSize: 13,
                }}
              />
              <textarea
                value={activeGroup.description || ""}
                onChange={(e) =>
                  handleUpdateGroup({ description: e.target.value })
                }
                disabled={!canEdit}
                rows={3}
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  borderRadius: 6,
                  marginBottom: 8,
                  background: "#020617",
                  border: "1px solid rgba(148,163,184,0.4)",
                  color: "#e5e7eb",
                  fontSize: 13,
                  resize: "vertical",
                }}
              />
              <button
                onClick={() => handleDeleteGroup(activeGroupId)}
                disabled={!canEdit}
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: "1px solid #ef4444",
                  background: "rgba(239,68,68,0.15)",
                  color: "#ef4444",
                  cursor: canEdit ? "pointer" : "not-allowed",
                }}
              >
                Delete Group
              </button>
            </div>
          )}
        </div>

        {/* ============================
            MIDDLE COLUMN — RULES
        ============================ */}
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
            Rules
          </div>

          {!activeGroup && (
            <div style={{ fontSize: 13, opacity: 0.7 }}>
              Select a group to view and edit its rules.
            </div>
          )}

          {activeGroup && (
            <>
              <button
                onClick={handleCreateRule}
                disabled={!canEdit}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: "1px solid #38bdf8",
                  background: "rgba(56,189,248,0.15)",
                  color: "#38bdf8",
                  cursor: canEdit ? "pointer" : "not-allowed",
                  marginBottom: 12,
                }}
              >
                + New Rule
              </button>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                {rules.length === 0 ? (
                  <div style={{ fontSize: 13, opacity: 0.7 }}>
                    No rules found for this group.
                  </div>
                ) : (
                  rules.map((rule) => (
                    <RuleCard
                      key={rule.id}
                      rule={rule}
                      onUpdate={(patch) => handleUpdateRule(rule.id, patch)}
                      onDelete={() => handleDeleteRule(rule.id)}
                      canEdit={canEdit}
                    />
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* ============================
            RIGHT COLUMN — PREVIEW + SAMPLE
        ============================ */}
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
            Live Rule Preview
          </div>

          <button
            onClick={handleRunEngine}
            disabled={saving}
            style={{
              padding: "8px 14px",
              borderRadius: 6,
              border: "1px solid #38bdf8",
              background: "rgba(56,189,248,0.15)",
              color: "#38bdf8",
              cursor: saving ? "not-allowed" : "pointer",
              marginBottom: 16,
            }}
          >
            Run engine now
          </button>

          {/* Rule IF-preview */}
          {activeGroup && rules.length > 0 ? (
            <div
              style={{
                padding: 10,
                borderRadius: 8,
                border: "1px solid rgba(148,163,184,0.4)",
                background: "rgba(15,23,42,0.9)",
                fontSize: 13,
                marginBottom: 24,
              }}
            >
              {rules.map((r) => {
                const sevColor =
                  SEVERITY_COLORS[r.severity] || SEVERITY_COLORS.medium;
                return (
                  <div
                    key={r.id}
                    style={{
                      paddingBottom: 8,
                      marginBottom: 8,
                      borderBottom: "1px solid rgba(148,163,184,0.2)",
                    }}
                  >
                    IF{" "}
                    <code style={{ color: "#93c5fd" }}>{r.field_key}</code>{" "}
                    {operatorLabel(r.operator)}{" "}
                    <code style={{ color: "#c7d2fe" }}>{r.expected_value}</code>{" "}
                    THEN{" "}
                    <span style={{ color: sevColor }}>
                      {String(r.severity || "medium").toUpperCase()}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 24 }}>
              Add rules to see a preview.
            </div>
          )}

          {/* SAMPLE POLICY EVAL */}
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
              Sample policy evaluation
            </div>
            <textarea
              value={samplePolicyText}
              onChange={(e) => setSamplePolicyText(e.target.value)}
              rows={8}
              style={{
                width: "100%",
                borderRadius: 8,
                padding: 10,
                background: "#020617",
                border: "1px solid rgba(148,163,184,0.4)",
                color: "#e5e7eb",
                fontFamily: "monospace",
                marginBottom: 10,
              }}
            />
            <button
              onClick={handleEvaluateSamplePolicy}
              disabled={!activeGroup || rules.length === 0}
              style={{
                padding: "7px 12px",
                borderRadius: 6,
                border: "1px solid #818cf8",
                background: "rgba(129,140,248,0.15)",
                color: "#818cf8",
                cursor:
                  !activeGroup || rules.length === 0
                    ? "not-allowed"
                    : "pointer",
                marginBottom: 12,
              }}
            >
              Evaluate sample policy
            </button>

            {evaluation.ok && (
              <div
                style={{
                  borderRadius: 8,
                  border: "1px solid rgba(148,163,184,0.4)",
                  background: "rgba(15,23,42,0.95)",
                  padding: 10,
                  fontSize: 13,
                }}
              >
                {rules.map((r) => {
                  const passed = evaluation.results[r.id];
                  return (
                    <div
                      key={r.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        paddingBottom: 8,
                        marginBottom: 8,
                        borderBottom: "1px solid rgba(148,163,184,0.2)",
                      }}
                    >
                      <div>
                        <code style={{ color: "#93c5fd" }}>{r.field_key}</code>{" "}
                        {operatorLabel(r.operator)}{" "}
                        <code style={{ color: "#c7d2fe" }}>
                          {r.expected_value}
                        </code>
                      </div>
                      <div
                        style={{
                          padding: "2px 8px",
                          borderRadius: 999,
                          border: passed
                            ? "1px solid #22c55e"
                            : "1px solid #ef4444",
                          background: passed
                            ? "rgba(34,197,94,0.15)"
                            : "rgba(239,68,68,0.15)",
                          color: passed ? "#22c55e" : "#ef4444",
                          fontSize: 11,
                          textTransform: "uppercase",
                        }}
                      >
                        {passed ? "Pass" : "Fail"}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

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
    </div>
  );
}
// -----------------------------------
// SECTION 3 — RULECARD COMPONENT
// -----------------------------------

function RuleCard({ rule, onUpdate, onDelete, canEdit }) {
  const sevColor =
    SEVERITY_COLORS[rule.severity] || SEVERITY_COLORS.medium;

  return (
    <div
      style={{
        borderRadius: 10,
        border: "1px solid rgba(148,163,184,0.4)",
        background: "rgba(15,23,42,0.9)",
        padding: 10,
      }}
    >
      {/* FIELD + OP */}
      <div style={{ marginBottom: 6 }}>
        <div style={{ fontSize: 11, opacity: 0.7 }}>Field</div>
        <input
          value={rule.field_key || ""}
          onChange={(e) => onUpdate({ field_key: e.target.value })}
          disabled={!canEdit}
          style={{
            width: "100%",
            padding: "6px 8px",
            borderRadius: 6,
            border: "1px solid rgba(148,163,184,0.4)",
            background: "#020617",
            color: "#e5e7eb",
            fontSize: 13,
          }}
        />
      </div>

      <div style={{ marginBottom: 6 }}>
        <div style={{ fontSize: 11, opacity: 0.7 }}>Operator</div>
        <select
          value={rule.operator || "equals"}
          onChange={(e) => onUpdate({ operator: e.target.value })}
          disabled={!canEdit}
          style={{
            width: "100%",
            padding: "6px 8px",
            borderRadius: 6,
            border: "1px solid rgba(148,163,184,0.4)",
            background: "#020617",
            color: "#e5e7eb",
            fontSize: 13,
          }}
        >
          {OPERATOR_OPTIONS.map((op) => (
            <option key={op.key} value={op.key}>
              {op.label}
            </option>
          ))}
        </select>
      </div>

      {/* EXPECTED + SEVERITY */}
      <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, opacity: 0.7 }}>Expected</div>
          <input
            value={rule.expected_value || ""}
            onChange={(e) => onUpdate({ expected_value: e.target.value })}
            disabled={!canEdit}
            style={{
              width: "100%",
              padding: "6px 8px",
              borderRadius: 6,
              border: "1px solid rgba(148,163,184,0.4)",
              background: "#020617",
              color: "#e5e7eb",
              fontSize: 13,
            }}
          />
        </div>
        <div style={{ width: 140 }}>
          <div style={{ fontSize: 11, opacity: 0.7 }}>Severity</div>
          <select
            value={rule.severity || "medium"}
            onChange={(e) => onUpdate({ severity: e.target.value })}
            disabled={!canEdit}
            style={{
              width: "100%",
              padding: "6px 8px",
              borderRadius: 6,
              border: "1px solid rgba(148,163,184,0.4)",
              background: "#020617",
              color: sevColor,
              fontSize: 13,
            }}
          >
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* FOOTER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 6,
          alignItems: "center",
        }}
      >
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            opacity: 0.8,
          }}
        >
          <input
            type="checkbox"
            checked={rule.is_active ?? true}
            onChange={(e) => onUpdate({ is_active: e.target.checked })}
            disabled={!canEdit}
          />
          Active
        </label>

        <button
          onClick={onDelete}
          disabled={!canEdit}
          style={{
            padding: "4px 10px",
            borderRadius: 999,
            border: "1px solid #ef4444",
            background: "rgba(239,68,68,0.15)",
            color: "#fecaca",
            fontSize: 12,
            cursor: canEdit ? "pointer" : "not-allowed",
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

// -----------------------------------
// SECTION 4 — HELPERS
// -----------------------------------

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
      return String(rawVal)
        .toLowerCase()
        .includes(String(expected).toLowerCase());
    case "gte":
      return Number(rawVal) >= Number(expected);
    case "lte":
      return Number(rawVal) <= Number(expected);
    default:
      return false;
  }
}
