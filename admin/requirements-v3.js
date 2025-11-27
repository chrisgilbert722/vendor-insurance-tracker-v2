// pages/admin/requirements-v3.js
import { useEffect, useState, useMemo } from "react";
import { useRole } from "../../lib/useRole";
import { useOrg } from "../../context/OrgContext";
import ToastV2 from "../../components/ToastV2";

/* ==========================================================
   REQUIREMENTS ENGINE V3.5 — MULTI-CONDITION COCKPIT
   - Groups (lanes) of rules
   - Each rule can have multiple conditions (AND / OR)
   - Endorsement-aware fields included
   - Backwards compatible with existing backend
   ========================================================== */

const FIELD_OPTIONS = [
  // Policy-level fields
  { key: "policy.coverage_type", label: "Coverage Type" },
  { key: "policy.glEachOccurrence", label: "GL Each Occurrence" },
  { key: "policy.glAggregate", label: "GL Aggregate" },
  { key: "policy.expiration_date", label: "Policy Expiration Date" },
  { key: "policy.effective_date", label: "Policy Effective Date" },
  { key: "policy.carrier", label: "Carrier Name" },
  // Endorsement-related fields
  {
    key: "endorsement.form_number",
    label: "Endorsement Form Number (e.g. CG 20 10)",
  },
  {
    key: "endorsement.name",
    label: "Endorsement Name / Label",
  },
  {
    key: "endorsement.aiText",
    label: "Endorsement AI Text (full text search)",
  },
];

const OPERATOR_OPTIONS = [
  { key: "equals", label: "Equals" },
  { key: "not_equals", label: "Not Equals" },
  { key: "gte", label: "≥ (Greater or Equal)" },
  { key: "lte", label: "≤ (Less or Equal)" },
  { key: "contains", label: "Contains (text)" },
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
  "policy.glEachOccurrence": 500000,
  "policy.glAggregate": 1000000,
  "policy.expiration_date": "2025-06-30",
  "policy.carrier": "Sample Carrier",
  "endorsement.form_number": "CG 20 10",
  "endorsement.aiText": "Additional Insured: Owners, Lessees or Contractors CG 20 10 07 04"
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

  /* --------------------------
      INITIAL LOAD
     -------------------------- */
  useEffect(() => {
    if (loadingOrgs) return;
    if (!orgId) {
      setLoading(false);
      return;
    }
    loadGroups();
  }, [orgId, loadingOrgs]);

  /* --------------------------
      LOAD GROUPS + RULES
     -------------------------- */
  async function loadGroups() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        `/api/requirements-v2/groups?orgId=${encodeURIComponent(orgId)}`
      );
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
      console.error("loadGroups error:", err);
      setError(err.message || "Failed to load groups.");
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

    try {
      const res = await fetch(
        `/api/requirements-v2/rules?groupId=${encodeURIComponent(groupId)}`
      );
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed to load rules");

      const hydrated = (json.rules || []).map((r) => {
        const baseCondition = {
          field_key: r.field_key || "policy.coverage_type",
          operator: r.operator || "equals",
          expected_value: r.expected_value ?? "",
        };

        const conditions =
          Array.isArray(r.conditions) && r.conditions.length > 0
            ? r.conditions
            : [baseCondition];

        return {
          ...r,
          logic: r.logic || "all", // "all" = AND, "any" = OR
          conditions,
        };
      });

      setRules(hydrated);
      setEvaluation({ ok: false, error: "", results: {} });
    } catch (err) {
      console.error("loadRulesForGroup error:", err);
      setError(err.message || "Failed to load rules.");
    }
  }

  /* --------------------------
      GROUP CRUD
     -------------------------- */
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
      setToast({
        open: true,
        type: "success",
        message: "Group created.",
      });
    } catch (err) {
      console.error("createGroup error:", err);
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
        body: JSON.stringify(updated),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed to update group");

      setToast({
        open: true,
        type: "success",
        message: "Group updated.",
      });
    } catch (err) {
      console.error("updateGroup error:", err);
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
      console.error("deleteGroup error:", err);
      setToast({
        open: true,
        type: "error",
        message: err.message || "Failed to delete group.",
      });
    } finally {
      setSaving(false);
    }
  }

  /* --------------------------
      RULE CRUD (multi-conditions)
     -------------------------- */
  async function handleCreateRule() {
    if (!activeGroup || !canEdit) return;

    const field_key = prompt(
      "Field key (e.g. policy.glEachOccurrence, endorsement.form_number)"
    );
    if (!field_key) return;
    const expected_value = prompt("Expected value (e.g. 1000000 or 'CG 20 10')");
    if (!expected_value) return;

    const newRule = {
      groupId: activeGroup.id,
      logic: "all",
      conditions: [
        {
          field_key,
          operator: "equals",
          expected_value,
        },
      ],
      severity: "medium",
      requirement_text: "",
      internal_note: "",
    };

    // top-level fields for backend compatibility
    const payload = {
      ...newRule,
      field_key,
      operator: "equals",
      expected_value,
      severity: "medium",
    };

    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/requirements-v2/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed to create rule");

      const created = {
        ...json.rule,
        logic: "all",
        conditions: newRule.conditions,
      };

      setRules((prev) => [...prev, created]);
      setToast({
        open: true,
        type: "success",
        message: "Rule created.",
      });
    } catch (err) {
      console.error("createRule error:", err);
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

    // ensure at least one condition
    if (!Array.isArray(updated.conditions) || updated.conditions.length === 0) {
      updated.conditions = [
        {
          field_key:
            updated.field_key || "policy.coverage_type",
          operator: updated.operator || "equals",
          expected_value: updated.expected_value ?? "",
        },
      ];
    }

    // backfill top-level fields for backend compatibility
    const c0 = updated.conditions[0];
    const backendPayload = {
      ...updated,
      field_key: c0.field_key,
      operator: c0.operator,
      expected_value: c0.expected_value,
    };

    setRules((prev) =>
      prev.map((r) => (r.id === ruleId ? updated : r))
    );

    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/requirements-v2/rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(backendPayload),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed to update rule");

      setToast({
        open: true,
        type: "success",
        message: "Rule updated.",
      });
    } catch (err) {
      console.error("updateRule error:", err);
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
      console.error("deleteRule error:", err);
      setToast({
        open: true,
        type: "error",
        message: err.message || "Failed to delete rule.",
      });
    } finally {
      setSaving(false);
    }
  }

  /* --------------------------
      ENGINE RUN
     -------------------------- */
  async function handleRunEngine() {
    try {
      setSaving(true);
      const res = await fetch("/api/engine/run-v3", { method: "POST" });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Engine run failed");
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

  /* --------------------------
      SAMPLE POLICY EVAL (front-end only)
     -------------------------- */
  function handleEvaluateSamplePolicy() {
    setEvaluation({ ok: false, error: "", results: {} });

    let parsed;
    try {
      parsed = JSON.parse(samplePolicyText || "{}");
    } catch {
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

    const results = {};
    for (const r of rules) {
      results[r.id] = evaluateRule(r, parsed);
    }
    setEvaluation({ ok: true, error: "", results });
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
          "radial-gradient(circle at top left,#020617 0%, #020617 40%, #000 100%)",
        padding: "30px 40px 40px",
        color: "#e5e7eb",
      }}
    >
      {/* Scanlines */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "100% 3px",
          opacity: 0.3,
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {/* HEADER */}
      <div style={{ position: "relative", zIndex: 2, marginBottom: 18 }}>
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
            Requirements Engine V3.5
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
            maxWidth: 700,
            fontSize: 13,
            color: "#cbd5f5",
          }}
        >
          Each rule can have multiple conditions. Use AND / OR logic to describe
          complex coverage + endorsement checks. Alerts will surface any
          failures in the Alerts Cockpit.
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

      {/* LAYOUT GRID */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "grid",
          gridTemplateColumns: "260px minmax(0,1.7fr) minmax(0,1.3fr)",
          gap: 18,
        }}
      >
        {/* GROUPS COLUMN */}
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
                Lanes of related rules.
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
                  “Additional Insured / Waiver Required”
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

        {/* RULES COLUMN */}
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
              {/* Group header */}
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
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 6 }}
                >
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

              {/* Rules header */}
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
                    1,000,000 AND coverage type must be ‘General Liability’”.
                  </div>
                ) : (
                  rules.map((rule) => (
                    <RuleCard
                      key={rule.id}
                      rule={rule}
                      onUpdate={(patch) =>
                        handleUpdateRule(rule.id, patch)
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

        {/* PREVIEW / SAMPLE EVAL */}
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

          {/* Engine run */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <div style={{ fontSize: 11, color: "#6b7280" }}>
              Trigger a full engine run across all vendors.
            </div>
            <button
              onClick={handleRunEngine}
              disabled={saving || !canEdit}
              style={{
                borderRadius: 999,
                padding: "6px 11px",
                border: "1px solid rgba(56,189,248,0.9)",
                background:
                  "linear-gradient(120deg,rgba(8,47,73,1),rgba(15,23,42,1))",
                color: "#e0f2fe",
                fontSize: 11,
                cursor: saving || !canEdit ? "not-allowed" : "pointer",
                opacity: saving || !canEdit ? 0.5 : 1,
              }}
            >
              Run engine now
            </button>
          </div>

          {/* Rules preview text */}
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
                      <span style={{ color: "#9ca3af" }}>
                        {r.logic === "all" ? "ALL of:" : "ANY of:"}
                      </span>
                      <br />
                      {r.conditions.map((c, idx) => (
                        <div
                          key={idx}
                          style={{ fontSize: 12, marginLeft: 10 }}
                        >
                          <code style={{ color: "#93c5fd" }}>
                            {c.field_key}
                          </code>{" "}
                          {operatorLabel(c.operator)}{" "}
                          <code style={{ color: "#a5b4fc" }}>
                            {c.expected_value}
                          </code>
                        </div>
                      ))}
                      <div style={{ marginTop: 4 }}>
                        ⇒{" "}
                        <span style={{ color: sevColor }}>
                          {String(r.severity || "medium").toUpperCase()} ALERT
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: "#9ca3af" }}>
              As you add rules, this panel will show how the engine interprets
              them.
            </div>
          )}

          {/* Sample policy evaluation */}
          <div
            style={{
              marginTop: 12,
              paddingTop: 8,
              borderTop: "1px solid rgba(30,64,175,0.7)",
              fontSize: 11,
              color: "#6b7280",
            }}
          >
            Sample policy evaluation (local only)
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
              marginTop: 6,
            }}
          />

          <button
            onClick={handleEvaluateSamplePolicy}
            disabled={!rules.length}
            style={{
              marginTop: 8,
              borderRadius: 999,
              padding: "6px 11px",
              border: "1px solid rgba(129,140,248,0.9)",
              background:
                "linear-gradient(120deg,rgba(30,64,175,1),rgba(15,23,42,1))",
              color: "#e0e7ff",
              fontSize: 11,
              cursor: !rules.length ? "not-allowed" : "pointer",
              opacity: !rules.length ? 0.5 : 1,
            }}
          >
            Evaluate sample policy
          </button>

          {evaluation.error && (
            <div
              style={{
                marginTop: 6,
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

          {evaluation.ok && rules.length > 0 && (
            <div
              style={{
                marginTop: 8,
                borderRadius: 12,
                border: "1px solid rgba(30,64,175,0.8)",
                background:
                  "radial-gradient(circle at top,rgba(15,23,42,0.98),rgba(15,23,42,0.96))",
                padding: "8px 9px",
                maxHeight: 220,
                overflowY: "auto",
                fontSize: 12,
              }}
            >
              {rules.map((r) => {
                const passed = evaluation.results[r.id] === true;
                return (
                  <div
                    key={r.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "4px 0",
                      borderBottom: "1px solid rgba(30,64,175,0.6)",
                    }}
                  >
                    <div style={{ marginRight: 10 }}>
                      {r.conditions.map((c, idx) => (
                        <div key={idx}>
                          <code style={{ color: "#93c5fd" }}>
                            {c.field_key}
                          </code>{" "}
                          {operatorLabel(c.operator)}{" "}
                          <code style={{ color: "#a5b4fc" }}>
                            {c.expected_value}
                          </code>
                        </div>
                      ))}
                    </div>
                    <span
                      style={{
                        borderRadius: 999,
                        padding: "2px 8px",
                        border: passed
                          ? "1px solid rgba(34,197,94,0.9)"
                          : "1px solid rgba(248,113,113,0.9)",
                        background: passed
                          ? "rgba(34,197,94,0.15)"
                          : "rgba(185,28,28,0.15)",
                        color: passed ? "#4ade80" : "#fecaca",
                        textTransform: "uppercase",
                        fontSize: 10,
                      }}
                    >
                      {passed ? "Pass" : "Fail"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
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
/* =======================================================
   RULECARD — MULTI-CONDITION TACTICAL MODULE
   ======================================================= */

function RuleCard({ rule, onUpdate, onDelete, canEdit }) {
  const sevColor =
    SEVERITY_COLORS[rule.severity] || SEVERITY_COLORS.medium;

  const conditions = rule.conditions || [];

  function updateCondition(index, patch) {
    const next = conditions.map((c, i) =>
      i === index ? { ...c, ...patch } : c
    );
    onUpdate({ conditions: next });
  }

  function addCondition() {
    const next = [
      ...conditions,
      {
        field_key:
          conditions[0]?.field_key || "policy.coverage_type",
        operator: conditions[0]?.operator || "equals",
        expected_value: "",
      },
    ];
    onUpdate({ conditions: next });
  }

  function removeCondition(index) {
    const next = conditions.filter((_, i) => i !== index);
    onUpdate({ conditions: next });
  }

  return (
    <div
      style={{
        borderRadius: 18,
        padding: 14,
        border: "1px solid rgba(51,65,85,0.95)",
        background: "rgba(15,23,42,0.96)",
        boxShadow: "0 14px 32px rgba(15,23,42,0.9)",
      }}
    >
      {/* LOGIC TOGGLE */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 8,
          alignItems: "center",
        }}
      >
        <div
          style={{
            fontSize: 11,
            textTransform: "uppercase",
            color: "#9ca3af",
            letterSpacing: 1.1,
          }}
        >
          {rule.logic === "any"
            ? "Alert if ANY condition fails"
            : "Alert if ALL conditions fail"}
        </div>
        <div
          style={{
            borderRadius: 999,
            border: "1px solid rgba(51,65,85,0.9)",
            background: "rgba(15,23,42,0.98)",
            display: "inline-flex",
            padding: 2,
            gap: 2,
          }}
        >
          <button
            disabled={!canEdit}
            onClick={() => onUpdate({ logic: "all" })}
            style={{
              borderRadius: 999,
              border: "none",
              padding: "3px 9px",
              fontSize: 11,
              cursor: canEdit ? "pointer" : "not-allowed",
              background:
                rule.logic !== "any"
                  ? "rgba(37,99,235,0.85)"
                  : "transparent",
              color:
                rule.logic !== "any" ? "#e5e7eb" : "#9ca3af",
            }}
          >
            ALL
          </button>
          <button
            disabled={!canEdit}
            onClick={() => onUpdate({ logic: "any" })}
            style={{
              borderRadius: 999,
              border: "none",
              padding: "3px 9px",
              fontSize: 11,
              cursor: canEdit ? "pointer" : "not-allowed",
              background:
                rule.logic === "any"
                  ? "rgba(37,99,235,0.85)"
                  : "transparent",
              color:
                rule.logic === "any" ? "#e5e7eb" : "#9ca3af",
            }}
          >
            ANY
          </button>
        </div>
      </div>

      {/* CONDITIONS */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          marginBottom: 8,
        }}
      >
        {conditions.map((c, index) => (
          <div
            key={index}
            style={{
              borderRadius: 12,
              padding: 8,
              border: "1px solid rgba(51,65,85,0.9)",
              background: "rgba(15,23,42,0.96)",
              display: "grid",
              gridTemplateColumns: "minmax(0,2.3fr) minmax(0,1.6fr) 1.5fr 32px",
              gap: 6,
              alignItems: "center",
            }}
          >
            {/* Field */}
            <select
              value={c.field_key}
              onChange={(e) =>
                updateCondition(index, { field_key: e.target.value })
              }
              disabled={!canEdit}
              style={{
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

            {/* Operator */}
            <select
              value={c.operator}
              onChange={(e) =>
                updateCondition(index, { operator: e.target.value })
              }
              disabled={!canEdit}
              style={{
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

            {/* Expected value */}
            <input
              value={c.expected_value || ""}
              onChange={(e) =>
                updateCondition(index, {
                  expected_value: e.target.value,
                })
              }
              disabled={!canEdit}
              placeholder="Expected value"
              style={{
                borderRadius: 999,
                padding: "6px 9px",
                border: "1px solid rgba(51,65,85,0.9)",
                background: "rgba(15,23,42,0.96)",
                color: "#e5e7eb",
                fontSize: 12,
              }}
            />

            {/* Remove condition */}
            <button
              disabled={!canEdit || conditions.length <= 1}
              onClick={() => removeCondition(index)}
              style={{
                borderRadius: 999,
                padding: "4px 6px",
                border: "1px solid rgba(148,163,184,0.8)",
                background: "rgba(15,23,42,0.96)",
                color: "#9ca3af",
                fontSize: 11,
                cursor:
                  !canEdit || conditions.length <= 1
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Add condition button */}
      <button
        disabled={!canEdit}
        onClick={addCondition}
        style={{
          borderRadius: 999,
          padding: "4px 9px",
          border: "1px dashed rgba(148,163,184,0.8)",
          background: "rgba(15,23,42,0.96)",
          color: "#9ca3af",
          fontSize: 11,
          cursor: canEdit ? "pointer" : "not-allowed",
          marginBottom: 8,
        }}
      >
        + Add condition
      </button>

      {/* Severity + texts */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 6,
          marginTop: 4,
        }}
      >
        <select
          value={rule.severity || "medium"}
          onChange={(e) => onUpdate({ severity: e.target.value })}
          disabled={!canEdit}
          style={{
            width: 130,
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

        <input
          value={rule.requirement_text || ""}
          onChange={(e) =>
            onUpdate({ requirement_text: e.target.value })
          }
          disabled={!canEdit}
          placeholder="Plain language requirement…"
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
      </div>

      <input
        value={rule.internal_note || ""}
        onChange={(e) =>
          onUpdate({ internal_note: e.target.value })
        }
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

      {/* FOOTER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 4,
          alignItems: "center",
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
/* =======================================================
   HELPERS
   ======================================================= */

function operatorLabel(op) {
  const found = OPERATOR_OPTIONS.find((o) => o.key === op);
  return found ? found.label : op;
}

function evaluateCondition(condition, policyObj) {
  const { field_key, operator, expected_value } = condition || {};
  if (!field_key) return false;

  const rawVal = policyObj[field_key];

  const normalizeNum = (v) => {
    if (typeof v === "number") return v;
    if (typeof v === "string") {
      const clean = v.replace(/[^0-9.\-]/g, "");
      const parsed = parseFloat(clean);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  };

  switch (operator) {
    case "equals":
      return String(rawVal) === String(expected_value);
    case "not_equals":
      return String(rawVal) !== String(expected_value);
    case "contains":
      return String(rawVal || "")
        .toLowerCase()
        .includes(String(expected_value || "").toLowerCase());
    case "gte": {
      const a = normalizeNum(rawVal);
      const b = normalizeNum(expected_value);
      if (a === null || b === null) return false;
      return a >= b;
    }
    case "lte": {
      const a = normalizeNum(rawVal);
      const b = normalizeNum(expected_value);
      if (a === null || b === null) return false;
      return a <= b;
    }
    default:
      return false;
  }
}

/**
 * Multi-Condition Rule Evaluation
 * - logic: "all"  => ALL conditions must pass
 * - logic: "any"  => AT LEAST ONE condition must pass
 */
function evaluateRule(rule, policyObj) {
  if (!rule || rule.is_active === false) return false;

  const logic = rule.logic || "all";
  const conditions =
    Array.isArray(rule.conditions) && rule.conditions.length
      ? rule.conditions
      : [
          {
            field_key: rule.field_key,
            operator: rule.operator,
            expected_value: rule.expected_value,
          },
        ];

  const results = conditions.map((c) =>
    evaluateCondition(c, policyObj)
  );

  if (logic === "any") {
    return results.some(Boolean);
  }

  // default: "all"
  return results.every(Boolean);
}
