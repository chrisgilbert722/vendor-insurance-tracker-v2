// pages/admin/elite-rules.js
import { useEffect, useMemo, useState, useRef } from "react";
import { useRole } from "../../lib/useRole";
import { useOrg } from "../../context/OrgContext";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

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
  const label = status === "draft" ? "Draft" : "Active";
  const bg =
    status === "draft"
      ? "rgba(148,163,184,0.16)"
      : "rgba(34,197,94,0.12)";
  const border =
    status === "draft"
      ? "1px solid rgba(156,163,175,0.5)"
      : "1px solid rgba(134,239,172,0.8)";
  const color = status === "draft" ? "#4B5563" : "#166534";

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

/* DnD-enabled RuleCard */
function RuleCard({ rule, index, moveRule, onEdit }) {
  const sev = severityStyle(rule.severity || "low");
  const ref = useRef(null);

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

  return (
    <div
      ref={ref}
      style={{
        opacity: isDragging ? 0.45 : 1,
        display: "flex",
        gap: 14,
        padding: 16,
        borderRadius: 16,
        background: "white",
        border: "1px solid rgba(226,232,240,0.95)",
        boxShadow: "0 12px 30px rgba(15,23,42,0.06)",
        marginBottom: 12,
        transition: "opacity 0.12s ease-out",
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

          <div style={{ display: "flex", gap: 8 }}>
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

        <p style={{ fontSize: 13, color: GP.inkSoft, marginBottom: 8 }}>
          {rule.description}
        </p>

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
          {rule.logic}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            marginTop: 10,
          }}
        >
          <button
            type="button"
            onClick={onEdit}
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              border: "1px solid #E5E7EB",
              background: "#FFF",
              cursor: "pointer",
            }}
          >
            Edit
          </button>
          <button
            type="button"
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              background: "rgba(239,68,68,0.08)",
              color: "#B91C1C",
              border: "none",
              cursor: "pointer",
            }}
          >
            Disable
          </button>
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
  const [loading, setLoading] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const [error, setError] = useState(null);
  const [editingRule, setEditingRule] = useState(null);
  const [showNewRule, setShowNewRule] = useState(false);

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

  const visibleRules = useMemo(
    () =>
      rules.filter(
        (r) => r.groupId === selectedGroupId || r.group_id === selectedGroupId
      ),
    [rules, selectedGroupId]
  );

  function handleAiBuild() {
    setAiThinking(true);
    setTimeout(() => {
      setAiThinking(false);
      alert("AI Rule Builder coming soon (UI ready).");
    }, 1000);
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
  }

  function handleCreateRule(newRule) {
    setRules((prev) => {
      // insert new rule at top of its group
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
              Design, reorder, and score the rules that power your AI-driven vendor
              compliance engine.
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

        {/* MAIN GRID */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.15fr) minmax(0, 2fr)",
            gap: 24,
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
          </div>

          {/* RIGHT: RULE LIST - DND ENABLED */}
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
                    onEdit={() => setEditingRule(r)}
                  />
                ))}
            </div>
          </DndProvider>
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
    </div>
  );
}
