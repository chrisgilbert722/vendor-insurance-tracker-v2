// pages/admin/elite-rules.js
import { useEffect, useMemo, useState, useRef } from "react";
import { useRole } from "../../lib/useRole";
import { useOrg } from "../../context/OrgContext";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

/* THEME TOKENS — keep consistent with dashboard */
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
const RULE_CARD_TYPE = "RULE_CARD";

/* SAMPLE DATA — used when API is empty or unavailable */
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
    label: "Workers’ Comp & Employers Liability",
    description: "Statutory limits & employer liability coverage",
    icon: "💼",
  },
  {
    id: "umbrella",
    label: "Umbrella / Excess",
    description: "Follow-form excess coverage and aggregate limits",
    icon: "☂️",
  },
];

const SAMPLE_RULES = [
  {
    id: "r1",
    groupId: "general-liability",
    name: "GL Each Occurrence ≥ $1M",
    severity: "high",
    description:
      "Vendor must carry at least $1M per occurrence for general liability.",
    logic: "limit_each_occurrence >= 1000000",
    status: "active",
  },
  {
    id: "r2",
    groupId: "general-liability",
    name: "GL Aggregate ≥ $2M",
    severity: "medium",
    description:
      "Preferred aggregate limit of $2M or greater across all GL claims for the policy term.",
    logic: "general_aggregate >= 2000000",
    status: "active",
  },
  {
    id: "r3",
    groupId: "auto",
    name: "Auto CSL ≥ $1M",
    severity: "high",
    description:
      "Combined single limit for business auto liability must be at least $1M.",
    logic: "auto_limit >= 1000000",
    status: "active",
  },
  {
    id: "r4",
    groupId: "workers-comp",
    name: "Workers’ Comp = Statutory",
    severity: "medium",
    description:
      "Policy must indicate statutory workers’ compensation coverage.",
    logic: "work_comp_limit == 'statutory'",
    status: "active",
  },
  {
    id: "r5",
    groupId: "umbrella",
    name: "Umbrella / Excess ≥ $5M",
    severity: "high",
    description:
      "Umbrella or excess liability coverage of at least $5M is required for high-risk vendors.",
    logic: "umbrella_limit >= 5000000",
    status: "draft",
  },
];

/* SEVERITY CHIP STYLES */
function severityStyle(level) {
  switch (level) {
    case "high":
      return {
        bg: "rgba(239, 68, 68, 0.08)",
        border: "1px solid rgba(248, 113, 113, 0.8)",
        color: "#B91C1C",
        label: "High",
      };
    case "medium":
      return {
        bg: "rgba(245, 158, 11, 0.08)",
        border: "1px solid rgba(251, 191, 36, 0.8)",
        color: "#92400E",
        label: "Medium",
      };
    case "low":
    default:
      return {
        bg: "rgba(34, 197, 94, 0.08)",
        border: "1px solid rgba(74, 222, 128, 0.8)",
        color: "#166534",
        label: "Low",
      };
  }
}

function RuleStatusPill({ status }) {
  if (!status) return null;
  const label = status === "draft" ? "Draft" : "Active";
  const bg =
    status === "draft"
      ? "rgba(148, 163, 184, 0.16)"
      : "rgba(34, 197, 94, 0.12)";
  const color = status === "draft" ? "#4B5563" : "#166534";
  const border =
    status === "draft"
      ? "1px solid rgba(156, 163, 175, 0.5)"
      : "1px solid rgba(134, 239, 172, 0.8)";

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
        textTransform: "uppercase",
        letterSpacing: "0.08em",
      }}
    >
      {label}
    </span>
  );
}

/**
 * DnD-enabled rule card
 */
function RuleCard({ rule, index, moveRule }) {
  const sev = severityStyle(rule.severity || "low");
  const ref = useRef(null);

  const [, drop] = useDrop({
    accept: RULE_CARD_TYPE,
    hover(item, monitor) {
      if (!ref.current) return;

      const dragId = item.id;
      const hoverId = rule.id || rule.rule_id;
      if (!dragId || !hoverId || dragId === hoverId) return;

      const boundingRect = ref.current.getBoundingClientRect();
      const middleY = (boundingRect.bottom - boundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;

      const hoverClientY = clientOffset.y - boundingRect.top;

      // Only trigger a move when cursor crosses halfway point
      if (item.index < index && hoverClientY < middleY) return;
      if (item.index > index && hoverClientY > middleY) return;

      moveRule(dragId, hoverId);
      item.index = index;
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: RULE_CARD_TYPE,
    item: () => ({
      id: rule.id || rule.rule_id,
      index,
    }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  drag(drop(ref));

  return (
    <div
      ref={ref}
      style={{
        display: "flex",
        gap: 14,
        padding: 16,
        borderRadius: 16,
        background: "white",
        border: "1px solid rgba(226, 232, 240, 0.95)",
        boxShadow: "0 12px 30px rgba(15, 23, 42, 0.06)",
        marginBottom: 12,
        position: "relative",
        opacity: isDragging ? 0.5 : 1,
        transition: "opacity 0.12s ease-out, transform 0.12s ease-out",
      }}
    >
      {/* Drag handle */}
      <div
        style={{
          width: 18,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "grab",
          userSelect: "none",
          color: "#CBD5F5",
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
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: GP.ink,
              }}
            >
              {rule.name}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                padding: "4px 10px",
                borderRadius: 999,
                background: sev.bg,
                border: sev.border,
                color: sev.color,
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              {sev.label} Severity
            </div>
            <RuleStatusPill status={rule.status} />
          </div>
        </div>

        {rule.description && (
          <p
            style={{
              fontSize: 13,
              color: GP.inkSoft,
              marginBottom: 8,
              lineHeight: 1.45,
            }}
          >
            {rule.description}
          </p>
        )}

        {rule.logic && (
          <div
            style={{
              fontFamily:
                "SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              fontSize: 11,
              padding: "8px 10px",
              borderRadius: 10,
              background: "#020617",
              color: "#E5E7EB",
              border: "1px solid rgba(148, 163, 184, 0.4)",
            }}
          >
            {rule.logic}
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            marginTop: 10,
            fontSize: 11,
          }}
        >
          <button
            type="button"
            style={{
              borderRadius: 999,
              padding: "6px 10px",
              border: "1px solid #E5E7EB",
              background: "#FFFFFF",
              cursor: "pointer",
            }}
          >
            Edit
          </button>
          <button
            type="button"
            style={{
              borderRadius: 999,
              padding: "6px 10px",
              border: "none",
              background: "rgba(239, 68, 68, 0.08)",
              color: "#B91C1C",
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
  const [selectedGroupId, setSelectedGroupId] = useState(SAMPLE_GROUPS[0]?.id);
  const [loading, setLoading] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const [error, setError] = useState(null);

  // Attempt to load real groups/rules from API, but fall back gracefully
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [groupsRes, rulesRes] = await Promise.all([
          fetch("/api/requirements-v2/groups"),
          fetch("/api/requirements-v2/rules"),
        ]);

        const groupsData = await groupsRes.json().catch(() => ({}));
        const rulesData = await rulesRes.json().catch(() => ({}));

        if (!cancelled) {
          if (groupsData && Array.isArray(groupsData.groups)) {
            setGroups(groupsData.groups);
            if (!selectedGroupId && groupsData.groups.length > 0) {
              setSelectedGroupId(groupsData.groups[0].id);
            }
          }

          if (rulesData && Array.isArray(rulesData.rules)) {
            setRules(rulesData.rules);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError("Using demo rules while the API warms up.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleRules = useMemo(() => {
    if (!selectedGroupId) return rules || [];
    return (rules || []).filter(
      (r) => r.groupId === selectedGroupId || r.group_id === selectedGroupId
    );
  }, [rules, selectedGroupId]);

  const selectedGroup =
    groups.find((g) => g.id === selectedGroupId) || groups[0];

  function handleAiBuild() {
    setAiThinking(true);
    setTimeout(() => {
      setAiThinking(false);
      alert(
        "AI rule builder wiring is next — UI is ready. (No backend call yet, just placeholder.)"
      );
    }, 1000);
  }

  // 🔥 Reorder rules in the global list based on drag/hover IDs
  function moveRule(dragId, hoverId) {
    if (!dragId || !hoverId || dragId === hoverId) return;

    setRules((prev) => {
      const arr = [...prev];
      const dragIndex = arr.findIndex(
        (r) => (r.id || r.rule_id) === dragId
      );
      const hoverIndex = arr.findIndex(
        (r) => (r.id || r.rule_id) === hoverId
      );
      if (dragIndex === -1 || hoverIndex === -1) return prev;

      const [removed] = arr.splice(dragIndex, 1);
      arr.splice(hoverIndex, 0, removed);
      return arr;
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
            gap: 20,
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

            <p
              style={{
                fontSize: 14,
                color: GP.inkSoft,
                maxWidth: 520,
              }}
            >
              Design, reorder, and score the rules that power your AI-driven
              vendor compliance checks. Rules are evaluated in order from top
              to bottom within each group.
            </p>

            {error && (
              <p
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  color: "#B45309",
                }}
              >
                ⚠️ {error}
              </p>
            )}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              alignItems: "flex-end",
            }}
          >
            <div
              style={{
                fontSize: 11,
                padding: "4px 10px",
                borderRadius: 999,
                background: "rgba(129, 140, 248, 0.1)",
                border: "1px solid rgba(129, 140, 248, 0.4)",
                color: "#4F46E5",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                fontWeight: 600,
              }}
            >
              Cinematic Mode • Beta
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                style={{
                  padding: "9px 14px",
                  borderRadius: 999,
                  border: "1px solid #E5E7EB",
                  background: "#FFFFFF",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                View Rule History
              </button>

              <button
                type="button"
                style={{
                  padding: "9px 14px",
                  borderRadius: 999,
                  border: "1px solid rgba(0,87,255,0.2)",
                  background:
                    "linear-gradient(135deg, #0057FF, #00E0FF 70%, #8A2BFF)",
                  color: "#FFFFFF",
                  fontSize: 13,
                  fontWeight: 600,
                  boxShadow: "0 14px 35px rgba(37, 99, 235, 0.45)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span>＋ New Rule</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleAiBuild}
              disabled={!isAdmin || aiThinking}
              style={{
                marginTop: 4,
                padding: "7px 12px",
                borderRadius: 999,
                border: "none",
                background: isAdmin
                  ? "rgba(56,189,248,0.12)"
                  : "rgba(148,163,184,0.16)",
                color: isAdmin ? "#0369A1" : "#6B7280",
                fontSize: 12,
                cursor: isAdmin ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {aiThinking ? "Thinking…" : "✨ AI: Suggest Rules For This Org"}
            </button>
          </div>
        </div>

        {/* MAIN GRID */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.15fr) minmax(0, 2fr)",
            gap: 24,
            alignItems: "flex-start",
          }}
        >
          {/* LEFT: GROUPS */}
          <div
            style={{
              background: GP.panel,
              borderRadius: 20,
              border: "1px solid rgba(226, 232, 240, 0.95)",
              boxShadow: GP.shadow,
              padding: 18,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: GP.inkSoft,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Requirement Groups
            </div>

            <p
              style={{
                fontSize: 12,
                color: GP.inkSoft,
                marginBottom: 14,
              }}
            >
              Select a coverage group to view and reorder its rules. Each group
              can have its own severity model and AI weighting.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {groups.map((g) => {
                const selected = g.id === selectedGroupId;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setSelectedGroupId(g.id)}
                    style={{
                      textAlign: "left",
                      padding: "10px 12px",
                      borderRadius: 14,
                      border: selected
                        ? "1px solid rgba(37, 99, 235, 0.6)"
                        : "1px solid rgba(226, 232, 240, 0.95)",
                      background: selected
                        ? "linear-gradient(135deg, #EEF2FF, #EFF6FF)"
                        : "#FFFFFF",
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
                          ? "rgba(37, 99, 235, 0.1)"
                          : "rgba(15, 23, 42, 0.03)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 16,
                      }}
                    >
                      {g.icon || "📄"}
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
                        {g.label || g.name}
                      </div>
                      {g.description && (
                        <div
                          style={{
                            fontSize: 12,
                            color: GP.inkSoft,
                          }}
                        >
                          {g.description}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT: RULES (DnD-enabled) */}
          <DndProvider backend={HTML5Backend}>
            <div
              style={{
                background: GP.panel,
                borderRadius: 20,
                border: "1px solid rgba(226, 232, 240, 0.95)",
                boxShadow: GP.shadow,
                padding: 18,
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
                      fontSize: 13,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.12em",
                      color: GP.inkSoft,
                      marginBottom: 3,
                    }}
                  >
                    {selectedGroup?.label || "Rules"}
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
                  {visibleRules.length === 1 ? "" : "s"} in this group
                  <br />
                  <span style={{ opacity: 0.8 }}>
                    Highest severity rules should sit at the top.
                  </span>
                </div>
              </div>

              {loading && (
                <div
                  style={{ fontSize: 12, color: GP.inkSoft, marginTop: 8 }}
                >
                  Loading rules…
                </div>
              )}

              {!loading && visibleRules.length === 0 && (
                <div
                  style={{
                    fontSize: 13,
                    color: GP.inkSoft,
                    marginTop: 12,
                  }}
                >
                  No rules defined for this group yet. Use{" "}
                  <strong>New Rule</strong> or{" "}
                  <strong>AI: Suggest Rules For This Org</strong> to get
                  started.
                </div>
              )}

              {!loading &&
                visibleRules.length > 0 &&
                visibleRules.map((r, idx) => (
                  <RuleCard
                    key={r.id || r.rule_id || idx}
                    rule={r}
                    index={idx}
                    moveRule={moveRule}
                  />
                ))}
            </div>
          </DndProvider>
        </div>
      </div>
    </div>
  );
}
