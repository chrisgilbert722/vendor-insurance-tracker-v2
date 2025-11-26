// pages/admin/requirements-v3.js
import { useEffect, useState, useMemo } from "react";
import { useRole } from "../../lib/useRole";
import { useOrg } from "../../context/OrgContext";
import ToastV2 from "../../components/ToastV2";

/**
 * REQUIREMENTS ENGINE V3 — Elite Cockpit Version
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
      const res = await fetch(
        `/api/requirements-v2/groups?orgId=${encodeURIComponent(orgId)}`
      );
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);

      setGroups(json.groups || []);
      if (json.groups?.length) {
        setActiveGroupId(json.groups[0].id);
        await loadRulesForGroup(json.groups[0].id);
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

  async function loadRulesForGroup(groupId) {
    if (!groupId) return setRules([]);
    try {
      const res = await fetch(
        `/api/requirements-v2/rules?groupId=${encodeURIComponent(groupId)}`
      );
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
    setSaving(true);

    try {
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
    setGroups((prev) =>
      prev.map((g) => (g.id === activeGroup.id ? updated : g))
    );

    setSaving(true);
    try {
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

  async function handleDeleteGroup(groupId) {
    if (!canEdit || !groupId) return;
    if (!window.confirm("Delete this group?")) return;

    setSaving(true);

    try {
      const res = await fetch(
        `/api/requirements-v2/groups?id=${encodeURIComponent(groupId)}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);

      setGroups((prev) => prev.filter((g) => g.id !== groupId));
      if (groups.length > 1) {
        const next = groups.find((g) => g.id !== groupId);
        setActiveGroupId(next.id);
        await loadRulesForGroup(next.id);
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
      setToast({ open: true, type: "success", message: "Rule created." });
    } catch (err) {
      setToast({ open: true, type: "error", message: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateRule(ruleId, patch) {
    if (!canEdit || !ruleId) return;

    const current = rules.find((r) => r.id === ruleId);
    const updated = { ...current, ...patch };

    setRules((prev) =>
      prev.map((r) => (r.id === ruleId ? updated : r))
    );

    setSaving(true);
    try {
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
    if (!canEdit || !ruleId) return;
    if (!window.confirm("Delete rule?")) return;

    setSaving(true);
    try {
      const res = await fetch(
        `/api/requirements-v2/rules?id=${encodeURIComponent(ruleId)}`,
        { method: "DELETE" }
      );
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

  async function handleRunEngine() {
    setSaving(true);
    try {
      const res = await fetch("/api/engine/run-v3", { method: "POST" });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);

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

    let parsed = {};
    try {
      parsed = JSON.parse(samplePolicyText || "{}");
    } catch {
      return setToast({
        open: true,
        type: "error",
        message: "Invalid sample policy JSON.",
      });
    }

    const results = {};
    for (const r of rules) {
      results[r.id] = evaluateRule(r, parsed);
    }

    setEvaluation({
      ok: true,
      error: "",
      results,
    });

    setToast({
      open: true,
      type: "success",
      message: "Sample evaluated.",
    });
  }
  return (
    <div
      style={{
        minHeight: "100vh",
        position: "relative",
        background:
          "radial-gradient(circle at 20% 10%, #020617 0%, #020617 40%, #000 100%)",
        padding: "40px 40px 50px",
        color: "#e5e7eb",
        overflow: "hidden",
      }}
    >
      {/* SCANLINES OVERLAY */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "100% 3px",
          opacity: 0.35,
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {/* HEADER */}
      <div style={{ marginBottom: 18, position: "relative", zIndex: 2 }}>
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
          <span
            style={{
              fontSize: 10,
              color: "#9ca3af",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
            }}
          >
            Requirements Engine V3
          </span>
          <span
            style={{
              fontSize: 10,
              color: "#38bdf8",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
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
          style={{
            marginTop: 6,
            maxWidth: 700,
            fontSize: 13,
            color: "#cbd5f5",
          }}
        >
          Every rule here is evaluated against vendor policies and updates the
          Alerts Cockpit in real time.
        </p>
      </div>

      {/* ERRORS */}
      {error && (
        <div
          style={{
            position: "relative",
            zIndex: 2,
            marginBottom: 12,
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

      {!canEdit && (
        <div
          style={{
            position: "relative",
            zIndex: 2,
            marginBottom: 14,
            padding: "8px 10px",
            borderRadius: 10,
            border: "1px solid rgba(148,163,184,0.6)",
            background: "rgba(15,23,42,0.9)",
            fontSize: 12,
            color: "#e5e7eb",
          }}
        >
          You are in read-only mode.
        </div>
      )}

      {/* GRID */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "grid",
          gridTemplateColumns: "260px minmax(0,1.7fr) minmax(0,1.3fr)",
          gap: 18,
        }}
      >
        {/* LEFT — GROUPS */}
        <div
          style={{
            position: "relative",
            borderRadius: 22,
            padding: 18,
            background:
              "linear-gradient(145deg, rgba(11,20,40,0.96), rgba(7,12,26,0.92))",
            border: "1px solid rgba(80,120,255,0.32)",
            boxShadow:
              "0 0 25px rgba(54,88,255,0.25), inset 0 0 20px rgba(20,40,90,0.45)",
            backdropFilter: "blur(8px)",
            overflow: "hidden",
          }}
        >
          {/* Floating Glow Bar */}
          <div
            style={{
              position: "absolute",
              top: -2,
              left: -2,
              right: -2,
              height: 2,
              background:
                "linear-gradient(90deg, transparent, #3b82f6, #8b5cf6, transparent)",
              opacity: 0.6,
              filter: "blur(1px)",
            }}
          />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 12,
                  textTransform: "uppercase",
                  color: "#9ca3af",
                  letterSpacing: 1.4,
                }}
              >
                Groups
              </div>
              <div style={{ fontSize: 12, color: "#e5e7eb", opacity: 0.75 }}>
                Organize related rule categories.
              </div>
            </div>

            <button
              onClick={handleCreateGroup}
              disabled={!canEdit || !orgId}
              style={{
                borderRadius: 12,
                padding: "8px 14px",
                border: "1px solid rgba(56,189,248,0.8)",
                background:
                  "linear-gradient(120deg, rgba(0,212,255,0.25), rgba(0,119,182,0.25))",
                color: "#e0f2fe",
                fontSize: 12,
                boxShadow: "0 0 12px rgba(56,189,248,0.45)",
                cursor:
                  !canEdit || !orgId ? "not-allowed" : "pointer",
                opacity: !canEdit || !orgId ? 0.5 : 1,
              }}
            >
              + New
            </button>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              maxHeight: 520,
              overflowY: "auto",
              paddingRight: 4,
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
                No groups yet.
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
                    borderRadius: 16,
                    padding: "10px 12px",
                    border:
                      activeGroupId === g.id
                        ? "1px solid rgba(59,130,246,0.9)"
                        : "1px solid rgba(51,65,85,0.6)",
                    background:
                      activeGroupId === g.id
                        ? "rgba(17,24,39,0.95)"
                        : "rgba(15,23,42,0.92)",
                    color: "#e5e7eb",
                    boxShadow:
                      activeGroupId === g.id
                        ? "0 0 12px rgba(59,130,246,0.55)"
                        : "none",
                    cursor: "pointer",
                    transition: "0.25s",
                  }}
                >
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      marginBottom: 2,
                    }}
                  >
                    {g.name}
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>
                    {g.description || "No description"} · {g.rule_count} rules
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* MIDDLE — RULES EDITOR */}
        <div
          style={{
            borderRadius: 22,
            padding: 18,
            background:
              "linear-gradient(135deg, rgba(12,22,45,0.97), rgba(6,12,28,0.95))",
            border: "1px solid rgba(90,120,255,0.32)",
            boxShadow:
              "0 0 30px rgba(64,106,255,0.22), inset 0 0 25px rgba(20,30,60,0.55)",
            backdropFilter: "blur(10px)",
            overflow: "hidden",
          }}
        >
          {activeGroup ? (
            <>
              {/* GROUP HEADER INPUTS */}
              <div style={{ display: "flex", gap: 14, marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <input
                    value={activeGroup.name || ""}
                    onChange={(e) =>
                      handleUpdateGroup({ name: e.target.value })
                    }
                    disabled={!canEdit}
                    style={{
                      width: "100%",
                      borderRadius: 14,
                      padding: "10px 14px",
                      background:
                        "linear-gradient(120deg, rgba(15,23,42,0.92), rgba(15,23,42,0.8))",
                      border: "1px solid rgba(51,65,85,0.85)",
                      color: "#e5e7eb",
                      fontSize: 14,
                      letterSpacing: 0.5,
                    }}
                  />

                  <textarea
                    value={activeGroup.description || ""}
                    onChange={(e) =>
                      handleUpdateGroup({ description: e.target.value })
                    }
                    disabled={!canEdit}
                    rows={3}
                    placeholder="Describe what this lane enforces…"
                    style={{
                      marginTop: 10,
                      width: "100%",
                      borderRadius: 14,
                      padding: "10px 14px",
                      background:
                        "linear-gradient(120deg, rgba(15,23,42,0.9), rgba(15,23,42,0.75))",
                      border: "1px solid rgba(51,65,85,0.8)",
                      color: "#e5e7eb",
                      fontSize: 13,
                      resize: "vertical",
                    }}
                  />
                </div>

                {/* RIGHT SETTINGS */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    width: 130,
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      gap: 6,
                      alignItems: "center",
                      fontSize: 12,
                      color: "#9ca3af",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={activeGroup.is_active ?? true}
                      onChange={(e) =>
                        handleUpdateGroup({ is_active: e.target.checked })
                      }
                      disabled={!canEdit}
                    />
                    Active
                  </label>

                  <button
                    disabled={!canEdit}
                    onClick={() => handleDeleteGroup(activeGroup.id)}
                    style={{
                      borderRadius: 12,
                      padding: "8px 10px",
                      border: "1px solid rgba(248,113,113,0.8)",
                      background:
                        "linear-gradient(120deg, rgba(255,76,76,0.35), rgba(91,6,6,0.3))",
                      color: "#fecaca",
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: !canEdit ? "not-allowed" : "pointer",
                      boxShadow: "0 0 12px rgba(255,40,40,0.3)",
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* RULES HEADER */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <div style={{ fontSize: 13, color: "#94a3b8" }}>
                  {rules.length} rules in this lane
                </div>

                <button
                  disabled={!canEdit}
                  onClick={handleCreateRule}
                  style={{
                    borderRadius: 999,
                    padding: "7px 14px",
                    border: "1px solid rgba(56,189,248,0.8)",
                    background:
                      "linear-gradient(120deg, rgba(8,47,73,0.9), rgba(15,23,42,1))",
                    color: "#e0f2fe",
                    fontSize: 12,
                    cursor: !canEdit ? "not-allowed" : "pointer",
                    boxShadow: "0 0 12px rgba(56,189,248,0.5)",
                  }}
                >
                  + New rule
                </button>
              </div>

              {/* RULE LIST */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {rules.length === 0 ? (
                  <div
                    style={{
                      padding: "10px 8px",
                      borderRadius: 12,
                      border: "1px dashed rgba(148,163,184,0.6)",
                      color: "#9ca3af",
                      fontSize: 12,
                    }}
                  >
                    No rules yet. Add one above.
                  </div>
                ) : (
                  rules.map((rule) => (
                    <RuleCard
                      key={rule.id}
                      rule={rule}
                      onUpdate={(patch) =>
                        handleUpdateRule(rule.id, { ...rule, ...patch })
                      }
                      onDelete={() => handleDeleteRule(rule.id)}
                      canEdit={canEdit}
                    />
                  ))
                )}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 13, color: "#9ca3af" }}>
              Select a group on the left to edit its rules.
            </div>
          )}
        </div>

        {/* RIGHT — PREVIEW + SAMPLE EVAL */}
        <div
          style={{
            borderRadius: 22,
            padding: 18,
            background:
              "linear-gradient(135deg, rgba(9,15,30,0.97), rgba(4,9,20,0.95))",
            border: "1px solid rgba(80,120,255,0.32)",
            boxShadow:
              "0 0 30px rgba(64,106,255,0.27), inset 0 0 25px rgba(10,20,45,0.5)",
            backdropFilter: "blur(10px)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              color: "#9ca3af",
              letterSpacing: 1.6,
              marginBottom: 6,
            }}
          >
            Live Rule Preview
          </div>

          {/* ENGINE RUN */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <div style={{ fontSize: 11, color: "#6b7280" }}>
              Preview and run engine against all vendors.
            </div>

            <button
              onClick={handleRunEngine}
              disabled={!canEdit || !orgId || saving}
              style={{
                borderRadius: 12,
                padding: "8px 14px",
                border: "1px solid rgba(0,212,255,0.6)",
                background:
                  "linear-gradient(120deg, rgba(0,212,255,0.3), rgba(5,90,120,0.3))",
                color: "#e0f2fe",
                fontSize: 12,
                boxShadow: "0 0 16px rgba(0,212,255,0.4)",
                cursor:
                  !canEdit || !orgId || saving
                    ? "not-allowed"
                    : "pointer",
                opacity: !canEdit || !orgId || saving ? 0.5 : 1,
              }}
            >
              Run engine now
            </button>
          </div>

          {/* RULE PREVIEW */}
          {activeGroup && rules.length ? (
            <div style={{ fontSize: 13, color: "#cbd5f5" }}>
              {rules.map((r, i) => {
                const sevColor =
                  SEVERITY_COLORS[r.severity] || SEVERITY_COLORS.medium;
                return (
                  <div
                    key={r.id}
                    style={{
                      padding: "7px 0",
                      borderBottom:
                        i === rules.length - 1
                          ? "none"
                          : "1px solid rgba(30,64,175,0.55)",
                    }}
                  >
                    <div>
                      IF{" "}
                      <code style={{ color: "#93c5fd" }}>{r.field_key}</code>{" "}
                      {operatorLabel(r.operator)}{" "}
                      <code style={{ color: "#a5b4fc" }}>
                        {r.expected_value}
                      </code>{" "}
                      THEN{" "}
                      <span style={{ color: sevColor }}>
                        {String(r.severity).toUpperCase()} ALERT
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: "#9ca3af" }}>
              Add rules for a live preview of logic.
            </div>
          )}

          {/* SAMPLE POLICY SECTION */}
          <div
            style={{
              marginTop: 12,
              paddingTop: 10,
              borderTop: "1px solid rgba(30,64,175,0.7)",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                color: "#9ca3af",
                letterSpacing: 1.5,
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
                padding: "8px 10px",
                border: "1px solid rgba(51,65,85,0.8)",
                background: "rgba(15,23,42,0.96)",
                color: "#e5e7eb",
                fontFamily: "monospace",
                fontSize: 12,
              }}
            />

            <button
              onClick={handleEvaluateSamplePolicy}
              disabled={!activeGroup || !rules.length}
              style={{
                borderRadius: 999,
                padding: "7px 14px",
                border: "1px solid rgba(129,140,248,0.9)",
                background:
                  "linear-gradient(120deg,rgba(30,64,175,1),rgba(15,23,42,1))",
                color: "#e0e7ff",
                cursor:
                  !activeGroup || !rules.length ? "not-allowed" : "pointer",
                opacity: !activeGroup || !rules.length ? 0.5 : 1,
                fontSize: 12,
                fontWeight: 500,
                boxShadow: "0 0 12px rgba(129,140,248,0.5)",
              }}
            >
              Evaluate sample policy
            </button>

            {/* SAMPLE RESULTS */}
            {evaluation.ok && (
              <div
                style={{
                  borderRadius: 12,
                  border: "1px solid rgba(30,64,175,0.5)",
                  background:
                    "radial-gradient(circle,rgba(15,23,42,0.98),rgba(15,23,42,0.96))",
                  padding: "8px 10px",
                  maxHeight: 200,
                  overflowY: "auto",
                }}
              >
                {rules.map((r) => {
                  const passed = evaluation.results[r.id];
                  const sevColor =
                    SEVERITY_COLORS[r.severity] ||
                    SEVERITY_COLORS.medium;

                  return (
                    <div
                      key={r.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 6,
                        paddingBottom: 6,
                        borderBottom:
                          "1px solid rgba(30,64,175,0.45)",
                      }}
                    >
                      <div>
                        <div style={{ color: "#e5e7eb", fontSize: 12 }}>
                          <code style={{ color: "#93c5fd" }}>
                            {r.field_key}
                          </code>{" "}
                          {operatorLabel(r.operator)}{" "}
                          <code style={{ color: "#a5b4fc" }}>
                            {r.expected_value}
                          </code>
                        </div>
                        {r.requirement_text && (
                          <div
                            style={{
                              fontSize: 11,
                              color: "#9ca3af",
                              marginTop: 2,
                            }}
                          >
                            {r.requirement_text}
                          </div>
                        )}
                      </div>

                      <div
                        style={{
                          borderRadius: 999,
                          padding: "3px 10px",
                          fontSize: 10,
                          border: passed
                            ? "1px solid #22c55e"
                            : "1px solid #ef4444",
                          color: passed ? "#22c55e" : "#ef4444",
                          background: passed
                            ? "rgba(34,197,94,0.15)"
                            : "rgba(239,68,68,0.15)",
                          textTransform: "uppercase",
                          letterSpacing: 1,
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

      {/* SAVING TAG */}
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
/* =======================================================
   RULECARD — ELITE TACTICAL HOLOGRAM EDITION (FULL)
   ======================================================= */

function RuleCard({ rule, onUpdate, onDelete, canEdit }) {
  const sevColor =
    SEVERITY_COLORS[rule.severity] || SEVERITY_COLORS.medium;

  return (
    <div
      className="tactical-card"
      style={{
        position: "relative",
        borderRadius: 18,
        padding: 16,
        background:
          "linear-gradient(145deg, rgba(10,15,30,0.92), rgba(5,10,22,0.88))",
        border: "1px solid rgba(80,120,255,0.35)",
        boxShadow:
          "0 0 22px rgba(30,64,175,0.35), inset 0 0 20px rgba(8,16,32,0.55)",
        backdropFilter: "blur(8px)",
        transition: "0.25s ease",
        overflow: "hidden",
      }}
    >
      {/* OUTER HOLOGRAM EDGE */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 18,
          boxShadow: "0 0 14px rgba(80,120,255,0.45)",
          opacity: 0.45,
          pointerEvents: "none",
        }}
      />

      {/* HOVER WASH */}
      <div
        className="tactical-hover"
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 18,
          background:
            "linear-gradient(120deg, rgba(80,120,255,0.14), rgba(120,60,255,0.12))",
          opacity: 0,
          transition: "opacity 0.3s ease",
          pointerEvents: "none",
        }}
      />

      <style>{`
        .tactical-card:hover .tactical-hover {
          opacity: 1 !important;
        }
      `}</style>

      {/* FIELD + OPERATOR */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <select
          value={rule.field_key || ""}
          onChange={(e) => onUpdate({ field_key: e.target.value })}
          disabled={!canEdit}
          style={{
            flex: 1,
            borderRadius: 12,
            padding: "8px 10px",
            border: "1px solid rgba(51,65,85,0.8)",
            background:
              "linear-gradient(120deg, rgba(17,25,45,0.92), rgba(15,23,42,0.88))",
            color: "#e5e7eb",
            fontSize: 13,
          }}
        >
          {FIELD_OPTIONS.map((f) => (
            <option key={f.key} value={f.key}>
              {f.label}
            </option>
          ))}
        </select>

        <select
          value={rule.operator || "equals"}
          onChange={(e) => onUpdate({ operator: e.target.value })}
          disabled={!canEdit}
          style={{
            width: 160,
            borderRadius: 12,
            padding: "8px 10px",
            border: "1px solid rgba(51,65,85,0.8)",
            background:
              "linear-gradient(120deg, rgba(17,25,45,0.92), rgba(15,23,42,0.88))",
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

      {/* VALUE + SEVERITY */}
      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        <input
          value={rule.expected_value || ""}
          onChange={(e) => onUpdate({ expected_value: e.target.value })}
          disabled={!canEdit}
          placeholder="Expected value"
          style={{
            flex: 1,
            borderRadius: 12,
            padding: "8px 10px",
            border: "1px solid rgba(51,65,85,0.8)",
            background:
              "linear-gradient(120deg, rgba(17,25,45,0.92), rgba(15,23,42,0.88))",
            color: "#e5e7eb",
            fontSize: 13,
          }}
        />

        <select
          value={rule.severity || "medium"}
          onChange={(e) => onUpdate({ severity: e.target.value })}
          disabled={!canEdit}
          style={{
            width: 140,
            borderRadius: 12,
            padding: "8px 10px",
            border: `1px solid ${sevColor}`,
            background:
              "linear-gradient(120deg, rgba(17,25,45,0.95), rgba(15,23,42,0.92))",
            color: sevColor,
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: 0.4,
            textTransform: "capitalize",
          }}
        >
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* PLAIN LANGUAGE REQUIREMENT */}
      <input
        value={rule.requirement_text || ""}
        onChange={(e) => onUpdate({ requirement_text: e.target.value })}
        disabled={!canEdit}
        placeholder="Plain language requirement…"
        style={{
          width: "100%",
          borderRadius: 12,
          padding: "8px 10px",
          border: "1px solid rgba(51,65,85,0.8)",
          background:
            "linear-gradient(120deg, rgba(17,25,45,0.92), rgba(15,23,42,0.88))",
          color: "#e5e7eb",
          fontSize: 13,
          marginBottom: 6,
        }}
      />

      {/* INTERNAL NOTE */}
      <input
        value={rule.internal_note || ""}
        onChange={(e) => onUpdate({ internal_note: e.target.value })}
        disabled={!canEdit}
        placeholder="Internal note (optional)"
        style={{
          width: "100%",
          borderRadius: 12,
          padding: "8px 10px",
          border: "1px solid rgba(51,65,85,0.8)",
          background:
            "linear-gradient(120deg, rgba(17,25,45,0.92), rgba(15,23,42,0.88))",
          color: "#94a3b8",
          fontSize: 13,
          marginBottom: 12,
        }}
      />

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
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            color: "#9ca3af",
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
          disabled={!canEdit}
          onClick={onDelete}
          style={{
            borderRadius: 12,
            padding: "6px 12px",
            border: "1px solid rgba(248,113,113,0.8)",
            background:
              "linear-gradient(120deg, rgba(255,76,76,0.35), rgba(91,6,6,0.3))",
            color: "#fecaca",
            fontSize: 12,
            fontWeight: 600,
            cursor: canEdit ? "pointer" : "not-allowed",
            boxShadow: "0 0 10px rgba(255,50,50,0.3)",
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

/* =======================================================
   OPERATOR LABEL HELPERS
   ======================================================= */
function operatorLabel(op) {
  const found = OPERATOR_OPTIONS.find((o) => o.key === op);
  return found ? found.label : op;
}

/* =======================================================
   LOCAL POLICY EVALUATION ENGINE (for preview)
   ======================================================= */
function evaluateRule(rule, policyObj) {
  if (!rule || rule.is_active === false) return false;

  const rawVal = policyObj[rule.field_key];
  const expected = rule.expected_value;
  const op = rule.operator || "equals";

  if (rawVal === undefined || rawVal === null) return false;

  const normalizeNum = (v) => {
    if (typeof v === "number") return v;
    if (typeof v === "string") {
      const clean = v.replace(/[^0-9.\-]/g, "");
      const parsed = parseFloat(clean);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  };

  switch (op) {
    case "equals":
      return String(rawVal) === String(expected);
    case "not_equals":
      return String(rawVal) !== String(expected);
    case "contains":
      return String(rawVal)
        .toLowerCase()
        .includes(String(expected).toLowerCase());
    case "gte": {
      const a = normalizeNum(rawVal);
      const b = normalizeNum(expected);
      return a !== null && b !== null && a >= b;
    }
    case "lte": {
      const a = normalizeNum(rawVal);
      const b = normalizeNum(expected);
      return a !== null && b !== null && a <= b;
    }
    default:
      return false;
  }
}
