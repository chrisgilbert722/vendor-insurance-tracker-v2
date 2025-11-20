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

/* DEFAULT SEVERITY WEIGHTS */
const DEFAULT_WEIGHTS = { high: 1.0, medium: 0.7, low: 0.4 };

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

/* STATUS PILL */
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
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      }}
    >
      {label}
    </span>
  );
}

/* INPUT STYLES */
const labelStyle = { fontSize: 12, fontWeight: 600, color: GP.inkSoft, marginBottom: 4 };
const inputStyle = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid #E5E7EB",
  fontSize: 13,
  background: "#FFF",
};

/* VALIDATE LOGIC */
function validateRuleLogic(logic) {
  if (!logic || !logic.trim()) return "No logic expression defined.";
  if (!logic.includes(">") && !logic.includes("<") && !logic.includes("=="))
    return "Logic should contain >=, <=, or ==.";
  return null;
}

/* ====================== */
/*   EDIT RULE MODAL      */
/* ====================== */
function EditRuleModal({ rule, onClose, onSave }) {
  const [name, setName] = useState(rule.name || "");
  const [severity, setSeverity] = useState(rule.severity || "medium");
  const [status, setStatus] = useState(rule.status || "active");
  const [description, setDescription] = useState(rule.description || "");
  const [logic, setLogic] = useState(rule.logic || "");

  const logicWarning = validateRuleLogic(logic);

  function handleSubmit(e) {
    e.preventDefault();
    onSave({ ...rule, name, severity, status, description, logic });
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
        zIndex: 200,
      }}
    >
      <div
        style={{
          width: 580,
          maxWidth: "95vw",
          borderRadius: 24,
          background: "#F8FAFC",
          border: "1px solid rgba(226,232,240,0.9)",
          padding: 24,
          boxShadow: "0 30px 80px rgba(15,23,42,0.45)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 12, textTransform: "uppercase", color: GP.inkSoft }}>
              Edit Rule
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: GP.ink }}>
              {rule.name}
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              fontSize: 18,
              cursor: "pointer",
              color: "#64748B",
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={labelStyle}>Rule name</label>
              <input
                style={inputStyle}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Severity</label>
                <select
                  style={inputStyle}
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Status</label>
                <select
                  style={inputStyle}
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>
            </div>

            <div>
              <label style={labelStyle}>Description</label>
              <textarea
                style={{ ...inputStyle, resize: "vertical" }}
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div>
              <label style={labelStyle}>Rule logic</label>
              <textarea
                style={{
                  ...inputStyle,
                  background: "#1E293B",
                  color: "#FFF",
                  fontFamily: "monospace",
                }}
                rows={3}
                value={logic}
                onChange={(e) => setLogic(e.target.value)}
              />
              {logicWarning && (
                <div style={{ fontSize: 11, marginTop: 4, color: "#B45309" }}>
                  ⚠️ {logicWarning}
                </div>
              )}
            </div>
          </div>

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
                background: "#FFF",
                border: "1px solid #E5E7EB",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: "8px 16px",
                borderRadius: 999,
                background: "linear-gradient(135deg,#0057FF,#00E0FF 70%,#8A2BFF)",
                border: "none",
                color: "#FFF",
                fontWeight: 600,
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

/* ====================== */
/*   NEW RULE MODAL       */
/* ====================== */
function NewRuleModal({ groups, onClose, onCreate, defaultGroupId }) {
  const [name, setName] = useState("");
  const [groupId, setGroupId] = useState(defaultGroupId);
  const [severity, setSeverity] = useState("medium");
  const [status, setStatus] = useState("active");
  const [description, setDescription] = useState("");
  const [logic, setLogic] = useState("");

  const logicWarning = validateRuleLogic(logic);

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
          background: "#F8FAFC",
          border: "1px solid rgba(226,232,240,0.9)",
          padding: 24,
          boxShadow: "0 30px 80px rgba(15,23,42,0.45)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 12, textTransform: "uppercase", color: GP.inkSoft }}>
              Create New Rule
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: GP.ink }}>
              Add requirement
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              fontSize: 18,
              cursor: "pointer",
              color: "#64748B",
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={labelStyle}>Rule name</label>
              <input
                style={inputStyle}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={labelStyle}>Coverage Group</label>
              <select
                style={inputStyle}
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Severity</label>
                <select
                  style={inputStyle}
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Status</label>
                <select
                  style={inputStyle}
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
            </div>

            <div>
              <label style={labelStyle}>Description</label>
              <textarea
                style={{ ...inputStyle, resize: "vertical" }}
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div>
              <label style={labelStyle}>Rule logic</label>
              <textarea
                style={{
                  ...inputStyle,
                  background: "#1E293B",
                  color: "#FFF",
                  fontFamily: "monospace",
                }}
                rows={3}
                value={logic}
                onChange={(e) => setLogic(e.target.value)}
              />
              {logicWarning && (
                <div style={{ fontSize: 11, marginTop: 4, color: "#B45309" }}>
                  ⚠️ {logicWarning}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                background: "#FFF",
                border: "1px solid #E5E7EB",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: "8px 16px",
                borderRadius: 999,
                background: "linear-gradient(135deg,#0057FF,#00E0FF 70%,#8A2BFF)",
                border: "none",
                color: "#FFF",
                fontWeight: 600,
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

/* =========================== */
/*     RULE HISTORY DRAWER     */
/* =========================== */
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
          borderLeft: "1px solid rgba(148,163,184,0.4)",
          boxShadow: "0 0 40px rgba(15,23,42,0.8)",
          padding: 18,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 11, textTransform: "uppercase", color: "#94A3B8" }}>
              Rule History
            </div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Recent changes</div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              fontSize: 18,
              cursor: "pointer",
              color: "#9CA3AF",
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 10 }}>
          Audit log of all rule edits.
        </div>

        <div style={{ flex: 1, overflowY: "auto", paddingRight: 4 }}>
          {items.length === 0 && (
            <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 10 }}>
              No history yet.
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
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {item.ruleName}
                </div>
                <div style={{ fontSize: 11, color: "#9CA3AF" }}>
                  {item.when}
                </div>
              </div>

              <div style={{ fontSize: 11, color: "#D1D5DB", marginBottom: 4 }}>
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
                      <div style={{ color: "#9CA3AF", marginBottom: 2 }}>
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
                      <div style={{ color: "#9CA3AF", marginBottom: 2 }}>
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

/* =========================== */
/*      AI SUGGEST MODAL       */
/* =========================== */
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
              Recommended rules
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              fontSize: 18,
              cursor: "pointer",
              color: "#9CA3AF",
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 12 }}>
          These are suggested rules based on common insurance requirements.
        </div>

        <div style={{ flex: 1, overflowY: "auto", paddingRight: 4 }}>
          {suggestions.length === 0 && (
            <div style={{ fontSize: 12, color: "#9CA3AF" }}>
              No suggestions available.
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
                <div style={{ fontSize: 14, fontWeight: 600 }}>{s.name}</div>
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
                  {s.severity.toUpperCase()}
                </span>
              </div>

              <div style={{ fontSize: 12, color: "#E5E7EB", marginBottom: 4 }}>
                {s.description}
              </div>

              <div
                style={{
                  fontFamily: "monospace",
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

/* =========================== */
/*     GROUP EDITOR MODAL      */
/* =========================== */
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
    onSave({ ...group, label, description, icon });
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
          border: "1px solid rgba(209,213,219,0.9)",
          boxShadow: "0 26px 70px rgba(15,23,42,0.6)",
          padding: 20,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 11, textTransform: "uppercase", color: GP.inkSoft }}>
              Edit Group
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: GP.ink }}>
              {group.label}
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
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
                style={inputStyle}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>

            <div>
              <label style={labelStyle}>Description</label>
              <textarea
                style={{ ...inputStyle, resize: "vertical" }}
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div>
              <label style={labelStyle}>Icon (emoji)</label>
              <input
                style={inputStyle}
                value={icon}
                maxLength={3}
                onChange={(e) => setIcon(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
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

/* =========================== */
/*     DELETE RULE MODAL       */
/* =========================== */
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
          This will permanently delete <strong>{rule.name}</strong>.
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
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

