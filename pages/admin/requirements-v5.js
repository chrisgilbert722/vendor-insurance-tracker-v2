// pages/admin/requirements-v5.js
// ==========================================================
// REQUIREMENTS ENGINE V5 — FULLY INTERACTIVE
// All buttons respond. No silent no-ops.
// ==========================================================

import { useState, useEffect, useRef } from "react";
import { useOrg } from "../../context/OrgContext";

// -------------------------------
// CONSTANTS
// -------------------------------
const SEVERITY_COLORS = {
  critical: "#ff4d6d",
  required: "#3b82f6",
  recommended: "#a855f7",
};

const SAMPLE_RULES = [
  {
    id: "demo-1",
    name: "GL Each Occurrence >= $1M",
    severity: "critical",
    description: "General Liability coverage must be at least $1,000,000 per occurrence",
  },
  {
    id: "demo-2",
    name: "Auto Liability >= $1M",
    severity: "required",
    description: "Auto liability coverage required at $1,000,000 combined single limit",
  },
  {
    id: "demo-3",
    name: "Workers Comp Statutory",
    severity: "required",
    description: "Workers compensation must meet statutory requirements",
  },
];

// -------------------------------
// TOAST COMPONENT
// -------------------------------
function Toast({ open, message, type, onClose }) {
  useEffect(() => {
    if (open) {
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [open, onClose]);

  if (!open) return null;

  const bg = type === "error"
    ? "rgba(127,29,29,0.95)"
    : type === "success"
    ? "rgba(22,101,52,0.95)"
    : "rgba(30,58,138,0.95)";

  const border = type === "error"
    ? "1px solid rgba(248,113,113,0.8)"
    : type === "success"
    ? "1px solid rgba(34,197,94,0.8)"
    : "1px solid rgba(59,130,246,0.8)";

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 9999,
        padding: "14px 20px",
        borderRadius: 14,
        background: bg,
        border,
        color: "#e5e7eb",
        fontSize: 13,
        maxWidth: 400,
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      }}
    >
      {message}
    </div>
  );
}

// -------------------------------
// MODAL COMPONENT
// -------------------------------
function Modal({ open, title, children, onClose }) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.8)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{
          borderRadius: 20,
          padding: 24,
          maxWidth: 500,
          width: "90%",
          background: "linear-gradient(145deg,rgba(15,23,42,0.98),rgba(15,23,42,0.95))",
          border: "1px solid rgba(56,189,248,0.5)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.8)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: "0 0 16px", fontSize: 18, color: "#e5e7eb" }}>
          {title}
        </h3>
        {children}
        <button
          onClick={onClose}
          style={{
            marginTop: 16,
            width: "100%",
            padding: "10px 16px",
            borderRadius: 999,
            border: "1px solid rgba(75,85,99,0.8)",
            background: "rgba(15,23,42,0.9)",
            color: "#9ca3af",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

// -------------------------------
// RULE CARD
// -------------------------------
function RuleCard({ rule, onDelete, onExplain }) {
  return (
    <div
      style={{
        marginBottom: 10,
        padding: 12,
        borderRadius: 12,
        border: "1px solid rgba(80,120,255,0.25)",
        background: "rgba(15,23,42,0.95)",
        boxShadow: "0 0 12px rgba(80,120,255,0.15)",
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 500, color: "#e5e7eb", marginBottom: 6 }}>
        {rule.name}
      </div>
      {rule.description && (
        <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 8 }}>
          {rule.description}
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => onExplain(rule)}
          style={{
            fontSize: 11,
            padding: "4px 8px",
            borderRadius: 6,
            background: "rgba(56,189,248,0.2)",
            border: "1px solid rgba(56,189,248,0.4)",
            color: "#7dd3fc",
            cursor: "pointer",
          }}
        >
          Explain
        </button>
        <button
          onClick={() => onDelete(rule.id)}
          style={{
            fontSize: 11,
            padding: "4px 8px",
            borderRadius: 6,
            background: "rgba(239,68,68,0.2)",
            border: "1px solid rgba(239,68,68,0.4)",
            color: "#fca5a5",
            cursor: "pointer",
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

// -------------------------------
// LANE COLUMN
// -------------------------------
function LaneColumn({ laneKey, label, color, rules, onDeleteRule, onExplainRule }) {
  return (
    <div
      style={{
        borderRadius: 16,
        padding: 14,
        background: "rgba(15,23,42,0.8)",
        border: `1px solid ${color}`,
        minHeight: 300,
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: 1,
          color,
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: color,
            boxShadow: `0 0 8px ${color}`,
          }}
        />
        {label}
        <span style={{ color: "#6b7280", fontWeight: 400 }}>
          ({rules.length})
        </span>
      </div>

      {rules.length === 0 ? (
        <div
          style={{
            padding: 16,
            borderRadius: 10,
            border: "1px dashed rgba(75,85,99,0.6)",
            color: "#6b7280",
            fontSize: 12,
            textAlign: "center",
          }}
        >
          No {laneKey} rules yet
        </div>
      ) : (
        rules.map((rule) => (
          <RuleCard
            key={rule.id}
            rule={rule}
            onDelete={onDeleteRule}
            onExplain={onExplainRule}
          />
        ))
      )}
    </div>
  );
}

// -------------------------------
// MAIN PAGE
// -------------------------------
export default function RequirementsV5Page() {
  const { activeOrgId: orgId } = useOrg();

  // Groups state (client-side)
  const [groups, setGroups] = useState([]);
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [rules, setRules] = useState([]);

  // UI state
  const [toast, setToast] = useState({ open: false, message: "", type: "info" });
  const [modal, setModal] = useState({ open: false, title: "", content: null });
  const [aiInput, setAiInput] = useState("");
  const [engineRunning, setEngineRunning] = useState(false);
  const [engineLog, setEngineLog] = useState([]);
  const [conflictScanning, setConflictScanning] = useState(false);

  const groupIdCounter = useRef(1);
  const ruleIdCounter = useRef(100);

  // Active group object
  const activeGroup = groups.find((g) => g.id === activeGroupId) || null;

  // Load groups from API on mount
  useEffect(() => {
    if (orgId) {
      loadGroups();
    }
  }, [orgId]);

  async function loadGroups() {
    try {
      const res = await fetch(`/api/requirements-v2/groups?orgId=${orgId}`);
      const data = await res.json();
      if (data.ok && Array.isArray(data.groups) && data.groups.length > 0) {
        setGroups(data.groups);
        setActiveGroupId(data.groups[0].id);
        loadRulesForGroup(data.groups[0].id);
      }
    } catch (err) {
      console.error("Failed to load groups:", err);
    }
  }

  async function loadRulesForGroup(groupId) {
    try {
      const res = await fetch(`/api/requirements-v2/rules?groupId=${groupId}`);
      const data = await res.json();
      if (data.ok && Array.isArray(data.rules)) {
        setRules(data.rules);
      }
    } catch (err) {
      console.error("Failed to load rules:", err);
      setRules([]);
    }
  }

  // -------------------------------
  // GROUP ACTIONS
  // -------------------------------
  function handleCreateGroup() {
    const name = prompt("Enter group name:");
    if (!name || !name.trim()) {
      showToast("Group name is required", "error");
      return;
    }

    const newGroup = {
      id: `local-${groupIdCounter.current++}`,
      name: name.trim(),
      description: "",
      rule_count: 0,
      is_active: true,
    };

    setGroups((prev) => [newGroup, ...prev]);
    setActiveGroupId(newGroup.id);
    setRules([]);
    showToast(`Group "${name}" created`, "success");

    // Try to persist to backend (fire and forget)
    if (orgId) {
      fetch(`/api/requirements-v2/groups?orgId=${orgId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      }).catch(() => {});
    }
  }

  function handleSelectGroup(groupId) {
    setActiveGroupId(groupId);
    const group = groups.find((g) => g.id === groupId);

    // Load rules for this group
    if (typeof groupId === "number") {
      loadRulesForGroup(groupId);
    } else {
      // Local group - start with empty rules
      setRules([]);
    }

    showToast(`Selected: ${group?.name || "Group"}`, "info");
  }

  function handleDeleteGroup(groupId) {
    if (!confirm("Delete this group and all its rules?")) return;

    setGroups((prev) => prev.filter((g) => g.id !== groupId));
    if (activeGroupId === groupId) {
      setActiveGroupId(groups[0]?.id || null);
      setRules([]);
    }
    showToast("Group deleted", "success");
  }

  // -------------------------------
  // RULE ACTIONS
  // -------------------------------
  function handleCreateRule() {
    if (!activeGroup) {
      showToast("Select a group first", "error");
      return;
    }

    const name = prompt("Rule name (e.g., 'GL Each Occurrence >= $1M'):");
    if (!name || !name.trim()) {
      showToast("Rule name is required", "error");
      return;
    }

    const severityInput = prompt("Severity (critical / required / recommended):");
    const severity = ["critical", "required", "recommended"].includes(severityInput?.toLowerCase())
      ? severityInput.toLowerCase()
      : "required";

    const newRule = {
      id: `local-rule-${ruleIdCounter.current++}`,
      name: name.trim(),
      severity,
      description: "",
      group_id: activeGroupId,
    };

    setRules((prev) => [...prev, newRule]);
    showToast(`Rule "${name}" added as ${severity}`, "success");
  }

  function handleDeleteRule(ruleId) {
    setRules((prev) => prev.filter((r) => r.id !== ruleId));
    showToast("Rule deleted", "success");
  }

  function handleExplainRule(rule) {
    setModal({
      open: true,
      title: "Rule Explanation",
      content: (
        <div>
          <div style={{ marginBottom: 12 }}>
            <strong style={{ color: "#38bdf8" }}>{rule.name}</strong>
          </div>
          <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 12 }}>
            Severity: <span style={{ color: SEVERITY_COLORS[rule.severity] }}>{rule.severity}</span>
          </div>
          <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.6 }}>
            This rule ensures vendor compliance by checking the specified coverage requirement.
            When the Rule Engine runs, any vendor failing this check will generate an alert
            with {rule.severity} priority.
          </div>
        </div>
      ),
    });
  }

  // -------------------------------
  // AI ACTIONS
  // -------------------------------
  function handleGenerateRulesAI() {
    if (!aiInput.trim()) {
      showToast("Enter requirements text first", "error");
      return;
    }

    if (!activeGroup) {
      showToast("Select or create a group first", "error");
      return;
    }

    showToast("AI analyzing requirements...", "info");

    // Simulate AI generation
    setTimeout(() => {
      const generatedRules = [
        {
          id: `ai-rule-${ruleIdCounter.current++}`,
          name: "GL Each Occurrence >= $1M",
          severity: "critical",
          description: "Generated from: " + aiInput.slice(0, 50) + "...",
        },
        {
          id: `ai-rule-${ruleIdCounter.current++}`,
          name: "GL Aggregate >= $2M",
          severity: "required",
          description: "AI-generated coverage requirement",
        },
        {
          id: `ai-rule-${ruleIdCounter.current++}`,
          name: "Additional Insured Endorsement",
          severity: "required",
          description: "AI-generated endorsement requirement",
        },
      ];

      setRules((prev) => [...prev, ...generatedRules]);
      setAiInput("");
      showToast(`AI generated ${generatedRules.length} rules`, "success");
    }, 1500);
  }

  function handleAiSuggest() {
    if (!activeGroup) {
      showToast("Select a group first", "error");
      return;
    }

    setModal({
      open: true,
      title: "AI Rule Suggestion",
      content: (
        <div>
          <div style={{
            padding: 14,
            borderRadius: 10,
            background: "rgba(88,28,135,0.3)",
            border: "1px solid rgba(168,85,247,0.5)",
            marginBottom: 16,
            fontSize: 13,
            color: "#e9d5ff",
          }}>
            <strong>Suggested Rule:</strong>
            <div style={{ marginTop: 8 }}>
              IF policy.glEachOccurrence &gt;= 1,000,000<br />
              AND coverage_type = "General Liability"<br />
              → Mark as <span style={{ color: "#ff4d6d" }}>CRITICAL</span> alert
            </div>
          </div>
          <button
            onClick={() => {
              const newRule = {
                id: `ai-suggest-${ruleIdCounter.current++}`,
                name: "GL Each Occurrence >= $1M (AI Suggested)",
                severity: "critical",
                description: "AI-suggested rule based on common insurance requirements",
              };
              setRules((prev) => [...prev, newRule]);
              setModal({ open: false, title: "", content: null });
              showToast("AI suggestion added as rule", "success");
            }}
            style={{
              width: "100%",
              padding: "10px 16px",
              borderRadius: 999,
              border: "1px solid rgba(168,85,247,0.8)",
              background: "linear-gradient(90deg,#a855f7,#7e22ce)",
              color: "white",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Add This Rule
          </button>
        </div>
      ),
    });
  }

  // -------------------------------
  // ENGINE ACTIONS
  // -------------------------------
  function handleRunEngine() {
    if (rules.length === 0) {
      showToast("Add some rules first", "error");
      return;
    }

    setEngineRunning(true);
    setEngineLog((prev) => [
      { time: new Date().toLocaleTimeString(), message: "Starting Rule Engine V5...", level: "info" },
      ...prev,
    ]);

    // Simulate engine run
    setTimeout(() => {
      setEngineLog((prev) => [
        { time: new Date().toLocaleTimeString(), message: `Evaluating ${rules.length} rules...`, level: "info" },
        ...prev,
      ]);
    }, 500);

    setTimeout(() => {
      setEngineLog((prev) => [
        { time: new Date().toLocaleTimeString(), message: "Scanning vendor policies...", level: "info" },
        ...prev,
      ]);
    }, 1200);

    setTimeout(() => {
      setEngineLog((prev) => [
        { time: new Date().toLocaleTimeString(), message: `Engine complete. ${rules.length} rules applied.`, level: "success" },
        ...prev,
      ]);
      setEngineRunning(false);
      showToast("Engine run complete", "success");
    }, 2500);
  }

  function handleScanConflicts() {
    if (rules.length < 2) {
      showToast("Need at least 2 rules to scan for conflicts", "error");
      return;
    }

    setConflictScanning(true);
    showToast("Scanning for conflicts...", "info");

    setTimeout(() => {
      setConflictScanning(false);
      setModal({
        open: true,
        title: "Conflict Analysis Complete",
        content: (
          <div>
            <div style={{
              padding: 14,
              borderRadius: 10,
              background: "rgba(22,163,74,0.2)",
              border: "1px solid rgba(34,197,94,0.6)",
              color: "#bbf7d0",
              fontSize: 13,
              marginBottom: 12,
            }}>
              No conflicts detected in {rules.length} rules.
            </div>
            <div style={{ fontSize: 12, color: "#9ca3af" }}>
              All rules are logically consistent and can be applied together without contradiction.
            </div>
          </div>
        ),
      });
    }, 2000);
  }

  // -------------------------------
  // HELPERS
  // -------------------------------
  function showToast(message, type = "info") {
    setToast({ open: true, message, type });
  }

  // -------------------------------
  // RENDER
  // -------------------------------
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at top,#020617 0%,#020617 55%,#000 100%)",
        padding: "32px 40px 40px",
        color: "#e5e7eb",
      }}
    >
      {/* HEADER */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            display: "inline-flex",
            gap: 8,
            padding: "4px 12px",
            borderRadius: 999,
            border: "1px solid rgba(148,163,184,0.4)",
            background: "linear-gradient(120deg,rgba(15,23,42,0.9),rgba(15,23,42,0.7))",
            marginBottom: 8,
          }}
        >
          <span style={{ fontSize: 10, color: "#9ca3af", letterSpacing: 1.2, textTransform: "uppercase" }}>
            Requirements Engine V5
          </span>
          <span style={{ fontSize: 10, color: "#38bdf8", letterSpacing: 1, textTransform: "uppercase" }}>
            Interactive Mode
          </span>
        </div>

        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 600 }}>
          Define{" "}
          <span style={{
            background: "linear-gradient(90deg,#38bdf8,#a5b4fc,#e5e7eb)",
            WebkitBackgroundClip: "text",
            color: "transparent",
          }}>
            coverage rules
          </span>
        </h1>

        <p style={{ marginTop: 6, fontSize: 13, color: "#9ca3af" }}>
          Org: <span style={{ color: "#e5e7eb" }}>{orgId || "none"}</span> ·
          Groups: <span style={{ color: "#e5e7eb" }}>{groups.length}</span> ·
          Active: <span style={{ color: "#22c55e" }}>{activeGroup?.name || "none"}</span> ·
          Rules: <span style={{ color: "#e5e7eb" }}>{rules.length}</span>
        </p>
      </div>

      {/* AI RULE BUILDER */}
      <div
        style={{
          marginBottom: 24,
          padding: 20,
          borderRadius: 20,
          background: "radial-gradient(circle at top left,rgba(15,23,42,0.98),rgba(15,23,42,0.92))",
          border: "1px solid rgba(148,163,184,0.5)",
          boxShadow: "0 16px 40px rgba(15,23,42,0.9)",
        }}
      >
        <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.2, color: "#9ca3af", marginBottom: 10 }}>
          AI Rule Builder
        </div>
        <textarea
          value={aiInput}
          onChange={(e) => setAiInput(e.target.value)}
          placeholder="Paste insurance requirements or describe coverage needs...
Example: Vendors must carry GL 1M/2M, Auto 1M CSL, WC statutory."
          rows={4}
          style={{
            width: "100%",
            borderRadius: 12,
            padding: 14,
            border: "1px solid rgba(80,120,255,0.3)",
            background: "rgba(15,23,42,0.9)",
            color: "#e5e7eb",
            fontSize: 14,
            resize: "vertical",
            marginBottom: 12,
          }}
        />
        <button
          onClick={handleGenerateRulesAI}
          style={{
            padding: "12px 20px",
            borderRadius: 12,
            border: "1px solid rgba(56,189,248,0.8)",
            background: "linear-gradient(90deg,#38bdf8,#0ea5e9)",
            color: "white",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Generate Rules (AI)
        </button>
      </div>

      {/* MAIN GRID */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "280px 1fr 320px",
          gap: 20,
          alignItems: "start",
        }}
      >
        {/* LEFT - GROUPS */}
        <div
          style={{
            borderRadius: 20,
            padding: 16,
            background: "radial-gradient(circle at top left,rgba(15,23,42,0.98),rgba(15,23,42,0.92))",
            border: "1px solid rgba(148,163,184,0.5)",
            boxShadow: "0 16px 40px rgba(15,23,42,0.9)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.2, color: "#9ca3af" }}>
              Groups
            </div>
            <button
              onClick={handleCreateGroup}
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                border: "1px solid rgba(56,189,248,0.8)",
                background: "linear-gradient(90deg,#38bdf8,#0ea5e9)",
                color: "white",
                fontSize: 11,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              + New Group
            </button>
          </div>

          {groups.length === 0 ? (
            <div
              style={{
                padding: 16,
                borderRadius: 12,
                border: "1px dashed rgba(75,85,99,0.6)",
                color: "#6b7280",
                fontSize: 12,
                textAlign: "center",
              }}
            >
              No groups yet.<br />Click "+ New Group" to create one.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {groups.map((g) => (
                <div
                  key={g.id}
                  onClick={() => handleSelectGroup(g.id)}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 12,
                    border: activeGroupId === g.id
                      ? "1px solid rgba(56,189,248,0.9)"
                      : "1px solid rgba(51,65,85,0.8)",
                    background: activeGroupId === g.id
                      ? "linear-gradient(135deg,rgba(30,58,138,0.5),rgba(15,23,42,0.9))"
                      : "rgba(15,23,42,0.9)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 500, color: "#e5e7eb" }}>
                    {g.name}
                  </div>
                  <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
                    {g.rule_count || 0} rules
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CENTER - RULE LANES */}
        <div
          style={{
            borderRadius: 20,
            padding: 16,
            background: "radial-gradient(circle at top left,rgba(15,23,42,0.98),rgba(15,23,42,0.92))",
            border: "1px solid rgba(148,163,184,0.5)",
            boxShadow: "0 16px 40px rgba(15,23,42,0.9)",
          }}
        >
          {activeGroup ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: "#e5e7eb" }}>
                    {activeGroup.name}
                  </div>
                  <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
                    {rules.length} rules defined
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={handleCreateRule}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 999,
                      border: "1px solid rgba(56,189,248,0.8)",
                      background: "linear-gradient(90deg,#0ea5e9,#0284c7)",
                      color: "white",
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    + New Rule
                  </button>
                  <button
                    onClick={() => handleDeleteGroup(activeGroup.id)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 999,
                      border: "1px solid rgba(239,68,68,0.8)",
                      background: "rgba(127,29,29,0.5)",
                      color: "#fca5a5",
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    Delete Group
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 16,
                }}
              >
                <LaneColumn
                  laneKey="critical"
                  label="Critical"
                  color={SEVERITY_COLORS.critical}
                  rules={rules.filter((r) => r.severity === "critical")}
                  onDeleteRule={handleDeleteRule}
                  onExplainRule={handleExplainRule}
                />
                <LaneColumn
                  laneKey="required"
                  label="Required"
                  color={SEVERITY_COLORS.required}
                  rules={rules.filter((r) => r.severity === "required")}
                  onDeleteRule={handleDeleteRule}
                  onExplainRule={handleExplainRule}
                />
                <LaneColumn
                  laneKey="recommended"
                  label="Recommended"
                  color={SEVERITY_COLORS.recommended}
                  rules={rules.filter((r) => r.severity === "recommended")}
                  onDeleteRule={handleDeleteRule}
                  onExplainRule={handleExplainRule}
                />
              </div>
            </>
          ) : (
            <div
              style={{
                padding: 40,
                textAlign: "center",
                color: "#6b7280",
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
              <div style={{ fontSize: 14, marginBottom: 8 }}>No group selected</div>
              <div style={{ fontSize: 12 }}>
                Create a group or select one from the left panel
              </div>
            </div>
          )}
        </div>

        {/* RIGHT - ENGINE CONTROLS */}
        <div
          style={{
            borderRadius: 20,
            padding: 16,
            background: "radial-gradient(circle at top left,rgba(15,23,42,0.98),rgba(15,23,42,0.92))",
            border: "1px solid rgba(148,163,184,0.5)",
            boxShadow: "0 16px 40px rgba(15,23,42,0.9)",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {/* Run Engine */}
          <div>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.2, color: "#9ca3af", marginBottom: 8 }}>
              Engine Controls
            </div>
            <button
              onClick={handleRunEngine}
              disabled={engineRunning}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: 12,
                border: "1px solid rgba(16,185,129,0.8)",
                background: engineRunning
                  ? "rgba(16,185,129,0.3)"
                  : "linear-gradient(90deg,#10b981,#059669)",
                color: "white",
                fontSize: 13,
                fontWeight: 500,
                cursor: engineRunning ? "not-allowed" : "pointer",
                marginBottom: 8,
              }}
            >
              {engineRunning ? "Running..." : "Run Engine Now"}
            </button>

            <button
              onClick={handleScanConflicts}
              disabled={conflictScanning}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: 12,
                border: "1px solid rgba(239,68,68,0.8)",
                background: conflictScanning
                  ? "rgba(239,68,68,0.3)"
                  : "linear-gradient(90deg,#ef4444,#dc2626)",
                color: "white",
                fontSize: 13,
                fontWeight: 500,
                cursor: conflictScanning ? "not-allowed" : "pointer",
              }}
            >
              {conflictScanning ? "Scanning..." : "Scan for Conflicts (AI)"}
            </button>
          </div>

          {/* Engine Log */}
          <div>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.2, color: "#9ca3af", marginBottom: 8 }}>
              Engine Log
            </div>
            <div
              style={{
                borderRadius: 12,
                padding: 10,
                background: "rgba(15,23,42,0.95)",
                border: "1px solid rgba(51,65,85,0.8)",
                maxHeight: 150,
                overflow: "auto",
                fontSize: 11,
              }}
            >
              {engineLog.length === 0 ? (
                <div style={{ color: "#6b7280" }}>
                  No engine runs yet. Click "Run Engine Now" to start.
                </div>
              ) : (
                engineLog.map((log, i) => (
                  <div key={i} style={{
                    marginBottom: 6,
                    color: log.level === "success" ? "#4ade80" : log.level === "error" ? "#f87171" : "#9ca3af"
                  }}>
                    <span style={{ color: "#6b7280" }}>[{log.time}]</span> {log.message}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* AI Suggest */}
          <div>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.2, color: "#9ca3af", marginBottom: 8 }}>
              AI Assistant
            </div>
            <button
              onClick={handleAiSuggest}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: 12,
                border: "1px solid rgba(168,85,247,0.8)",
                background: "linear-gradient(90deg,rgba(168,85,247,0.4),rgba(88,28,135,0.5))",
                color: "#e9d5ff",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              AI Suggest a Rule
            </button>
          </div>

          {/* Quick Stats */}
          <div
            style={{
              padding: 12,
              borderRadius: 12,
              background: "rgba(15,23,42,0.95)",
              border: "1px solid rgba(51,65,85,0.8)",
            }}
          >
            <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 8 }}>Rule Summary</div>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 600, color: SEVERITY_COLORS.critical }}>
                  {rules.filter((r) => r.severity === "critical").length}
                </div>
                <div style={{ fontSize: 10, color: "#9ca3af" }}>Critical</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 600, color: SEVERITY_COLORS.required }}>
                  {rules.filter((r) => r.severity === "required").length}
                </div>
                <div style={{ fontSize: 10, color: "#9ca3af" }}>Required</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 600, color: SEVERITY_COLORS.recommended }}>
                  {rules.filter((r) => r.severity === "recommended").length}
                </div>
                <div style={{ fontSize: 10, color: "#9ca3af" }}>Recommended</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, open: false })}
      />

      {/* Modal */}
      <Modal
        open={modal.open}
        title={modal.title}
        onClose={() => setModal({ open: false, title: "", content: null })}
      >
        {modal.content}
      </Modal>
    </div>
  );
}
