// pages/admin/elite-rules.js
import { useEffect, useMemo, useState, useRef } from "react";
import { useRole } from "../../lib/useRole";
import { useOrg } from "../../context/OrgContext";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import RuleEnginePanel from "../../components/elite/RuleEnginePanel";

/* THEME TOKENS */
const GP = {
  primary: "#0057FF",
  primaryDark: "#003BB3",
  accent1: "#00E0FF",
  accent2: "#8A2BFF",
  red: "#FF3B3B",
  orange: "#FF9800",
  yellow: "#FFC107",
  green: "#00C27A",
  ink: "#0D1623",
  inkSoft: "#64748B",
  surface: "#F7F9FC",
  panel: "#FFFFFF",
  radius: "14px",
  shadow: "0 14px 40px rgba(15,23,42,0.16)",
  text: "#1f2933",
  textLight: "#7b8794",
};

/* DnD TYPE */
const RULE_CARD = "RULE_CARD";

/* SAMPLE GROUPS */
const SAMPLE_GROUPS = [
  {
    id: "general-liability",
    label: "General Liability",
    description: "Bodily injury, property damage, each occurrence limits",
    icon: "⚖️",
  },
  {
    id: "auto",
    label: "Auto Liability",
    description: "Owned / non-owned / hired autos & combined single limits",
    icon: "🚚",
  },
  {
    id: "workers-comp",
    label: "Workers’ Comp",
    description: "Statutory WC + employer liability limits",
    icon: "💼",
  },
  {
    id: "umbrella",
    label: "Umbrella / Excess",
    description: "Follow-form umbrella or excess liability",
    icon: "☂️",
  },
];

/* SAMPLE RULES */
const SAMPLE_RULES = [
  {
    id: "r1",
    groupId: "general-liability",
    name: "GL Each Occurrence ≥ $1M",
    severity: "high",
    description: "Vendor must carry at least $1M per occurrence.",
    logic: "limit_each_occurrence >= 1000000",
    status: "active",
  },
  {
    id: "r2",
    groupId: "general-liability",
    name: "GL Aggregate ≥ $2M",
    severity: "medium",
    description: "Aggregate limit must be ≥ $2M.",
    logic: "general_aggregate >= 2000000",
    status: "active",
  },
  {
    id: "r3",
    groupId: "auto",
    name: "Auto Liability ≥ $1M",
    severity: "high",
    logic: "auto_limit >= 1000000",
    status: "active",
  },
  {
    id: "r4",
    groupId: "workers-comp",
    name: "Workers’ Comp = Statutory",
    severity: "medium",
    logic: "work_comp_limit == 'statutory'",
    status: "active",
  },
  {
    id: "r5",
    groupId: "umbrella",
    name: "Umbrella ≥ $5M",
    severity: "high",
    logic: "umbrella_limit >= 5000000",
    status: "draft",
  },
];

/* DEFAULT SEVERITY WEIGHTS (used by UI) */
const DEFAULT_WEIGHTS = {
  high: 1.0,
  medium: 0.7,
  low: 0.4,
};

/* SEVERITY CHIP */
function severityStyle(level) {
  switch (level) {
    case "high":
      return {
        bg: "rgba(239,68,68,0.08)",
        border: "1px solid rgba(248,113,113,0.8)",
        color: "#B91C1C",
        label: "High",
      };
    case "medium":
      return {
        bg: "rgba(245,158,11,0.08)",
        border: "1px solid rgba(251,191,36,0.8)",
        color: "#92400E",
        label: "Medium",
      };
    default:
      return {
        bg: "rgba(34,197,94,0.08)",
        border: "1px solid rgba(74,222,128,0.8)",
        color: "#166534",
        label: "Low",
      };
  }
}

/* Status pill */
function RuleStatusPill({ status }) {
  const label =
    status === "draft" ? "Draft" : status === "disabled" ? "Disabled" : "Active";
  const bg =
    status === "draft"
      ? "rgba(148,163,184,0.16)"
      : status === "disabled"
      ? "rgba(148,163,184,0.12)"
      : "rgba(34,197,94,0.12)";
  const border =
    status === "draft"
      ? "1px solid rgba(156,163,175,0.5)"
      : status === "disabled"
      ? "1px solid rgba(148,163,184,0.6)"
      : "1px solid rgba(134,239,172,0.8)";
  const color =
    status === "draft"
      ? "#4B5563"
      : status === "disabled"
      ? "#6B7280"
      : "#166534";

  return (
    <span
      style={{
        fontSize: 11,
        padding: "4px 9px",
        borderRadius: 999,
        background: bg,
        border,
        color,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        fontWeight: 600,
      }}
    >
      {label}
    </span>
  );
}

// shared form styles
const labelStyle = {
  fontSize: 12,
  fontWeight: 600,
  color: GP.inkSoft,
  display: "block",
  marginBottom: 4,
};

const inputStyle = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid #E5E7EB",
  fontSize: 13,
  background: "#FFF",
};

/* SIMPLE LOGIC VALIDATION */
function validateRuleLogic(logic) {
  if (!logic || !logic.trim()) return "No logic expression defined.";
  if (!logic.includes(">") && !logic.includes("<") && !logic.includes("==")) {
    return "Logic should usually contain a comparison operator (>=, <=, ==, etc.).";
  }
  // super light touch for now
  return null;
}

/* EDIT RULE MODAL */
function EditRuleModal({ rule, onClose, onSave }) {
  const [name, setName] = useState(rule.name || "");
  const [severity, setSeverity] = useState(rule.severity || "medium");
  const [status, setStatus] = useState(rule.status || "active");
  const [description, setDescription] = useState(rule.description || "");
  const [logic, setLogic] = useState(rule.logic || "");

  function handleSubmit(e) {
    e.preventDefault();
    onSave({
      ...rule,
      name,
      severity,
      status,
      description,
      logic,
    });
  }

  const logicWarning = validateRuleLogic(logic);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.35)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
      }}
    >
      <div
        style={{
          width: 580,
          maxWidth: "95vw",
          borderRadius: 24,
          background: "rgba(248,250,252,0.98)",
          boxShadow: "0 30px 80px rgba(15,23,42,0.45)",
          border: "1px solid rgba(226,232,240,0.9)",
          padding: 24,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 14,
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: GP.inkSoft,
                marginBottom: 4,
              }}
            >
              Edit Rule
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: GP.ink,
              }}
            >
              {rule.name || "Untitled Rule"}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              fontSize: 18,
              cursor: "pointer",
              color: "#6B7280",
            }}
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Name */}
            <div>
              <label style={labelStyle}>Rule name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={inputStyle}
                required
              />
            </div>

            {/* Row: severity + status */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <div>
                <label style={labelStyle}>Severity</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  style={inputStyle}
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  style={inputStyle}
                >
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label style={labelStyle}>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </div>

            {/* Logic */}
            <div>
              <label style={labelStyle}>
                Rule logic (expression evaluated by engine)
              </label>
              <textarea
                value={logic}
                onChange={(e) => setLogic(e.target.value)}
                rows={3}
                style={{
                  ...inputStyle,
                  fontSize: 12,
                  fontFamily:
                    "SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  background: "#020617",
                  color: "#E5E7EB",
                }}
              />
              {logicWarning && (
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 11,
                    color: "#B45309",
                  }}
                >
                  ⚠️ {logicWarning}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              marginTop: 18,
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                border: "1px solid #E5E7EB",
                background: "#FFFFFF",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: "8px 16px",
                borderRadius: 999,
                border: "none",
                background:
                  "linear-gradient(135deg,#0057FF,#00E0FF 70%,#8A2BFF)",
                color: "#FFFFFF",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 12px 30px rgba(37,99,235,0.5)",
              }}
            >
              Save changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
/* CREATE RULE MODAL */
function NewRuleModal({ groups, onClose, onCreate, defaultGroupId }) {
  const [name, setName] = useState("");
  const [groupId, setGroupId] = useState(defaultGroupId);
  const [severity, setSeverity] = useState("medium");
  const [status, setStatus] = useState("active");
  const [description, setDescription] = useState("");
  const [logic, setLogic] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !logic.trim()) return;

    const newRule = {
      id: "rule-" + Date.now(),
      name,
      groupId,
      severity,
      status,
      description,
      logic,
    };

    onCreate(newRule);
  }

  const logicWarning = validateRuleLogic(logic);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.35)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 300,
      }}
    >
      <div
        style={{
          width: 600,
          maxWidth: "95vw",
          borderRadius: 24,
          background: "rgba(248,250,252,0.98)",
          boxShadow: "0 30px 80px rgba(15,23,42,0.45)",
          border: "1px solid rgba(226,232,240,0.9)",
          padding: 24,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 14,
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: GP.inkSoft,
                marginBottom: 4,
              }}
            >
              Create New Rule
            </div>

            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: GP.ink,
              }}
            >
              Add requirement to compliance engine
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              fontSize: 18,
              cursor: "pointer",
              color: "#6B7280",
            }}
          >
            ✕
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* NAME */}
            <div>
              <label style={labelStyle}>Rule name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={inputStyle}
                placeholder="e.g., GL Each Occurrence ≥ $1M"
                required
              />
            </div>

            {/* GROUP */}
            <div>
              <label style={labelStyle}>Coverage Group</label>
              <select
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                style={inputStyle}
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Severity + Status */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <div>
                <label style={labelStyle}>Severity</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  style={inputStyle}
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  style={inputStyle}
                >
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
            </div>

            {/* DESCRIPTION */}
            <div>
              <label style={labelStyle}>Description</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{ ...inputStyle, resize: "vertical" }}
                placeholder="Explain the requirement..."
              />
            </div>

            {/* LOGIC */}
            <div>
              <label style={labelStyle}>Rule Logic (engine expression)</label>
              <textarea
                rows={3}
                value={logic}
                onChange={(e) => setLogic(e.target.value)}
                style={{
                  ...inputStyle,
                  fontFamily: "SFMono-Regular, Menlo, Consolas, monospace",
                  background: "#020617",
                  color: "#E5E7EB",
                }}
                placeholder="limit_each_occurrence >= 1000000"
                required
              />
              {logicWarning && (
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 11,
                    color: "#B45309",
                  }}
                >
                  ⚠️ {logicWarning}
                </div>
              )}
            </div>
          </div>

          {/* ACTIONS */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              marginTop: 20,
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                background: "#FFF",
                border: "1px solid #E5E7EB",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              style={{
                padding: "8px 16px",
                borderRadius: 999,
                border: "none",
                background:
                  "linear-gradient(135deg,#0057FF,#00E0FF 70%,#8A2BFF)",
                color: "#FFF",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 14px 35px rgba(37,99,235,0.45)",
              }}
            >
              Create Rule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* RULE HISTORY DRAWER */
function RuleHistoryDrawer({ open, onClose, items }) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.35)",
        backdropFilter: "blur(6px)",
        display: "flex",
        justifyContent: "flex-end",
        zIndex: 250,
      }}
    >
      <div
        style={{
          width: 420,
          maxWidth: "100vw",
          height: "100%",
          background: "#0F172A",
          color: "#E5E7EB",
          boxShadow: "0 0 40px rgba(15,23,42,0.8)",
          borderLeft: "1px solid rgba(148,163,184,0.4)",
          padding: 18,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 10,
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#9CA3AF",
                marginBottom: 2,
              }}
            >
              Rule History
            </div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Recent changes</div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              fontSize: 18,
              cursor: "pointer",
              color: "#9CA3AF",
            }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            fontSize: 12,
            color: "#9CA3AF",
            marginBottom: 10,
          }}
        >
          Visual timeline of rule edits. Later this will be backed by a real
          audit log.
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            paddingRight: 4,
            marginTop: 4,
          }}
        >
          {items.length === 0 && (
            <div
              style={{
                fontSize: 12,
                color: "#9CA3AF",
                marginTop: 10,
              }}
            >
              No recorded history yet.
            </div>
          )}

          {items.map((item) => (
            <div
              key={item.id}
              style={{
                borderRadius: 10,
                background: "rgba(15,23,42,0.85)",
                border: "1px solid rgba(55,65,81,0.8)",
                padding: 10,
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 4,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {item.ruleName}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "#9CA3AF",
                  }}
                >
                  {item.when}
                </div>
              </div>

              <div
                style={{
                  fontSize: 11,
                  color: "#D1D5DB",
                  marginBottom: 4,
                }}
              >
                {item.summary}
              </div>

              {(item.before || item.after) && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 6,
                    marginTop: 4,
                    fontSize: 10,
                  }}
                >
                  {item.before && (
                    <div>
                      <div
                        style={{
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          color: "#9CA3AF",
                          marginBottom: 2,
                        }}
                      >
                        Before
                      </div>
                      <div
                        style={{
                          padding: 6,
                          borderRadius: 6,
                          background: "#020617",
                          border: "1px solid rgba(75,85,99,0.8)",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {item.before}
                      </div>
                    </div>
                  )}
                  {item.after && (
                    <div>
                      <div
                        style={{
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          color: "#9CA3AF",
                          marginBottom: 2,
                        }}
                      >
                        After
                      </div>
                      <div
                        style={{
                          padding: 6,
                          borderRadius: 6,
                          background: "#020617",
                          border: "1px solid rgba(75,85,99,0.8)",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {item.after}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* AI SUGGEST RULES MODAL — UI ONLY (stub) */
function AiSuggestModal({ open, onClose, suggestions, onApply }) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.4)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 260,
      }}
    >
      <div
        style={{
          width: 640,
          maxWidth: "95vw",
          maxHeight: "80vh",
          borderRadius: 24,
          background: "#020617",
          color: "#E5E7EB",
          boxShadow: "0 30px 80px rgba(15,23,42,0.9)",
          border: "1px solid rgba(30,64,175,0.8)",
          padding: 20,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 10,
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#9CA3AF",
                marginBottom: 2,
              }}
            >
              AI Suggestions
            </div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>
              Recommended rules for this group
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              fontSize: 18,
              cursor: "pointer",
              color: "#9CA3AF",
            }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            fontSize: 12,
            color: "#9CA3AF",
            marginBottom: 12,
          }}
        >
          These are AI-generated ideas based on typical requirements. Later
          we’ll connect this to live carrier and policy data.
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            paddingRight: 4,
          }}
        >
          {suggestions.length === 0 && (
            <div style={{ fontSize: 12, color: "#9CA3AF" }}>
              No suggestions available yet.
            </div>
          )}

          {suggestions.map((s) => (
            <div
              key={s.id}
              style={{
                borderRadius: 14,
                background:
                  "linear-gradient(135deg, rgba(15,23,42,0.9), rgba(30,64,175,0.8))",
                border: "1px solid rgba(37,99,235,0.9)",
                padding: 12,
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 6,
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  {s.name}
                </div>
                <span
                  style={{
                    fontSize: 11,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background:
                      s.severity === "high"
                        ? "rgba(239,68,68,0.2)"
                        : s.severity === "medium"
                        ? "rgba(245,158,11,0.2)"
                        : "rgba(34,197,94,0.2)",
                    border:
                      s.severity === "high"
                        ? "1px solid rgba(248,113,113,0.9)"
                        : s.severity === "medium"
                        ? "1px solid rgba(250,204,21,0.9)"
                        : "1px solid rgba(74,222,128,0.9)",
                  }}
                >
                  {s.severity.toUpperCase()} SUGGESTION
                </span>
              </div>

              <div
                style={{
                  fontSize: 12,
                  color: "#E5E7EB",
                  marginBottom: 4,
                }}
              >
                {s.description}
              </div>

              <div
                style={{
                  fontFamily:
                    "SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  fontSize: 11,
                  padding: 8,
                  borderRadius: 10,
                  background: "#020617",
                  border: "1px solid rgba(55,65,81,0.9)",
                  color: "#E5E7EB",
                  marginBottom: 8,
                }}
              >
                {s.logic}
              </div>

              <button
                type="button"
                onClick={() => onApply(s)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: "none",
                  background:
                    "linear-gradient(135deg,#22C55E,#22D3EE 70%,#6366F1)",
                  color: "#FFF",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: "0 8px 20px rgba(34,197,94,0.6)",
                }}
              >
                ➕ Add this rule
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
/* GROUP EDITOR MODAL */
function GroupEditorModal({ open, group, onClose, onSave }) {
  const [label, setLabel] = useState(group?.label || "");
  const [description, setDescription] = useState(group?.description || "");
  const [icon, setIcon] = useState(group?.icon || "⚙️");

  useEffect(() => {
    if (group) {
      setLabel(group.label || "");
      setDescription(group.description || "");
      setIcon(group.icon || "⚙️");
    }
  }, [group]);

  if (!open || !group) return null;

  function handleSubmit(e) {
    e.preventDefault();
    onSave({
      ...group,
      label,
      description,
      icon,
    });
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.35)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 270,
      }}
    >
      <div
        style={{
          width: 520,
          maxWidth: "95vw",
          borderRadius: 24,
          background: "#F9FAFB",
          boxShadow: "0 26px 70px rgba(15,23,42,0.6)",
          border: "1px solid rgba(209,213,219,0.9)",
          padding: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 10,
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: GP.inkSoft,
                marginBottom: 2,
              }}
            >
              Edit Group
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: GP.ink }}>
              {group.label}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              fontSize: 18,
              cursor: "pointer",
              color: "#6B7280",
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={labelStyle}>Display label</label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Description</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </div>

            <div>
              <label style={labelStyle}>Icon (emoji)</label>
              <input
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                style={inputStyle}
                maxLength={3}
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              marginTop: 16,
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                border: "1px solid #E5E7EB",
                background: "#FFFFFF",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: "8px 16px",
                borderRadius: 999,
                border: "none",
                background:
                  "linear-gradient(135deg,#0EA5E9,#6366F1 70%,#A855F7)",
                color: "#FFFFFF",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 12px 30px rgba(59,130,246,0.6)",
              }}
            >
              Save group
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* DELETE RULE CONFIRM MODAL */
function DeleteRuleModal({ open, rule, onCancel, onConfirm }) {
  if (!open || !rule) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.4)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 280,
      }}
    >
      <div
        style={{
          width: 420,
          maxWidth: "95vw",
          borderRadius: 20,
          background: "#FEF2F2",
          border: "1px solid rgba(248,113,113,0.9)",
          boxShadow: "0 20px 60px rgba(220,38,38,0.5)",
          padding: 18,
        }}
      >
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: "#991B1B",
            marginBottom: 6,
          }}
        >
          Delete this rule?
        </div>
        <div
          style={{
            fontSize: 13,
            color: "#7F1D1D",
            marginBottom: 12,
          }}
        >
          You are about to permanently remove{" "}
          <strong>{rule.name}</strong>. This cannot be undone in this UI.
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: "7px 12px",
              borderRadius: 999,
              border: "1px solid #FECACA",
              background: "#FFFFFF",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              padding: "7px 14px",
              borderRadius: 999,
              border: "none",
              background: "#DC2626",
              color: "#FFFFFF",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Delete rule
          </button>
        </div>
      </div>
    </div>
  );
}

/* DnD-enabled RuleCard */
function RuleCard({
  rule,
  index,
  moveRule,
  onEdit,
  onToggleStatus,
  onDuplicate,
  onDeleteRequest,
  onSelect,
}) {
  const sev = severityStyle(rule.severity || "low");
  const ref = useRef(null);
  const logicWarning = validateRuleLogic(rule.logic);

  const [, drop] = useDrop({
    accept: RULE_CARD,
    hover(item, monitor) {
      if (!ref.current) return;

      const dragId = item.id;
      const hoverId = rule.id;
      if (dragId === hoverId) return;

      const rect = ref.current.getBoundingClientRect();
      const middleY = (rect.bottom - rect.top) / 2;

      const pointer = monitor.getClientOffset();
      if (!pointer) return;

      const hoverY = pointer.y - rect.top;
      const tolerance = rect.height * 0.25;

      if (item.index < index && hoverY < middleY - tolerance) return;
      if (item.index > index && hoverY > middleY + tolerance) return;

      moveRule(dragId, hoverId);
      item.index = index;
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: RULE_CARD,
    item: { id: rule.id, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  drag(drop(ref));

  const disabled = rule.status === "disabled";
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div
      ref={ref}
      onClick={onSelect}
      style={{
        opacity: isDragging ? 0.45 : disabled ? 0.5 : 1,
        display: "flex",
        gap: 14,
        padding: 16,
        borderRadius: 16,
        background: "white",
        border: "1px solid rgba(226,232,240,0.95)",
        boxShadow: "0 12px 30px rgba(15,23,42,0.06)",
        marginBottom: 12,
        transition: "opacity 0.12s ease-out",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          width: 18,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#CBD5F5",
          cursor: "grab",
          userSelect: "none",
        }}
      >
        ⋮⋮
      </div>

      <div style={{ flex: 1 }}>
        {/* Top row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 6,
            gap: 8,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                color: GP.inkSoft,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 2,
              }}
            >
              Rule {index + 1}
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: GP.ink }}>
              {rule.name}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div
              style={{
                padding: "4px 10px",
                borderRadius: 999,
                background: sev.bg,
                border: sev.border,
                color: sev.color,
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {sev.label} Severity
            </div>
            <RuleStatusPill status={rule.status} />
          </div>
        </div>

        {/* Description */}
        <p style={{ fontSize: 13, color: GP.inkSoft, marginBottom: 8 }}>
          {rule.description || "No description provided."}
        </p>

        {/* Logic */}
        <div
          style={{
            fontFamily: "SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            fontSize: 11,
            padding: "8px 10px",
            borderRadius: 10,
            background: "#020617",
            color: "#E5E7EB",
            border: "1px solid rgba(148,163,184,0.4)",
          }}
        >
          {rule.logic || "// No logic set yet"}
        </div>

        {/* Logic warning */}
        {logicWarning && (
          <div
            style={{
              marginTop: 4,
              fontSize: 11,
              color: "#B45309",
            }}
          >
            ⚠️ {logicWarning}
          </div>
        )}

        {/* Advanced accordion */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowAdvanced((s) => !s);
          }}
          style={{
            marginTop: 8,
            fontSize: 11,
            color: GP.inkSoft,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {showAdvanced ? "▾ Hide advanced" : "▸ Show advanced"}
        </button>

        {showAdvanced && (
          <div
            style={{
              marginTop: 6,
              fontSize: 11,
              color: GP.inkSoft,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 6,
            }}
          >
            <div>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>ID</div>
              <div style={{ wordBreak: "break-all" }}>{rule.id}</div>
            </div>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>Group</div>
              <div>{rule.groupId || rule.group_id || "—"}</div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 10,
            fontSize: 11,
          }}
        >
          {/* Left: status toggle */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleStatus(rule);
            }}
            style={{
              borderRadius: 999,
              padding: "6px 10px",
              border: "1px solid #E5E7EB",
              background: disabled ? "#FFF7ED" : "#ECFDF3",
              color: disabled ? "#92400E" : "#166534",
              cursor: "pointer",
            }}
          >
            {disabled ? "Enable rule" : "Disable rule"}
          </button>

          {/* Right: edit / duplicate / delete */}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              style={{
                borderRadius: 999,
                padding: "6px 10px",
                border: "1px solid #E5E7EB",
                background: "#FFF",
                cursor: "pointer",
              }}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate(rule);
              }}
              style={{
                borderRadius: 999,
                padding: "6px 10px",
                border: "1px solid #E5E7EB",
                background: "#F9FAFB",
                cursor: "pointer",
              }}
            >
              Duplicate
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteRequest(rule);
              }}
              style={{
                borderRadius: 999,
                padding: "6px 10px",
                border: "none",
                background: "rgba(239,68,68,0.08)",
                color: "#B91C1C",
                cursor: "pointer",
              }}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
/* MAIN RULE ENGINE PAGE */
export default function EliteRulesPage() {
  const { isAdmin } = useRole();
  const { activeOrgId } = useOrg();

  const [groups, setGroups] = useState(SAMPLE_GROUPS);
  const [rules, setRules] = useState(SAMPLE_RULES);
  const [selectedGroupId, setSelectedGroupId] = useState("general-liability");
  const [selectedRuleId, setSelectedRuleId] = useState(null);

  const [loading, setLoading] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const [error, setError] = useState(null);
  const [editingRule, setEditingRule] = useState(null);
  const [showNewRule, setShowNewRule] = useState(false);

  /* NEW: Severity weights per group */
  const [severityWeights, setSeverityWeights] = useState(() => {
    const initial = {};
    SAMPLE_GROUPS.forEach((g) => {
      initial[g.id] = { ...DEFAULT_WEIGHTS };
    });
    return initial;
  });

  /* NEW: Rule History UI state */
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState([
    {
      id: "h1",
      ruleId: "r1",
      ruleName: "GL Each Occurrence ≥ $1M",
      when: "Today, 2:14 PM",
      summary: "Updated rule from medium → high severity.",
      before: "Severity: Medium",
      after: "Severity: High",
    },
  ]);

  /* NEW: AI Suggest state */
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);

  /* NEW: Group Editor state */
  const [groupEditorOpen, setGroupEditorOpen] = useState(false);
  const [groupDraft, setGroupDraft] = useState(null);

  /* NEW: Delete modal state */
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState(null);

  /* HYBRID LOADER */
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      try {
        const [gRes, rRes] = await Promise.all([
          fetch("/api/requirements-v2/groups").catch(() => null),
          fetch("/api/requirements-v2/rules").catch(() => null),
        ]);

        const g = gRes ? await gRes.json().catch(() => null) : null;
        const r = rRes ? await rRes.json().catch(() => null) : null;

        if (!cancelled) {
          if (g && Array.isArray(g.groups) && g.groups.length > 0) {
            setGroups(g.groups);
            setSeverityWeights((prev) => {
              const next = { ...prev };
              g.groups.forEach((group) => {
                if (!next[group.id]) {
                  next[group.id] = { ...DEFAULT_WEIGHTS };
                }
              });
              return next;
            });
          }

          if (r && Array.isArray(r.rules) && r.rules.length > 0) {
            setRules(r.rules);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  /* AUTO-SELECT FIRST RULE IN GROUP */
  useEffect(() => {
    const first = rules.find(
      (r) => r.groupId === selectedGroupId || r.group_id === selectedGroupId
    );
    setSelectedRuleId(first ? first.id : null);
  }, [rules, selectedGroupId]);

  const visibleRules = useMemo(
    () =>
      rules.filter(
        (r) => r.groupId === selectedGroupId || r.group_id === selectedGroupId
      ),
    [rules, selectedGroupId]
  );

  const selectedRule = useMemo(
    () => rules.find((r) => r.id === selectedRuleId) || null,
    [rules, selectedRuleId]
  );

  /* AI EXPAND FOR RIGHT PANEL */
  const handleAIExpand = async (prompt) => {
    const res = await fetch("/api/elite/expand-rule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        rule: selectedRule || null,
      }),
    });

    const data = await res.json();
    if (!data.ok) {
      throw new Error(data.error || "AI expansion failed.");
    }
    return data.expanded;
  };

  /* SIMPLE UPDATE PATCHER FOR RIGHT PANEL */
  const handleUpdateRule = (id, updates) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
  };

  function handleAiBuild() {
    setAiThinking(true);

    const stub = [
      {
        id: "s1",
        groupId: selectedGroupId,
        name: "GL Additional Insured Endorsement",
        severity: "high",
        description:
          "Require vendors to list your organization as Additional Insured on GL.",
        logic: "has_additional_insured_endorsement == true",
        status: "draft",
      },
      {
        id: "s2",
        groupId: selectedGroupId,
        name: "Primary & Non-Contributory Wording",
        severity: "medium",
        description:
          "Prefer GL policies that include primary and non-contributory wording.",
        logic: "has_primary_non_contrib == true",
        status: "draft",
      },
    ];

    setTimeout(() => {
      setAiSuggestions(stub);
      setAiModalOpen(true);
      setAiThinking(false);
    }, 600);
  }

  /* CLEAN REORDER LOGIC */
  function moveRule(dragId, hoverId) {
    setRules((prev) => {
      const list = [...prev];

      const dragIndex = list.findIndex((r) => r.id === dragId);
      const hoverIndex = list.findIndex((r) => r.id === hoverId);

      if (dragIndex === -1 || hoverIndex === -1) return prev;

      const [removed] = list.splice(dragIndex, 1);
      list.splice(hoverIndex, 0, removed);

      return list;
    });
  }

  function handleSaveRule(updated) {
    setRules((prev) =>
      prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r))
    );
    setEditingRule(null);

    setHistoryItems((prev) => [
      {
        id: "h-" + Date.now(),
        ruleId: updated.id,
        ruleName: updated.name,
        when: new Date().toLocaleString(),
        summary: "Rule edited.",
        before: "",
        after: JSON.stringify(
          {
            severity: updated.severity,
            status: updated.status,
            logic: updated.logic,
          },
          null,
          2
        ),
      },
      ...prev,
    ]);
  }

  function handleCreateRule(newRule) {
    setRules((prev) => {
      const list = [...prev];
      const indexOfFirstInGroup = list.findIndex(
        (r) =>
          r.groupId === newRule.groupId || r.group_id === newRule.groupId
      );
      if (indexOfFirstInGroup === -1) {
        list.push(newRule);
      } else {
        list.splice(indexOfFirstInGroup, 0, newRule);
      }
      return list;
    });
    setShowNewRule(false);
    setSelectedRuleId(newRule.id);

    setHistoryItems((prev) => [
      {
        id: "h-" + Date.now(),
        ruleId: newRule.id,
        ruleName: newRule.name,
        when: new Date().toLocaleString(),
        summary: "Rule created.",
        before: "",
        after: JSON.stringify(
          {
            severity: newRule.severity,
            status: newRule.status,
            logic: newRule.logic,
          },
          null,
          2
        ),
      },
      ...prev,
    ]);
  }

  function getWeightsForGroup(groupId) {
    return severityWeights[groupId] || DEFAULT_WEIGHTS;
  }

  function handleWeightChange(groupId, key, value) {
    const numeric = parseFloat(value);
    if (Number.isNaN(numeric)) return;
    setSeverityWeights((prev) => ({
      ...prev,
      [groupId]: {
        ...(prev[groupId] || DEFAULT_WEIGHTS),
        [key]: numeric,
      },
    }));
  }

  function openHistory() {
    setHistoryOpen(true);
  }
  function closeHistory() {
    setHistoryOpen(false);
  }

  function handleToggleStatus(rule) {
    setRules((prev) =>
      prev.map((r) =>
        r.id === rule.id
          ? {
              ...r,
              status: r.status === "disabled" ? "active" : "disabled",
            }
          : r
      )
    );

    setHistoryItems((prev) => [
      {
        id: "h-" + Date.now(),
        ruleId: rule.id,
        ruleName: rule.name,
        when: new Date().toLocaleString(),
        summary:
          rule.status === "disabled"
            ? "Rule re-enabled."
            : "Rule disabled.",
        before: "",
        after: "Status: " + (rule.status === "disabled" ? "active" : "disabled"),
      },
      ...prev,
    ]);
  }

  function handleDuplicateRule(rule) {
    const cloneId = "rule-" + Date.now();
    const clone = {
      ...rule,
      id: cloneId,
      name: rule.name + " (copy)",
      status: "draft",
    };

    handleCreateRule(clone);
  }

  function handleDeleteRequest(rule) {
    setRuleToDelete(rule);
    setDeleteModalOpen(true);
  }

  function handleDeleteConfirm() {
    if (!ruleToDelete) return;
    const deleted = ruleToDelete;
    setRules((prev) => prev.filter((r) => r.id !== deleted.id));
    setHistoryItems((prev) => [
      {
        id: "h-" + Date.now(),
        ruleId: deleted.id,
        ruleName: deleted.name,
        when: new Date().toLocaleString(),
        summary: "Rule deleted.",
        before: "",
        after: "",
      },
      ...prev,
    ]);
    setRuleToDelete(null);
    setDeleteModalOpen(false);
  }

  function handleGroupEditOpen() {
    const group = groups.find((g) => g.id === selectedGroupId);
    if (!group) return;
    setGroupDraft(group);
    setGroupEditorOpen(true);
  }

  function handleGroupSave(updatedGroup) {
    setGroups((prev) =>
      prev.map((g) => (g.id === updatedGroup.id ? updatedGroup : g))
    );
    setGroupEditorOpen(false);
  }

  function handleApplyAiSuggestion(suggestion) {
    handleCreateRule({
      id: "rule-" + Date.now(),
      name: suggestion.name,
      groupId: suggestion.groupId,
      severity: suggestion.severity,
      status: suggestion.status,
      description: suggestion.description,
      logic: suggestion.logic,
    });
  }

  return (
    <div style={{ minHeight: "100vh", background: GP.surface }}>
      <div style={{ padding: "30px 40px" }}>
        {/* HEADER */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 24,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: "0.16em",
                color: GP.inkSoft,
                marginBottom: 6,
              }}
            >
              Elite Rule Engine V2
            </div>

            <h1
              style={{
                fontSize: 30,
                fontWeight: 700,
                color: GP.ink,
                marginBottom: 4,
              }}
            >
              Requirements & Risk Logic
            </h1>

            <p style={{ fontSize: 14, color: GP.inkSoft, maxWidth: 520 }}>
              Design, reorder, and score the rules that power your AI-driven
              vendor compliance engine.
            </p>

            {error && (
              <p style={{ marginTop: 8, color: "#B45309", fontSize: 12 }}>
                ⚠️ {error}
              </p>
            )}
          </div>

          {/* RIGHT HEADER ACTIONS */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              style={{
                padding: "9px 14px",
                borderRadius: 999,
                border: "1px solid #E5E7EB",
                background: "#FFF",
                cursor: "pointer",
              }}
              onClick={openHistory}
            >
              View Rule History
            </button>

            <button
              style={{
                padding: "9px 14px",
                borderRadius: 999,
                background:
                  "linear-gradient(135deg,#0057FF,#00E0FF 70%,#8A2BFF)",
                color: "#FFF",
                fontWeight: 600,
                boxShadow: "0 14px 35px rgba(37,99,235,0.45)",
                border: "none",
                cursor: "pointer",
              }}
              onClick={() => setShowNewRule(true)}
            >
              ＋ New Rule
            </button>

            <button
              onClick={handleAiBuild}
              disabled={aiThinking}
              style={{
                padding: "7px 12px",
                borderRadius: 999,
                background: "rgba(56,189,248,0.12)",
                color: "#0369A1",
                border: "none",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {aiThinking ? "Thinking…" : "✨ AI: Suggest Rules"}
            </button>
          </div>
        </div>

        {/* MAIN GRID: GROUPS | RULES | AI PANEL */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "320px minmax(0, 1.4fr) 380px",
            gap: 24,
            alignItems: "flex-start",
          }}
        >
          {/* LEFT: GROUP LIST */}
          <div
            style={{
              background: GP.panel,
              borderRadius: 20,
              border: "1px solid rgba(226,232,240,0.95)",
              boxShadow: GP.shadow,
              padding: 18,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: GP.inkSoft,
                marginBottom: 8,
              }}
            >
              Requirement Groups
            </div>

            <p style={{ fontSize: 12, color: GP.inkSoft, marginBottom: 14 }}>
              Select a coverage group to view and reorder its rules.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {groups.map((g) => {
                const selected = g.id === selectedGroupId;

                return (
                  <button
                    key={g.id}
                    onClick={() => setSelectedGroupId(g.id)}
                    style={{
                      textAlign: "left",
                      padding: "10px 12px",
                      borderRadius: 14,
                      border: selected
                        ? "1px solid rgba(37,99,235,0.6)"
                        : "1px solid rgba(226,232,240,0.95)",
                      background: selected
                        ? "linear-gradient(135deg,#EEF2FF,#EFF6FF)"
                        : "#FFF",
                      cursor: "pointer",
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 999,
                        background: selected
                          ? "rgba(37,99,235,0.1)"
                          : "rgba(15,23,42,0.03)",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        fontSize: 16,
                      }}
                    >
                      {g.icon}
                    </div>

                    <div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: GP.ink,
                          marginBottom: 2,
                        }}
                      >
                        {g.label}
                      </div>

                      <div style={{ fontSize: 12, color: GP.inkSoft }}>
                        {g.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleGroupEditOpen}
              style={{
                marginTop: 12,
                fontSize: 12,
                borderRadius: 999,
                padding: "7px 12px",
                border: "1px dashed rgba(148,163,184,0.8)",
                background: "#F9FAFB",
                color: GP.inkSoft,
                cursor: "pointer",
              }}
            >
              ✏️ Edit selected group
            </button>
          </div>

          {/* MIDDLE: RULE LIST - DND ENABLED */}
          <DndProvider backend={HTML5Backend}>
            <div
              style={{
                background: GP.panel,
                borderRadius: 20,
                border: "1px solid rgba(226,232,240,0.95)",
                boxShadow: GP.shadow,
                padding: 18,
              }}
            >
              {/* RIGHT HEADER */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 10,
                  alignItems: "center",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.12em",
                      color: GP.inkSoft,
                      marginBottom: 3,
                    }}
                  >
                    {groups.find((g) => g.id === selectedGroupId)?.label ||
                      "Rules"}
                  </div>

                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: GP.ink,
                    }}
                  >
                    Execution order & severity scoring
                  </div>
                </div>

                <div
                  style={{
                    fontSize: 11,
                    color: GP.inkSoft,
                    textAlign: "right",
                  }}
                >
                  {visibleRules.length} rule
                  {visibleRules.length === 1 ? "" : "s"}
                  <br />
                  <span style={{ opacity: 0.75 }}>
                    Drag to reorder (top = highest priority)
                  </span>
                </div>
              </div>

              {/* 🔥 SEVERITY WEIGHTING STRIP */}
              {(() => {
                const w = getWeightsForGroup(selectedGroupId);
                return (
                  <div
                    style={{
                      marginBottom: 16,
                      padding: 10,
                      borderRadius: 14,
                      border: "1px dashed rgba(148,163,184,0.5)",
                      background: "rgba(248,250,252,0.9)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 6,
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: GP.inkSoft,
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                        }}
                      >
                        Severity weighting
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: GP.inkSoft,
                          textAlign: "right",
                        }}
                      >
                        These weights influence compliance scoring & AI
                        reasoning.
                      </div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                        gap: 10,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: "#B91C1C",
                            marginBottom: 2,
                          }}
                        >
                          High
                        </div>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="3"
                          value={w.high}
                          onChange={(e) =>
                            handleWeightChange(
                              selectedGroupId,
                              "high",
                              e.target.value
                            )
                          }
                          style={{
                            ...inputStyle,
                            padding: "6px 8px",
                            fontSize: 12,
                          }}
                        />
                      </div>

                      <div>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: "#92400E",
                            marginBottom: 2,
                          }}
                        >
                          Medium
                        </div>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="3"
                          value={w.medium}
                          onChange={(e) =>
                            handleWeightChange(
                              selectedGroupId,
                              "medium",
                              e.target.value
                            )
                          }
                          style={{
                            ...inputStyle,
                            padding: "6px 8px",
                            fontSize: 12,
                          }}
                        />
                      </div>

                      <div>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: "#166534",
                            marginBottom: 2,
                          }}
                        >
                          Low
                        </div>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="3"
                          value={w.low}
                          onChange={(e) =>
                            handleWeightChange(
                              selectedGroupId,
                              "low",
                              e.target.value
                            )
                          }
                          style={{
                            ...inputStyle,
                            padding: "6px 8px",
                            fontSize: 12,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* RULE LIST */}
              {loading && (
                <div style={{ color: GP.inkSoft, fontSize: 12 }}>
                  Loading rules…
                </div>
              )}

              {!loading && visibleRules.length === 0 && (
                <div style={{ fontSize: 13, color: GP.inkSoft }}>
                  No rules yet. Use <strong>New Rule</strong> above.
                </div>
              )}

              {!loading &&
                visibleRules.length > 0 &&
                visibleRules.map((r, i) => (
                  <RuleCard
                    key={r.id}
                    rule={r}
                    index={i}
                    moveRule={moveRule}
                    onEdit={() => {
                      setEditingRule(r);
                      setSelectedRuleId(r.id);
                    }}
                    onToggleStatus={handleToggleStatus}
                    onDuplicate={handleDuplicateRule}
                    onDeleteRequest={handleDeleteRequest}
                    onSelect={() => setSelectedRuleId(r.id)}
                  />
                ))}
            </div>
          </DndProvider>

          {/* RIGHT: AI RULE PANEL */}
          <RuleEnginePanel
            selectedRule={selectedRule}
            onUpdateRule={handleUpdateRule}
            onAIExpand={handleAIExpand}
          />
        </div>
      </div>

      {/* EDIT MODAL */}
      {editingRule && (
        <EditRuleModal
          rule={editingRule}
          onClose={() => setEditingRule(null)}
          onSave={handleSaveRule}
        />
      )}

      {/* NEW RULE MODAL */}
      {showNewRule && (
        <NewRuleModal
          groups={groups}
          defaultGroupId={selectedGroupId}
          onCreate={handleCreateRule}
          onClose={() => setShowNewRule(false)}
        />
      )}

      {/* RULE HISTORY DRAWER */}
      <RuleHistoryDrawer
        open={historyOpen}
        onClose={closeHistory}
        items={historyItems}
      />

      {/* AI SUGGEST MODAL */}
      <AiSuggestModal
        open={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        suggestions={aiSuggestions}
        onApply={handleApplyAiSuggestion}
      />

      {/* GROUP EDITOR MODAL */}
      <GroupEditorModal
        open={groupEditorOpen}
        group={groupDraft}
        onClose={() => setGroupEditorOpen(false)}
        onSave={handleGroupSave}
      />

      {/* DELETE RULE MODAL */}
      <DeleteRuleModal
        open={deleteModalOpen}
        rule={ruleToDelete}
        onCancel={() => {
          setDeleteModalOpen(false);
          setRuleToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}

