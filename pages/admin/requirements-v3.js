// pages/admin/requirements-v3.js
import { useEffect, useState, useMemo } from "react";
import { useRole } from "../../lib/useRole";
import { useOrg } from "../../context/OrgContext";
import ToastV2 from "../../components/ToastV2";

/**
 * REQUIREMENTS ENGINE V3 — Elite Cockpit UI + DB rules + local evaluation
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
    results: {}, // ruleId -> boolean
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setEvaluation({ ok: false, error: "", results: {} });
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
      setEvaluation({ ok: false, error: "", results: {} });
    } catch (err) {
      console.error("loadRulesForGroup error:", err);
      setError(err.message || "Failed to load rules for this group.");
    }
  }
  async function handleCreateGroup() {
    if (!canEdit || !orgId) return;
    const name = prompt("New group name (e.g. 'Coverage Limits')");
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
      if (!json.ok) throw new Error(json.error || "Failed to create group");

      const newGroup = json.group;
      setGroups((prev) => [newGroup, ...prev]);
      setActiveGroupId(newGroup.id);
      setRules([]);

      setToast({
        open: true,
        type: "success",
        message: "Group created.",
      });
    } catch (err) {
      console.error("handleCreateGroup error:", err);
      setToast({
        open: true,
        type: "error",
        message: err.message || "Failed to create group.",
      });
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
    setError("");
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
      if (!json.ok) throw new Error(json.error || "Failed to update group");

      setToast({
        open: true,
        type: "success",
        message: "Group updated.",
      });
    } catch (err) {
      console.error("handleUpdateGroup error:", err);
      setToast({
        open: true,
        type: "error",
        message: err.message || "Failed to update group.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteGroup(groupId) {
    if (!canEdit || !groupId) return;
    if (!window.confirm("Delete this group and all its rules?")) return;

    setSaving(true);
    setError("");
    try {
      const res = await fetch(
        `/api/requirements-v2/groups?id=${encodeURIComponent(groupId)}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed to delete group");

      const remaining = groups.filter((g) => g.id !== groupId);
      setGroups(remaining);

      if (remaining.length) {
        setActiveGroupId(remaining[0].id);
        await loadRulesForGroup(remaining[0].id);
      } else {
        setActiveGroupId(null);
        setRules([]);
      }

      setToast({
        open: true,
        type: "success",
        message: "Group deleted.",
      });
    } catch (err) {
      console.error("handleDeleteGroup error:", err);
      setToast({
        open: true,
        type: "error",
        message: err.message || "Failed to delete group.",
      });
    } finally {
      setSaving(false);
    }
  }
  async function handleCreateRule() {
    if (!canEdit || !activeGroup) return;

    const field_key = prompt(
      "Field key (e.g. policy.glEachOccurrence, policy.coverage_type)"
    );
    if (!field_key) return;

    const expected_value = prompt(
      "Expected value (e.g. 1000000 or 'General Liability')"
    );
    if (!expected_value) return;

    setSaving(true);
    setError("");
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
      if (!json.ok) throw new Error(json.error || "Failed to create rule");

      setRules((prev) => [...prev, json.rule]);
      setToast({
        open: true,
        type: "success",
        message: "Rule created.",
      });
    } catch (err) {
      console.error("handleCreateRule error:", err);
      setToast({
        open: true,
        type: "error",
        message: err.message || "Failed to create rule.",
      });
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
    setError("");
    try {
      const res = await fetch("/api/requirements-v2/rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed to update rule");

      setToast({
        open: true,
        type: "success",
        message: "Rule updated.",
      });
    } catch (err) {
      console.error("handleUpdateRule error:", err);
      setToast({
        open: true,
        type: "error",
        message: err.message || "Failed to update rule.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteRule(ruleId) {
    if (!canEdit || !ruleId) return;
    if (!window.confirm("Delete this rule?")) return;

    setSaving(true);
    setError("");
    try {
      const res = await fetch(
        `/api/requirements-v2/rules?id=${encodeURIComponent(ruleId)}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed to delete rule");

      setRules((prev) => prev.filter((r) => r.id !== ruleId));
      setToast({
        open: true,
        type: "success",
        message: "Rule deleted.",
      });
    } catch (err) {
      console.error("handleDeleteRule error:", err);
      setToast({
        open: true,
        type: "error",
        message: err.message || "Failed to delete rule.",
      });
    } finally {
      setSaving(false);
    }
  }
  async function handleRunEngine() {
    try {
      setSaving(true);
      const res = await fetch("/api/engine/run-v3", { method: "POST" });
      const json = await res.json();

      if (!json.ok) {
        throw new Error(json.error || "Engine run failed.");
      }

      setToast({
        open: true,
        type: "success",
        message: json.message || "Engine run completed.",
      });
    } catch (err) {
      console.error("handleRunEngine error:", err);
      setToast({
        open: true,
        type: "error",
        message: err.message || "Failed to run engine.",
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
    } catch (err) {
      setEvaluation({
        ok: false,
        error: "Invalid JSON in sample policy.",
        results: {},
      });
      setToast({
        open: true,
        type: "error",
        message: "Sample policy JSON is invalid.",
      });
      return;
    }

    if (!rules.length) {
      setEvaluation({
        ok: false,
        error: "No rules in this group to evaluate.",
        results: {},
      });
      return;
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
      message: "Sample policy evaluated.",
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
            "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "100% 3px",
          mixBlendMode: "soft-light",
          opacity: 0.3,
          pointerEvents: "none",
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
              letterSpacing: "0.15em",
            }}
          >
            Requirements Engine V3
          </span>
          <span
            style={{
              fontSize: 10,
              color: "#38bdf8",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
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
            maxWidth: 680,
            fontSize: 13,
            color: "#cbd5f5",
          }}
        >
          Each rule here is stored in your requirements engine and evaluated
          against vendor policies to fire alerts in the cockpit.
        </p>
      </div>
      {error && (
        <div
          style={{
            position: "relative",
            zIndex: 2,
            marginBottom: 12,
            padding: "8px 10px",
            borderRadius: 10,
            border: "1px solid rgba(248,113,113,0.9)",
            background: "rgba(127,29,29,0.95)",
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
          You are in read-only mode. Only admins and managers can edit
          requirements.
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
                  letterSpacing: 1.5,
                }}
              >
                Groups
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "#e5e7eb",
                  opacity: 0.75,
                }}
              >
                Related rule categories.
              </div>
            </div>

            <button
              disabled={!canEdit || !orgId}
              onClick={handleCreateGroup}
              style={{
                borderRadius: 12,
                padding: "8px 14px",
                border: "1px solid rgba(56,189,248,0.8)",
                background:
                  "linear-gradient(120deg, rgba(0,212,255,0.25), rgba(0,119,182,0.25))",
                color: "#e0f2fe",
                fontSize: 12,
                fontWeight: 500,
                boxShadow: "0 0 12px rgba(56,189,248,0.4)",
                cursor: !canEdit || !orgId ? "not-allowed" : "pointer",
                opacity: !canEdit || !orgId ? 0.6 : 1,
                transition: "0.2s",
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
                        ? "0 0 12px rgba(59,130,246,0.6)"
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
                      letterSpacing: 0.25,
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

        {/* MIDDLE — RULES */}
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
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 3,
              background:
                "linear-gradient(90deg, transparent, #60a5fa, #a78bfa, transparent)",
              opacity: 0.6,
              filter: "blur(1px)",
            }}
          />

          {activeGroup ? (
            <>
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
                        "linear-gradient(120deg, rgba(15,23,42,0.92), rgba(15,23,42,0.7))",
                      border: "1px solid rgba(51,65,85,0.9)",
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
                    placeholder="Describe what this lane enforces..."
                    style={{
                      marginTop: 10,
                      width: "100%",
                      borderRadius: 14,
                      padding: "10px 14px",
                      background:
                        "linear-gradient(120deg, rgba(15,23,42,0.88), rgba(15,23,42,0.7))",
                      border: "1px solid rgba(51,65,85,0.9)",
                      color: "#e5e7eb",
                      fontSize: 13,
                      resize: "vertical",
                    }}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    width: 120,
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
                      border: "1px solid rgba(248,113,113,0.7)",
                      background:
                        "linear-gradient(120deg, rgba(255,76,76,0.4), rgba(91,6,6,0.35))",
                      color: "#fecaca",
                      fontSize: 12,
                      letterSpacing: 0.4,
                      cursor: !canEdit ? "not-allowed" : "pointer",
                      boxShadow: "0 0 12px rgba(255,40,40,0.3)",
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <div style={{ fontSize: 13, color: "#94a3b8" }}>
                  {rules.length} rules in this lane.
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

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {rules.length === 0 ? (
                  <div
                    style={{
                      padding: "10px 8px",
                      borderRadius: 12,
                      border: "1px dashed rgba(148,163,184,0.6)",
                      fontSize: 12,
                      color: "#9ca3af",
                    }}
                  >
                    No rules yet. Add a rule such as “GL per occurrence ≥
                    1,000,000” or “Coverage type must be ‘General Liability’”.
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

        {/* RIGHT — PREVIEW / EVAL */}
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
              marginBottom: 8,
            }}
          >
            Live rule preview
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <div style={{ fontSize: 11, color: "#6b7280" }}>
              Preview behavior and run engine.
            </div>

            <button
              onClick={handleRunEngine}
              disabled={!canEdit || !orgId || saving}
              style={{
                borderRadius: 14,
                padding: "8px 14px",
                border: "1px solid rgba(0,212,255,0.6)",
                background:
                  "linear-gradient(120deg, rgba(0,212,255,0.3), rgba(5,90,120,0.3))",
                color: "#e0f2fe",
                fontSize: 12,
                fontWeight: 500,
                boxShadow: "0 0 16px rgba(0,212,255,0.4)",
                cursor:
                  !canEdit || !orgId || saving
                    ? "not-allowed"
                    : "pointer",
                opacity: !canEdit || !orgId || saving ? 0.6 : 1,
              }}
            >
              Run engine now
            </button>
          </div>
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
                          : "1px solid rgba(30,64,175,0.7)",
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
                        {String(r.severity || "medium").toUpperCase()} ALERT
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: "#9ca3af" }}>
              Add rules to see a live preview.
            </div>
          )}

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
                letterSpacing: 1.4,
                color: "#9ca3af",
              }}
            >
              Sample policy evaluation (local)
            </div>
            <textarea
              value={samplePolicyText}
              onChange={(e) => setSamplePolicyText(e.target.value)}
              rows={7}
              style={{
                width: "100%",
                borderRadius: 12,
                padding: "8px 10px",
                border: "1px solid rgba(51,65,85,0.9)",
                background: "rgba(15,23,42,0.96)",
                color: "#e5e7eb",
                fontSize: 12,
                fontFamily:
                  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                resize: "vertical",
              }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div style={{ fontSize: 11, color: "#6b7280" }}>
                Only rules in the active lane are evaluated here.
              </div>
              <button
                onClick={handleEvaluateSamplePolicy}
                disabled={!activeGroup || !rules.length}
                style={{
                  borderRadius: 999,
                  padding: "6px 11px",
                  border: "1px solid rgba(129,140,248,0.9)",
                  background:
                    "linear-gradient(120deg,rgba(30,64,175,1),rgba(15,23,42,1))",
                  color: "#e0e7ff",
                  fontSize: 11,
                  fontWeight: 500,
                  cursor:
                    !activeGroup || !rules.length
                      ? "not-allowed"
                      : "pointer",
                  opacity: !activeGroup || !rules.length ? 0.6 : 1,
                }}
              >
                Evaluate sample policy
              </button>
            </div>

            {evaluation.error && (
              <div
                style={{
                  padding: "6px 8px",
                  borderRadius: 10,
                  border: "1px solid rgba(248,113,113,0.8)",
                  background: "rgba(127,29,29,0.9)",
                  color: "#fecaca",
                  fontSize: 12,
                }}
              >
                {evaluation.error}
              </div>
            )}

            {evaluation.ok && activeGroup && rules.length > 0 && (
              <div
                style={{
                  marginTop: 4,
                  borderRadius: 12,
                  border: "1px solid rgba(30,64,175,0.8)",
                  background:
                    "radial-gradient(circle at top,rgba(15,23,42,0.98),rgba(15,23,42,0.96))",
                  padding: "8px 9px",
                  maxHeight: 220,
                  overflowY: "auto",
                }}
              >
                {rules.map((r) => {
                  const sevColor =
                    SEVERITY_COLORS[r.severity] || SEVERITY_COLORS.medium;
                  const passed = evaluation.results[r.id] === true;
                  return (
                    <div
                      key={r.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "6px 0",
                        borderBottom:
                          "1px solid rgba(30,64,175,0.6)",
                        gap: 8,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 12,
                            color: "#e5e7eb",
                            marginBottom: 2,
                          }}
                        >
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
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {r.requirement_text}
                          </div>
                        )}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-end",
                          gap: 4,
                        }}
                      >
                        <span
                          style={{
                            borderRadius: 999,
                            padding: "2px 8px",
                            fontSize: 10,
                            border: `1px solid ${sevColor}`,
                            color: sevColor,
                            textTransform: "uppercase",
                            letterSpacing: 0.06,
                          }}
                        >
                          {String(r.severity || "medium")}
                        </span>
                        <span
                          style={{
                            borderRadius: 999,
                            padding: "2px 8px",
                            fontSize: 10,
                            border: passed
                              ? "1px solid rgba(34,197,94,0.9)"
                              : "1px solid rgba(248,113,113,0.9)",
                            background: passed
                              ? "rgba(22,163,74,0.15)"
                              : "rgba(185,28,28,0.15)",
                            color: passed ? "#4ade80" : "#fecaca",
                            textTransform: "uppercase",
                            letterSpacing: 0.08,
                          }}
                        >
                          {passed ? "Pass" : "Fail"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
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
            fontSize: 12,
            color: "#e5e7eb",
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
          setToast((prev) => ({
            ...prev,
            open: false,
          }))
        }
      />
    </div>
  );
}
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
        boxShadow: "0 14px 32px rgba(15,23,42,0.9)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 10,
          marginBottom: 6,
        }}
      >
        <select
          value={rule.field_key || "policy.coverage_type"}
          onChange={(e) => onUpdate({ field_key: e.target.value })}
          disabled={!canEdit}
          style={{
            flex: 1,
            borderRadius: 999,
            padding: "6px 8px",
            border: "1px solid rgba(51,65,85,0.9)",
            background: "rgba(15,23,42,0.96)",
            color: "#e5e7eb",
            fontSize: 12,
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
            width: 130,
            borderRadius: 999,
            padding: "6px 8px",
            border: "1px solid rgba(51,65,85,0.9)",
            background: "rgba(15,23,42,0.96)",
            color: "#e5e7eb",
            fontSize: 12,
          }}
        >
          {OPERATOR_OPTIONS.map((op) => (
            <option key={op.key} value={op.key}>
              {op.label}
            </option>
          ))}
        </select>
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 6,
        }}
      >
        <input
          value={rule.expected_value || ""}
          onChange={(e) => onUpdate({ expected_value: e.target.value })}
          disabled={!canEdit}
          placeholder="Expected value"
          style={{
            flex: 1,
            borderRadius: 999,
            padding: "6px 9px",
            border: "1px solid rgba(51,65,85,0.9)",
            background: "rgba(15,23,42,0.96)",
            color: "#e5e7eb",
            fontSize: 12,
          }}
        />
        <select
          value={rule.severity || "medium"}
          onChange={(e) => onUpdate({ severity: e.target.value })}
          disabled={!canEdit}
          style={{
            width: 120,
            borderRadius: 999,
            padding: "6px 8px",
            border: "1px solid rgba(51,65,85,0.9)",
            background: "rgba(15,23,42,0.96)",
            color: sevColor,
            fontSize: 12,
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
        placeholder="Plain language requirement (e.g. GL each occurrence ≥ $1M)."
        style={{
          width: "100%",
          borderRadius: 999,
          padding: "6px 9px",
          border: "1px solid rgba(51,65,85,0.9)",
          background: "rgba(15,23,42,0.96)",
          color: "#e5e7eb",
          fontSize: 12,
          marginBottom: 5,
        }}
      />
      <input
        value={rule.internal_note || ""}
        onChange={(e) => onUpdate({ internal_note: e.target.value })}
        disabled={!canEdit}
        placeholder="Internal note (optional)"
        style={{
          width: "100%",
          borderRadius: 999,
          padding: "6px 9px",
          border: "1px solid rgba(51,65,85,0.9)",
          background: "rgba(15,23,42,0.96)",
          color: "#9ca3af",
          fontSize: 12,
          marginBottom: 6,
        }}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 4,
        }}
      >
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            fontSize: 11,
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
            borderRadius: 999,
            padding: "3px 7px",
            border: "1px solid rgba(248,113,113,0.8)",
            background: "rgba(127,29,29,0.9)",
            color: "#fecaca",
            fontSize: 11,
            cursor: canEdit ? "pointer" : "not-allowed",
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

  const normalizeNum = (v) => {
    if (typeof v === "number") return v;
    if (typeof v === "string") {
      const clean = v.replace(/[^0-9.\-]/g, "");
      const parsed = parseFloat(clean);
      if (!Number.isNaN(parsed)) return parsed;
    }
    return null;
  };

  if (op === "equals") {
    return String(rawVal) === String(expected);
  }

  if (op === "not_equals") {
    return String(rawVal) !== String(expected);
  }

  if (op === "contains") {
    return String(rawVal)
      .toLowerCase()
      .includes(String(expected).toLowerCase());
  }

  if (op === "gte") {
    const a = normalizeNum(rawVal);
    const b = normalizeNum(expected);
    if (a === null || b === null) return false;
    return a >= b;
  }

  if (op === "lte") {
    const a = normalizeNum(rawVal);
    const b = normalizeNum(expected);
    if (a === null || b === null) return false;
    return a <= b;
  }

  // Unknown operator → fail safe
  return false;
}
