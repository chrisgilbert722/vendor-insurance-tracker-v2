// pages/admin/requirements-v5.js
// ==========================================================
// PHASE 5 — V5 ENGINE
// Cinematic Lanes + DnD + CRUD + Engine
// + AI Suggest • AI Builder V2 • AI Explain Rule • Conflict AI
// ==========================================================

// ----------------------------
// IMPORTS
// ----------------------------
import { useEffect, useState, useMemo, useRef } from "react";
import { useRole } from "../../lib/useRole";
import { useOrg } from "../../context/OrgContext";
import ToastV2 from "../../components/ToastV2";

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

// ==========================================================
// MAIN COMPONENT
// ==========================================================
export default function RequirementsV5Page() {
  const { isAdmin, isManager } = useRole();
  const { activeOrgId: orgId, loadingOrgs } = useOrg();
  const canEdit = isAdmin || isManager;

  // ----------------------------
  // BASE STATE
  // ----------------------------
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

  // SAMPLE POLICY TEXT INPUT
  const [samplePolicyText, setSamplePolicyText] = useState(`{
  "policy.coverage_type": "General Liability",
  "policy.glEachOccurrence": 1000000,
  "policy.glAggregate": 2000000,
  "policy.expiration_date": "2025-12-31",
  "policy.carrier": "Sample Carrier"
}`);

  // SAMPLE POLICY RESULTS
  const [evaluation, setEvaluation] = useState({
    ok: false,
    error: "",
    results: {},
  });

  // ENGINE STATE
  const [runningEngine, setRunningEngine] = useState(false);
  const [engineLog, setEngineLog] = useState([]);
  const [lastRunAt, setLastRunAt] = useState(null);

  // AI SUGGESTION MODAL
  const [aiOpen, setAiOpen] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState("");

  // AI BUILDER (TEXT → RULES)
  const [aiInput, setAiInput] = useState("");

  // AI EXPLAIN RULE
  const [explainOpen, setExplainOpen] = useState(false);
  const [explainLoading, setExplainLoading] = useState(false);
  const [explainText, setExplainText] = useState("");
  const [explainRule, setExplainRule] = useState(null);

  // AI CONFLICT DETECTION
  const [conflicts, setConflicts] = useState([]);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [conflictLoading, setConflictLoading] = useState(false);

  // WHAT GROUP IS SELECTED
  const activeGroup = useMemo(
    () => groups.find((g) => g.id === activeGroupId) || null,
    [groups, activeGroupId]
  );

  // INLINE RULE-ID HIGHLIGHTER FOR CONFLICTS
  const conflictedRuleIds = useMemo(
    () => getConflictedRuleIds(conflicts),
    [conflicts]
  );
  // ==========================================================
  // LOAD GROUPS WHEN ORG CHANGES
  // ==========================================================
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

      if (!res.ok || !json.ok) throw new Error(json.error);

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

  // ==========================================================
  // LOAD RULES FOR GIVEN GROUP
  // ==========================================================
  async function loadRulesForGroup(groupId) {
    if (!groupId) return setRules([]);

    try {
      const res = await fetch(`/api/requirements-v2/rules?groupId=${groupId}`);
      const json = await res.json();

      if (!res.ok || !json.ok) throw new Error(json.error);

      setRules(json.rules || []);
    } catch (err) {
      setError(err.message || "Failed to load rules.");
    }
  }

  // ==========================================================
  // GROUP CRUD
  // ==========================================================
  async function handleCreateGroup() {
    if (!canEdit) {
      return setToast({
        open: true,
        type: "error",
        message: "You do not have permission to create groups.",
      });
    }

    if (!orgId) {
      return setToast({
        open: true,
        type: "error",
        message: "Missing orgId — cannot create group.",
      });
    }

    const name = prompt("New group name:");
    if (!name) return;

    try {
      setSaving(true);

      const url = `/api/requirements-v2/groups?orgId=${orgId}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Group creation failed");
      }

      setGroups((prev) => [json.group, ...prev]);
      setActiveGroupId(json.group.id);

      setToast({
        open: true,
        type: "success",
        message: "Group created successfully!",
      });
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
    if (!confirm("Delete this group and all its rules?")) return;

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

  // ==========================================================
  // RULE CRUD
  // ==========================================================
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

    setRules((prev) => prev.map((r) => (r.id === ruleId ? updated : r)));

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
  // DRAG & DROP: MOVE + REORDER WITHIN LANE
  // ==========================================================
  function handleMoveRule(dragIndex, hoverIndex, laneKey) {
    setRules((prev) => {
      const sameLane = prev.filter((r) => r.severity === laneKey);
      const other = prev.filter((r) => r.severity !== laneKey);

      const updated = [...sameLane];
      const [removed] = updated.splice(dragIndex, 1);
      updated.splice(hoverIndex, 0, removed);

      return [...other, ...updated];
    });
  }

  // ==========================================================
  // ENGINE RUN
  // ==========================================================
  async function handleRunEngine() {
    try {
      setRunningEngine(true);

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

  // ==========================================================
  // SAMPLE POLICY EVALUATOR
  // ==========================================================
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
  // AI RULE SUGGESTION
  // ==========================================================
  function handleOpenAiSuggest() {
    if (!activeGroup) {
      setToast({
        open: true,
        type: "error",
        message: "Select a group first to suggest a rule.",
      });
      return;
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
            groupId: activeGroup.id,
            field_key: "policy.glEachOccurrence",
            operator: "gte",
            expected_value: 1000000,
            severity: "critical",
            requirement_text: aiText,
          }),
        });

        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error);

        setRules((prev) => [...prev, json.rule]);
        setToast({
          open: true,
          type: "success",
          message: "AI-suggested rule created.",
        });
      } catch (err) {
        setToast({ open: true, type: "error", message: err.message });
      } finally {
        setSaving(false);
        setAiOpen(false);
      }
    })();
  }

  // ==========================================================
  // EXPLAIN RULE HANDLER
  // ==========================================================
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

      if (!json.ok) {
        throw new Error(json.error || "Failed to explain rule.");
      }

      setExplainText(json.explanation || "");
    } catch (err) {
      setExplainText(
        "Sorry, AI could not explain this rule.\n\n" +
          (err.message || "Unknown error.")
      );
    } finally {
      setExplainLoading(false);
    }
  }

  // ==========================================================
  // CONFLICT AI HANDLER — UPDATED TO USE /api/requirements-v5/conflicts
  // ==========================================================
  async function handleScanConflicts() {
    if (!orgId) {
      setToast({
        open: true,
        type: "error",
        message: "No active org selected — cannot scan conflicts.",
      });
      return;
    }

    try {
      setConflictLoading(true);
      setConflictOpen(true);
      setConflicts([]);

      const res = await fetch(
        `/api/requirements-v5/conflicts?orgId=${orgId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      const json = await res.json(); // Always JSON with our API

      if (!json.ok) {
        throw new Error(json.error || "Conflict scan failed.");
      }

      // Use logicConflicts from API as conflicts array
      setConflicts(json.logicConflicts || json.conflicts || []);

      setToast({
        open: true,
        type: "success",
        message: "AI conflict scan completed.",
      });
    } catch (err) {
      setToast({
        open: true,
        type: "error",
        message: err.message || "Conflict scan failed.",
      });
    } finally {
      setConflictLoading(false);
    }
  }

  // ==========================================================
  // AI BUILDER — TEXT → GROUPS/RULES
  // ==========================================================
  async function handleAiBuildRules() {
    if (!aiInput.trim()) {
      return setToast({
        open: true,
        type: "error",
        message: "Please enter some text for AI to parse.",
      });
    }

    if (!orgId) {
      return setToast({
        open: true,
        type: "error",
        message: "Missing orgId — cannot build rules.",
      });
    }

    try {
      setSaving(true);

      const res = await fetch("/api/requirements-v3/ai-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: aiInput }),
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "AI parsing failed.");
      }

      if (!json.groups || !Array.isArray(json.groups)) {
        throw new Error("AI did not return any groups.");
      }

      for (const g of json.groups) {
        const grpRes = await fetch(
          `/api/requirements-v2/groups?orgId=${orgId}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: g.name }),
          }
        );

        const grpJson = await grpRes.json();
        if (!grpRes.ok || !grpJson.ok) continue;

        const groupId = grpJson.group.id;

        for (const r of g.rules || []) {
          await fetch("/api/requirements-v2/rules", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              groupId,
              field_key: r.field_key,
              operator: r.operator,
              expected_value: r.expected_value,
              severity: r.severity || "medium",
              requirement_text: r.requirement_text || "",
            }),
          });
        }
      }

      await loadGroups();
      setAiInput("");

      setToast({
        open: true,
        type: "success",
        message: "AI successfully generated rules.",
      });
    } catch (err) {
      setToast({
        open: true,
        type: "error",
        message: err.message || "AI build failed.",
      });
    } finally {
      setSaving(false);
    }
  }
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
                      ? "rgba(248,113,113,0.35)"
                      : laneKey === "required"
                      ? "rgba(59,130,246,0.35)"
                      : "rgba(168,85,247,0.35)";

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
                      onUpdateRule={handleUpdateRule}
                      onDeleteRule={handleDeleteRule}
                      onExplain={handleExplainRule}
                      canEdit={canEdit}
                    />
                  );
                })}
              </div>
            </DndProvider>
          </div>
          {/* RIGHT PANEL — ENGINE + EVAL + AI SUGGEST + CONFLICT AI */}
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

              {/* ENGINE RUN BUTTON */}
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
                        border:
                          "2px solid rgba(187,247,208,0.9)",
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

              {/* PHASE 5 — CONFLICT AI BUTTON */}
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
                        border:
                          "2px solid rgba(254,202,202,0.9)",
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

              {/* RULE PREVIEW LIST */}
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
                        borderBottom:
                          "1px solid rgba(31,41,55,0.8)",
                      }}
                    >
                      IF{" "}
                      <span style={{ color: "#93c5fd" }}>
                        {r.field_key}
                      </span>{" "}
                      {operatorLabel(r.operator)}{" "}
                      <span style={{ color: "#a5b4fc" }}>
                        {r.expected_value}
                      </span>{" "}
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
                    Add rules in the lanes to preview logic.
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
                    <span style={{ color: "#e5e7eb" }}>
                      Run engine now
                    </span>{" "}
                    to evaluate all vendors.
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
                        ❤️
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
                            {new Date(
                              entry.at
                            ).toLocaleTimeString()}
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
                  Sample evaluation complete (
                  {Object.keys(evaluation.results).length} rules scanned).
                </div>
              )}
            </div>

            {/* AI SUGGESTION BUTTON */}
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
          {/* HEADER */}
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

          {/* CONTENT */}
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

      {/* ======================================================= */}
      {/* 🎯 CONFLICT DRAWER (AI DETECTED COVERAGE CONFLICTS)    */}
      {/* ======================================================= */}
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
          {/* HEADER */}
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
              Conflict Analysis (AI)
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

          {/* LOADING */}
          {conflictLoading && (
            <div style={{ color: "#cbd5f5", fontSize: 13 }}>
              AI is analyzing all rules for conflicts…
            </div>
          )}

          {/* NO CONFLICTS */}
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

          {/* CONFLICT LIST */}
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

                {/* SUMMARY */}
                <div
                  style={{
                    color: "#e5e7eb",
                    fontSize: 13,
                    marginBottom: 6,
                  }}
                >
                  {c.summary}
                </div>

                {/* SUGGESTION */}
                {c.suggestion && (
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
                )}
              </div>
            ))}
        </div>
      )}
// ==========================================================
// SHARED STYLE OBJECTS
// ==========================================================
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
// HELPERS — OPERATOR LABEL
// ==========================================================
function operatorLabel(op) {
  const found = OPERATOR_OPTIONS.find((o) => o.key === op);
  return found ? found.label : op;
}

// ==========================================================
// HELPERS — CONFLICT RULE ID MAP
// ==========================================================
function getConflictedRuleIds(conflicts) {
  const ids = new Set();

  for (const c of conflicts || []) {
    if (Array.isArray(c.rules)) {
      c.rules.forEach((id) => ids.add(id));
    }
  }

  // Expose to window for inline conflict indicators
  if (typeof window !== "undefined") {
    window.__CONFLICTED_RULE_IDS = ids;
  }

  return ids;
}

// ==========================================================
// HELPERS — RULE EVALUATION LOGIC
// ==========================================================
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
      return String(rawVal ?? "")
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
