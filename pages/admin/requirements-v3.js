// pages/admin/requirements-v3.js
// ==========================================================
// PHASE 2 — FULL MERGE VERSION
// Cinematic Lanes + DnD + Backend CRUD + Engine Integration
// ==========================================================

// ----------------------------
// IMPORTS
// ----------------------------
import { useEffect, useState, useMemo, useRef } from "react";
import { useRole } from "../../lib/useRole";
import { useOrg } from "../../context/OrgContext";
import ToastV2 from "../../components/ToastV2";

// Drag & Drop Core
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

// ----------------------------
// CONSTANTS
// ----------------------------
const ITEM_TYPE = "REQUIREMENT_RULE";

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

// ----------------------------
// MAIN PAGE COMPONENT
// ----------------------------
export default function RequirementsV3Page() {
  const { isAdmin, isManager } = useRole();
  const { activeOrgId: orgId, loadingOrgs } = useOrg();
  const canEdit = isAdmin || isManager;

  // GLOBAL STATE
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

  // ENGINE STATE
  const [runningEngine, setRunningEngine] = useState(false);
  const [engineLog, setEngineLog] = useState([]);
  const [lastRunAt, setLastRunAt] = useState(null);

  const activeGroup = useMemo(
    () => groups.find((g) => g.id === activeGroupId) || null,
    [groups, activeGroupId]
  );

  // ----------------------------
  // LOAD GROUPS WHEN ORG CHANGES
  // ----------------------------
  useEffect(() => {
    if (loadingOrgs) return;
    if (!orgId) {
      setLoading(false);
      return;
    }
    loadGroups();
  }, [orgId, loadingOrgs]);

  // ----------------------------
  // API: LOAD GROUPS
  // ----------------------------
  async function loadGroups() {
    setLoading(true);
    try {
      const res = await fetch(`/api/requirements-v2/groups?orgId=${orgId}`);
      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to load groups.");
      }

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

  // ----------------------------
  // API: LOAD RULES FOR GROUP
  // ----------------------------
  async function loadRulesForGroup(groupId) {
    if (!groupId) {
      setRules([]);
      return;
    }

    try {
      const res = await fetch(`/api/requirements-v2/rules?groupId=${groupId}`);
      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to load rules.");
      }

      setRules(json.rules || []);
    } catch (err) {
      setError(err.message || "Failed to load rules.");
    }
  }

  // ----------------------------
  // GROUP CRUD
  // ----------------------------
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
      if (!res.ok || !json.ok) throw new Error(json.error);

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

    try {
      setSaving(true);
      const res = await fetch("/api/requirements-v2/groups", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error);

      setToast({ open: true, type: "success", message: "Group updated." });
    } catch (err) {
      setToast({ open: true, type: "error", message: err.message });
      loadGroups();
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteGroup(id) {
    if (!canEdit || !id) return;
    if (!confirm("Delete this group and all rules?")) return;

    try {
      setSaving(true);
      const res = await fetch(`/api/requirements-v2/groups?id=${id}`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error);

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

// --------------------------------------
// RULE CRUD
// --------------------------------------
async function handleCreateRule() {
  if (!activeGroup || !canEdit) return;

  const field_key = prompt("Field key (e.g. policy.coverage_type):");
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
    if (!res.ok || !json.ok) throw new Error(json.error);

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

  const current = rules.find((r) => r.id === ruleId);
  if (!current) return;

  const updated = { ...current, ...patch };

  setRules((prev) =>
    prev.map((r) => (r.id === ruleId ? updated : r))
  );

  try {
    setSaving(true);

    const res = await fetch("/api/requirements-v2/rules", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });

    const json = await res.json();
    if (!res.ok || !json.ok) throw new Error(json.error);

    setToast({ open: true, type: "success", message: "Rule updated." });
  } catch (err) {
    setToast({ open: true, type: "error", message: err.message });
    loadRulesForGroup(activeGroupId);
  } finally {
    setSaving(false);
  }
}

async function handleDeleteRule(ruleId) {
  if (!ruleId || !canEdit) return;
  if (!confirm("Delete this rule?")) return;

  try {
    setSaving(true);

    const res = await fetch(`/api/requirements-v2/rules?id=${ruleId}`, {
      method: "DELETE",
    });

    const json = await res.json();
    if (!res.ok || !json.ok) throw new Error(json.error);

    setRules((prev) => prev.filter((r) => r.id !== ruleId));
    setToast({ open: true, type: "success", message: "Rule deleted." });
  } catch (err) {
    setToast({ open: true, type: "error", message: err.message });
  } finally {
    setSaving(false);
  }
}

// ==========================================================
// SECTION 2 WILL START AFTER THIS
// ==========================================================
// --------------------------------------
// DRAG & DROP: REORDER + MOVE ACROSS LANES
// --------------------------------------
function handleMoveRule(dragIndex, hoverIndex, laneKey) {
  setRules((prev) => {
    const sameLaneRules = prev.filter((r) => r.severity === laneKey);

    const updated = [...sameLaneRules];
    const [removed] = updated.splice(dragIndex, 1);
    updated.splice(hoverIndex, 0, removed);

    // now rebuild the full rule list with updated order for that lane
    const other = prev.filter((r) => r.severity !== laneKey);

    return [...other, ...updated];
  });
}

// --------------------------------------
// ENGINE RUN
// --------------------------------------
async function handleRunEngine() {
  try {
    setRunningEngine(true);

    // Pre-log entry
    setEngineLog((prev) => [
      {
        at: new Date().toISOString(),
        level: "info",
        message: "Dispatching Rule Engine V3 run…",
      },
      ...prev,
    ]);

    const res = await fetch("/api/engine/run-v3", { method: "POST" });
    const json = await res.json();

    if (!res.ok || !json.ok) {
      throw new Error(json.error || "Engine run failed.");
    }

    const msg =
      json.message ||
      `Engine ran for ${json.vendors_evaluated || 0} vendors, created ${
        json.alerts_created || 0
      } alerts.`;

    setLastRunAt(new Date().toISOString());

    // success log
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

// --------------------------------------
// SAMPLE POLICY EVALUATOR
// --------------------------------------
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
    results[r.id] = evaluateRule(r, parsed);
  }

  setEvaluation({ ok: true, error: "", results });
  setToast({ open: true, type: "success", message: "Sample evaluated." });
}

// ==========================================================
// RENDER — PAGE LAYOUT
// ==========================================================
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
            Requirements Engine V3
          </span>
          <span
            style={{
              fontSize: 10,
              color: "#38bdf8",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
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
            maxWidth: 720,
            fontSize: 13,
            color: "#cbd5f5",
          }}
        >
          Every rule here is evaluated against vendor policies and updates
          the Alerts Cockpit in real time. This is your AI coverage engine
          for limits, endorsements, and policy health.
        </p>

        <div
          style={{
            marginTop: 6,
            fontSize: 12,
            color: "#9ca3af",
          }}
        >
          Org:{" "}
          <span style={{ color: "#e5e7eb" }}>{orgId || "none"}</span> ·
          Groups: <span style={{ color: "#e5e7eb" }}>{groups.length}</span> ·
          Active:{" "}
          <span style={{ color: "#e5e7eb" }}>
            {activeGroup ? activeGroup.name : "none"}
          </span>
        </div>
      </div>

      {/* ERRORS */}
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
                      }}
                    >
                      {g.description || "No description"} ·{" "}
                      {g.rule_count || 0} rules
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* MIDDLE PANEL — CINEMATIC LANES */}
        <DndProvider backend={HTML5Backend}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 18,
              minHeight: 480,
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
                  ? "rgba(248,113,113,0.35)"
                  : laneKey === "required"
                  ? "rgba(59,130,246,0.35)"
                  : "rgba(168,85,247,0.35)";

              const laneRules = rules.filter((r) => r.severity === laneKey);

              return (
                <LaneColumn
                  key={laneKey}
                  laneKey={laneKey}
                  label={laneLabel}
                  color={laneColor}
                  rules={laneRules}
                  onMoveRule={handleMoveRule}
                  onUpdateRule={handleUpdateRule}
                  onDeleteRule={handleDeleteRule}
                  canEdit={canEdit}
                />
              );
            })}
          </div>
        </DndProvider>
        {/* RIGHT PANEL — ENGINE + SAMPLE EVAL */}
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

            {/* ENGINE BUTTON */}
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

            {/* LAST RUN TIME */}
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

            {/* TEXT PREVIEW OF RULE LOGIC */}
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
                rules.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      padding: "4px 0",
                      borderBottom: "1px solid rgba(31,41,55,0.8)",
                    }}
                  >
                    IF{" "}
                    <span style={{ color: "#93c5fd" }}>{r.field_key}</span>{" "}
                    {operatorLabel(r.operator)}{" "}
                    <span style={{ color: "#a5b4fc" }}>{r.expected_value}</span>{" "}
                    →{" "}
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
                ))
              ) : (
                <div style={{ color: "#6b7280" }}>
                  Add rules in the lanes to preview live logic.
                </div>
              )}
            </div>

            {/* ENGINE ACTIVITY LOG */}
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
                  trigger a full evaluation.
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
                Sample evaluation complete. (
                {Object.keys(evaluation.results).length || 0} rules evaluated.)
              </div>
            )}
          </div>
        </div>
      </div>
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

    {/* GLOBAL SPIN ANIM */}
    <style jsx global>{`
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
    `}</style>
  </div>
);

// ==========================================================
// SECTION 4 WILL START AFTER THIS
// ==========================================================
// ==========================================================
// LANE COLUMN — CINEMATIC DROP ZONE
// ==========================================================
function LaneColumn({
  laneKey,
  label,
  color,
  rules,
  onMoveRule,
  onUpdateRule,
  onDeleteRule,
  canEdit,
}) {
  const [{ isOver }, drop] = useDrop({
    accept: ITEM_TYPE,
    drop: (item) => {
      const movedRule = rules[item.index];

      // If rule is being dropped from another lane, update severity
      if (movedRule && movedRule.severity !== laneKey) {
        onUpdateRule(movedRule.id, { severity: laneKey });
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  return (
    <div
      ref={drop}
      style={{
        borderRadius: 20,
        padding: 16,
        border: `1px solid ${color}`,
        background: isOver
          ? `linear-gradient(180deg, ${color}, rgba(15,23,42,0.95))`
          : "rgba(15,23,42,0.95)",
        boxShadow: isOver
          ? `0 0 24px ${color}`
          : "0 0 18px rgba(0,0,0,0.4)",
        minHeight: 420,
        display: "flex",
        flexDirection: "column",
        transition: "0.2s ease",
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          marginBottom: 8,
          color: color.replace("0.35", "1"),
        }}
      >
        {label}
      </div>

      <div style={{ flex: 1 }}>
        {rules.length === 0 ? (
          <div
            style={{
              color: "#6b7280",
              fontSize: 12,
              padding: 8,
              opacity: 0.6,
            }}
          >
            Drag rules here
          </div>
        ) : (
          rules.map((rule, index) => (
            <RuleRow
              key={rule.id}
              index={index}
              rule={rule}
              laneKey={laneKey}
              moveRule={onMoveRule}
              canEdit={canEdit}
              onUpdate={(patch) => onUpdateRule(rule.id, patch)}
              onDelete={() => onDeleteRule(rule.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ==========================================================
// DRAGGABLE ROW WRAPPER
// ==========================================================
function RuleRow({
  rule,
  index,
  laneKey,
  moveRule,
  onUpdate,
  onDelete,
  canEdit,
}) {
  const ref = useRef(null);

  const [, drop] = useDrop({
    accept: ITEM_TYPE,
    hover(item) {
      if (!ref.current) return;

      const dragIndex = item.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) return;

      moveRule(dragIndex, hoverIndex, laneKey);
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: ITEM_TYPE,
    item: { index, laneKey },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  drag(drop(ref));

  return (
    <div
      ref={ref}
      style={{
        opacity: isDragging ? 0.6 : 1,
        transform: isDragging ? "scale(0.995)" : "scale(1)",
        transition: "transform 0.12s ease, opacity 0.12s ease",
      }}
    >
      <RuleCard
        rule={rule}
        onUpdate={onUpdate}
        onDelete={onDelete}
        canEdit={canEdit}
      />
    </div>
  );
}

// ==========================================================
// RULE CARD UI
// ==========================================================
function RuleCard({ rule, onUpdate, onDelete, canEdit }) {
  const sevColor =
    SEVERITY_COLORS[rule.severity] || SEVERITY_COLORS.medium;

  return (
    <div
      className="tactical-card"
      style={{
        position: "relative",
        borderRadius: 16,
        padding: 10,
        marginBottom: 8,
        background:
          "linear-gradient(145deg,rgba(15,23,42,0.98),rgba(15,23,42,0.94))",
        border: "1px solid rgba(71,85,105,0.9)",
        boxShadow:
          "0 0 18px rgba(15,23,42,0.9), inset 0 0 12px rgba(15,23,42,0.9)",
        cursor: canEdit ? "grab" : "default",
        userSelect: "none",
      }}
    >
      {/* DRAG HANDLE */}
      <div
        style={{
          position: "absolute",
          top: 8,
          right: 10,
          width: 14,
          height: 18,
          opacity: 0.45,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <span style={dragDotStyle} />
        <span style={dragDotStyle} />
        <span style={dragDotStyle} />
      </div>

      {/* FIELD + OPERATOR */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 8,
          paddingRight: 18,
        }}
      >
        {/* FIELD SELECTOR */}
        <select
          value={rule.field_key || FIELD_OPTIONS[0].key}
          onChange={(e) => onUpdate({ field_key: e.target.value })}
          disabled={!canEdit}
          style={selectStyle}
        >
          {FIELD_OPTIONS.map((f) => (
            <option key={f.key} value={f.key}>
              {f.label}
            </option>
          ))}
        </select>

        {/* OPERATOR SELECTOR */}
        <select
          value={rule.operator || "equals"}
          onChange={(e) => onUpdate({ operator: e.target.value })}
          disabled={!canEdit}
          style={{
            ...selectStyle,
            width: 150,
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
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <input
          value={rule.expected_value || ""}
          onChange={(e) => onUpdate({ expected_value: e.target.value })}
          disabled={!canEdit}
          placeholder="Expected value…"
          style={inputStyle}
        />

        <select
          value={rule.severity || "medium"}
          onChange={(e) => onUpdate({ severity: e.target.value })}
          disabled={!canEdit}
          style={{
            ...selectStyle,
            width: 130,
            border: `1px solid ${sevColor}`,
            color: sevColor,
            fontWeight: 600,
            textTransform: "capitalize",
          }}
        >
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* REQUIREMENT TEXT */}
      <input
        value={rule.requirement_text || ""}
        onChange={(e) => onUpdate({ requirement_text: e.target.value })}
        disabled={!canEdit}
        placeholder="Plain language requirement…"
        style={{
          width: "100%",
          borderRadius: 10,
          padding: "6px 8px",
          border: "1px solid rgba(55,65,81,0.9)",
          background: "rgba(15,23,42,0.96)",
          color: "#e5e7eb",
          fontSize: 12,
          marginBottom: 6,
        }}
      />

      {/* FOOTER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 11,
          color: "#9ca3af",
        }}
      >
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
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
            padding: "4px 8px",
            borderRadius: 999,
            border: "1px solid rgba(248,113,113,0.85)",
            background: "rgba(127,29,29,0.85)",
            color: "#fecaca",
            fontSize: 11,
            cursor: !canEdit ? "not-allowed" : "pointer",
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

// Shared style objects for RuleCard
const selectStyle = {
  flex: 1,
  borderRadius: 10,
  padding: "6px 8px",
  border: "1px solid rgba(55,65,81,0.9)",
  background: "rgba(15,23,42,0.96)",
  color: "#e5e7eb",
  fontSize: 12,
};

const inputStyle = {
  flex: 1,
  borderRadius: 10,
  padding: "6px 8px",
  border: "1px solid rgba(55,65,81,0.9)",
  background: "rgba(15,23,42,0.96)",
  color: "#e5e7eb",
  fontSize: 12,
};

const dragDotStyle = {
  display: "block",
  width: "100%",
  height: 2,
  background: "rgba(148,163,184,0.9)",
  borderRadius: 999,
};

// ==========================================================
// HELPERS
// ==========================================================
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
