// pages/admin/requirements-v3.js
import { useEffect, useState, useMemo } from "react";
import { useRole } from "../../lib/useRole";
import { useOrg } from "../../context/OrgContext";

/**
 * RULE ENGINE V3 — DB-backed Requirements UI
 * - Uses requirements_groups_v2 + requirements_rules_v2
 * - APIs:
 *    GET/POST/PUT/DELETE  /api/requirements-v2/groups
 *    GET/POST/PUT/DELETE  /api/requirements-v2/rules
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
  const { orgId } = useOrg();

  const canEdit = isAdmin || isManager;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [groups, setGroups] = useState([]);
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [rules, setRules] = useState([]); // rules for active group

  const activeGroup = useMemo(
    () => groups.find((g) => g.id === activeGroupId) || null,
    [groups, activeGroupId]
  );

  useEffect(() => {
    if (!orgId) return;
    loadGroups();
  }, [orgId]);

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
    } catch (err) {
      console.error("loadRulesForGroup error:", err);
      setError(err.message || "Failed to load rules for this group.");
    }
  }

  // GROUP CRUD
  async function handleCreateGroup() {
    if (!orgId || !canEdit) return;
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
    } catch (err) {
      console.error("createGroup error:", err);
      setError(err.message || "Failed to create group.");
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
    } catch (err) {
      console.error("updateGroup error:", err);
      setError(err.message || "Failed to update group.");
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
    } catch (err) {
      console.error("deleteGroup error:", err);
      setError(err.message || "Failed to delete group.");
    } finally {
      setSaving(false);
    }
  }

  // RULE CRUD
  async function handleCreateRule() {
    if (!activeGroup || !canEdit) return;
    const field_key = prompt(
      "Field key (e.g. policy.glEachOccurrence, policy.coverage_type)"
    );
    if (!field_key) return;
    const expected_value = prompt("Expected value (e.g. 1,000,000 or 'General')");
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

      const newRule = json.rule;
      setRules((prev) => [...prev, newRule]);
    } catch (err) {
      console.error("createRule error:", err);
      setError(err.message || "Failed to create rule.");
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
    } catch (err) {
      console.error("updateRule error:", err);
      setError(err.message || "Failed to update rule.");
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
    } catch (err) {
      console.error("deleteRule error:", err);
      setError(err.message || "Failed to delete rule.");
    } finally {
      setSaving(false);
    }
  }

  // RENDER
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
      {/* Header */}
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
            letterSpacing: 0.25,
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
          Each rule below is stored in your requirements engine and evaluated
          against vendor policies to fire alerts in the Alerts cockpit.
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
            fontSize: 13,
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
            fontSize: 12,
            color: "#e5e7eb",
          }}
        >
          You are in read-only mode. Only admins and managers can edit
          requirements.
        </div>
      )}

      {/* Layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "260px minmax(0, 1.7fr) minmax(0, 1.3fr)",
          gap: 18,
        }}
      >
        {/* Groups Column */}
        <div
          style={{
            borderRadius: 20,
            padding: 14,
            background:
              "linear-gradient(135deg,rgba(15,23,42,0.98),rgba(15,23,42,0.9))",
            border: "1px solid rgba(148,163,184,0.5)",
            boxShadow: "0 20px 40px rgba(15,23,42,0.9)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 6,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  color: "#9ca3af",
                  letterSpacing: 1.3,
                }}
              >
                Groups
              </div>
              <div style={{ fontSize: 12, color: "#e5e7eb" }}>
                Buckets for related rules.
              </div>
            </div>
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
                fontSize: 11,
                fontWeight: 500,
                cursor: canEdit ? "pointer" : "not-allowed",
                opacity: canEdit ? 1 : 0.5,
              }}
            >
              + New group
            </button>
          </div>

          <div
            style={{
              marginTop: 4,
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
                  padding: "10px 8px",
                  borderRadius: 12,
                  border: "1px dashed rgba(148,163,184,0.6)",
                  fontSize: 12,
                  color: "#9ca3af",
                }}
              >
                No requirement groups yet. Create your first lane, like{" "}
                <span style={{ color: "#e5e7eb" }}>
                  “General Liability Minimums”
                </span>{" "}
                or{" "}
                <span style={{ color: "#e5e7eb" }}>
                  “Expired / Missing Insurance”
                </span>
                .
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
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      marginBottom: 2,
                    }}
                  >
                    {g.name}
                  </div>
                  <div style={{ fontSize: 11, color: "#9ca3af" }}>
                    {g.description || "No description"} · {g.rule_count} rules
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Rules Column */}
        <div
          style={{
            borderRadius: 20,
            padding: 14,
            background:
              "radial-gradient(circle at top left,rgba(15,23,42,0.98),rgba(15,23,42,0.9))",
            border: "1px solid rgba(148,163,184,0.55)",
            boxShadow: "0 24px 60px rgba(15,23,42,0.95)",
          }}
        >
          {activeGroup ? (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 10,
                  gap: 10,
                }}
              >
                <div>
                  <input
                    value={activeGroup.name || ""}
                    onChange={(e) =>
                      handleUpdateGroup({ name: e.target.value })
                    }
                    disabled={!canEdit}
                    style={{
                      borderRadius: 999,
                      padding: "6px 10px",
                      border: "1px solid rgba(51,65,85,0.9)",
                      background: "rgba(15,23,42,0.96)",
                      color: "#e5e7eb",
                      fontSize: 13,
                      width: 260,
                    }}
                  />
                  <textarea
                    value={activeGroup.description || ""}
                    onChange={(e) =>
                      handleUpdateGroup({ description: e.target.value })
                    }
                    disabled={!canEdit}
                    placeholder="Describe what this lane enforces."
                    rows={2}
                    style={{
                      marginTop: 4,
                      borderRadius: 12,
                      padding: "6px 9px",
                      border: "1px solid rgba(51,65,85,0.9)",
                      background: "rgba(15,23,42,0.96)",
                      color: "#e5e7eb",
                      fontSize: 12,
                      resize: "vertical",
                      width: "100%",
                    }}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label
                    style={{
                      fontSize: 11,
                      color: "#9ca3af",
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
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
                    Group active
                  </label>
                  <button
                    disabled={!canEdit}
                    onClick={() => handleDeleteGroup(activeGroup.id)}
                    style={{
                      borderRadius: 999,
                      padding: "6px 10px",
                      border: "1px solid rgba(248,113,113,0.7)",
                      background: "rgba(127,29,29,0.9)",
                      color: "#fecaca",
                      fontSize: 11,
                      cursor: canEdit ? "pointer" : "not-allowed",
                    }}
                  >
                    Delete group
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <div style={{ fontSize: 12, color: "#9ca3af" }}>
                  {rules.length} rules in this lane.
                </div>
                <button
                  disabled={!canEdit}
                  onClick={handleCreateRule}
                  style={{
                    borderRadius: 999,
                    padding: "6px 11px",
                    border: "1px solid rgba(56,189,248,0.8)",
                    background:
                      "linear-gradient(120deg,rgba(8,47,73,1),rgba(15,23,42,1))",
                    color: "#e0f2fe",
                    fontSize: 11,
                    cursor: canEdit ? "pointer" : "not-allowed",
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

        {/* Preview / Evaluation */}
        <div
          style={{
            borderRadius: 20,
            padding: 14,
            background:
              "radial-gradient(circle at top right,rgba(15,23,42,0.98),rgba(15,23,42,0.94))",
            border: "1px solid rgba(148,163,184,0.5)",
            boxShadow: "0 22px 50px rgba(15,23,42,0.95)",
          }}
        >
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              color: "#9ca3af",
              letterSpacing: 1.4,
              marginBottom: 6,
            }}
          >
            Live rule preview
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
                    {r.requirement_text && (
                      <div
                        style={{
                          fontSize: 12,
                          color: "#9ca3af",
                          marginTop: 2,
                        }}
                      >
                        {r.requirement_text}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: "#9ca3af" }}>
              As you add rules, this panel will show how the engine evaluates
              policies. You can use fields like{" "}
              <code style={{ color: "#93c5fd" }}>policy.glEachOccurrence</code>{" "}
              or{" "}
              <code style={{ color: "#93c5fd" }}>
                policy.coverage_type
              </code>{" "}
              and compare them to expected values.
            </div>
          )}

          <div
            style={{
              marginTop: 12,
              paddingTop: 8,
              borderTop: "1px solid rgba(30,64,175,0.7)",
              fontSize: 11,
              color: "#6b7280",
            }}
          >
            These rules are evaluated when policies are uploaded or refreshed by
            the engine, and any failures become alerts in the Alerts cockpit.
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
          }}
        >
          Saving…
        </div>
      )}
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
      {/* Top row */}
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

      {/* Expected value + severity */}
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

      {/* Texts */}
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

      {/* Footer actions */}
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
