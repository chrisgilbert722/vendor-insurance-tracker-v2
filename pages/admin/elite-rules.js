// pages/admin/elite-rules.js
import { useEffect, useMemo, useState, useRef } from "react";
import { useRole } from "../../lib/useRole";
import { useOrg } from "../../context/OrgContext";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

/* ===========================
   THEME TOKENS
=========================== */
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
  card: "#FFFFFF",
  border: "#E2E8F0",
  shadowSoft: "0 18px 45px rgba(15,23,42,0.18)",
};

const ItemTypes = {
  GROUP: "GROUP",
  RULE: "RULE",
};

/* ===========================
   SEED DATA
=========================== */
const initialGroups = [
  {
    id: "grp-expired",
    label: "Expired / Missing Insurance",
    description: "Vendors with expired COIs or missing required documents.",
    icon: "⚠️",
    rules: [
      {
        id: "rule-exp-30",
        label: "Expires Within 30 Days",
        description: "Policy expiration date is within the next 30 days.",
        severity: "High",
        active: true,
        conditionsSummary:
          "Certificate.expirationDate <= today + 30 days AND Vendor.isActive = true",
      },
      {
        id: "rule-no-coi",
        label: "No Active COI on File",
        description: "No certificate of insurance found for active vendor.",
        severity: "Critical",
        active: true,
        conditionsSummary:
          "COUNT(Certificate WHERE status = 'active') = 0 AND Vendor.isActive = true",
      },
    ],
  },
  {
    id: "grp-limits",
    label: "Coverage Limits",
    description: "Vendors whose coverage is below required contract limits.",
    icon: "📊",
    rules: [
      {
        id: "rule-gen-liab",
        label: "General Liability Below Required",
        description:
          "General liability per occurrence is below the organization minimum.",
        severity: "Medium",
        active: true,
        conditionsSummary:
          "Certificate.generalLiabilityPerOccurrence < Org.requiredGLPerOccurrence",
      },
      {
        id: "rule-auto-liab",
        label: "Auto Liability Missing",
        description:
          "Vendor categorized as 'Fleet / Auto' but no auto liability coverage found.",
        severity: "High",
        active: true,
        conditionsSummary:
          "Vendor.category = 'Auto / Fleet' AND Certificate.autoLiability is NULL",
      },
    ],
  },
  {
    id: "grp-docusigned",
    label: "Contracts & Endorsements",
    description: "Missing endorsements, waivers, or additional insured language.",
    icon: "📄",
    rules: [
      {
        id: "rule-ai-missing",
        label: "Additional Insured Not Found",
        description:
          "Policy endorsement text does not include required additional insured wording.",
        severity: "High",
        active: true,
        conditionsSummary:
          "NOT textSearch(Endorsement.document, Org.requiredAIText)",
      },
    ],
  },
];

const severityOptions = ["All", "Critical", "High", "Medium", "Low"];

/* ===========================
   UTILITY HELPERS
=========================== */
function generateId(prefix = "id") {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function cloneGroups(groups) {
  return JSON.parse(JSON.stringify(groups));
}

/* Fake AI suggestion call */
async function fakeAiSuggestRule(context = {}) {
  await new Promise((r) => setTimeout(r, 600));
  const id = generateId("ai-rule");
  return {
    id,
    label: "AI: Missing Waiver of Subrogation",
    description:
      "Flag vendors whose policies do not include a waiver of subrogation where required.",
    severity: "Medium",
    active: true,
    conditionsSummary:
      "NOT textSearch(Endorsement.document, 'waiver of subrogation') AND Vendor.requiresWaiver = true",
    _aiSuggested: true,
  };
}

/* ===========================
   DRAG HELPERS
=========================== */
function useDraggableGroup(group, index, moveGroup) {
  const ref = useRef(null);

  const [, drop] = useDrop({
    accept: ItemTypes.GROUP,
    hover(item) {
      if (!ref.current) return;
      const dragIndex = item.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) return;
      moveGroup(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.GROUP,
    item: { id: group.id, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  drag(drop(ref));

  return { ref, isDragging };
}

function useDraggableRule(rule, index, moveRule, groupId) {
  const ref = useRef(null);

  const [, drop] = useDrop({
    accept: ItemTypes.RULE,
    hover(item) {
      if (!ref.current) return;
      if (item.groupId !== groupId) return;
      const dragIndex = item.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) return;
      moveRule(groupId, dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.RULE,
    item: { id: rule.id, index, groupId },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  drag(drop(ref));

  return { ref, isDragging };
}

/* ===========================
   MAIN PAGE
=========================== */
export default function EliteRulesPage() {
  const { isAdmin, isManager } = useRole();
  const { orgId } = useOrg();

  const [groups, setGroups] = useState(initialGroups);
  const [selectedGroupId, setSelectedGroupId] = useState(initialGroups[0]?.id);
  const [severityFilter, setSeverityFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const [editingRule, setEditingRule] = useState(null);
  const [editingGroup, setEditingGroup] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  const canEdit = isAdmin || isManager;

  const selectedGroup = useMemo(
    () => groups.find((g) => g.id === selectedGroupId) || groups[0],
    [groups, selectedGroupId]
  );

  const filteredRules = useMemo(() => {
    if (!selectedGroup) return [];
    return selectedGroup.rules.filter((rule) => {
      if (!showInactive && !rule.active) return false;
      if (severityFilter !== "All" && rule.severity !== severityFilter)
        return false;
      if (!searchTerm) return true;
      const haystack =
        `${rule.label} ${rule.description} ${rule.conditionsSummary}`.toLowerCase();
      return haystack.includes(searchTerm.toLowerCase());
    });
  }, [selectedGroup, severityFilter, searchTerm, showInactive]);

  /* ===========================
     CRUD HANDLERS
  =========================== */
  function moveGroup(fromIndex, toIndex) {
    setGroups((prev) => {
      const next = [...prev];
      const [removed] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, removed);
      return next;
    });
  }

  function moveRule(groupId, fromIndex, toIndex) {
    setGroups((prev) => {
      const next = cloneGroups(prev);
      const group = next.find((g) => g.id === groupId);
      if (!group) return prev;
      const [removed] = group.rules.splice(fromIndex, 1);
      group.rules.splice(toIndex, 0, removed);
      return next;
    });
  }

  function toggleRuleActive(groupId, ruleId) {
    setGroups((prev) => {
      const next = cloneGroups(prev);
      const group = next.find((g) => g.id === groupId);
      if (!group) return prev;
      const rule = group.rules.find((r) => r.id === ruleId);
      if (!rule) return prev;
      rule.active = !rule.active;
      return next;
    });
  }

  function handleSaveRule(updatedRule) {
    setGroups((prev) => {
      const next = cloneGroups(prev);
      const group = next.find((g) => g.id === selectedGroup.id);
      if (!group) return prev;

      const index = group.rules.findIndex((r) => r.id === updatedRule.id);
      if (index === -1) {
        group.rules.push(updatedRule);
      } else {
        group.rules[index] = updatedRule;
      }
      return next;
    });
    setEditingRule(null);
  }

  function handleDeleteRule(ruleId) {
    if (!window.confirm("Delete this rule? This cannot be undone.")) return;
    setGroups((prev) => {
      const next = cloneGroups(prev);
      const group = next.find((g) => g.id === selectedGroup.id);
      if (!group) return prev;
      group.rules = group.rules.filter((r) => r.id !== ruleId);
      return next;
    });
  }

  function handleCreateRule() {
    const id = generateId("rule");
    setEditingRule({
      id,
      label: "",
      description: "",
      severity: "Medium",
      active: true,
      conditionsSummary: "",
    });
  }

  function handleSaveGroup(updatedGroup) {
    setGroups((prev) => {
      const next = cloneGroups(prev);
      const index = next.findIndex((g) => g.id === updatedGroup.id);
      if (index === -1) {
        next.push({ ...updatedGroup, rules: [] });
      } else {
        next[index] = {
          ...next[index],
          ...updatedGroup,
        };
      }
      return next;
    });
    setEditingGroup(null);
  }

  function handleCreateGroup() {
    const id = generateId("grp");
    setEditingGroup({
      id,
      label: "",
      description: "",
      icon: "⚙️",
    });
  }

  function handleDeleteGroup(groupId) {
    if (!window.confirm("Delete this group and all its rules?")) return;
    setGroups((prev) => {
      const next = prev.filter((g) => g.id !== groupId);
      if (selectedGroupId === groupId && next.length) {
        setSelectedGroupId(next[0].id);
      }
      return next;
    });
  }

  async function handleAiSuggest() {
    try {
      setAiError("");
      setAiLoading(true);
      const suggestion = await fakeAiSuggestRule({
        orgId,
        groupId: selectedGroup?.id,
      });
      setGroups((prev) => {
        const next = cloneGroups(prev);
        const group = next.find((g) => g.id === selectedGroup?.id);
        if (!group) return prev;
        group.rules.unshift(suggestion);
        return next;
      });
    } catch (err) {
      setAiError("AI suggestion failed. Try again in a moment.");
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div
        style={{
          minHeight: "100vh",
          background:
            "radial-gradient(circle at top left, #0f172a 0, #020617 50%, #020617 100%)",
          padding: "32px 40px 40px",
          color: "white",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, system-ui, -apple-system, Segoe UI, sans-serif",
        }}
      >
        {/* HEADER STRIP */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: 24,
            gap: 16,
          }}
        >
          <div
            style={{
              padding: 10,
              borderRadius: 999,
              background:
                "radial-gradient(circle at 30% 0, #38bdf8 0, #1e40af 55%, #020617 100%)",
              boxShadow: "0 0 45px rgba(56,189,248,0.4)",
            }}
          >
            <span style={{ fontSize: 22 }}>🧠</span>
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "4px 10px",
                borderRadius: 999,
                border: "1px solid rgba(148,163,184,0.4)",
                marginBottom: 6,
                background:
                  "linear-gradient(90deg, rgba(15,23,42,0.9), rgba(15,23,42,0))",
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  letterSpacing: 1.2,
                  textTransform: "uppercase",
                  color: "#e5e7eb",
                }}
              >
                Elite Compliance Engine V2
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: "#a5b4fc",
                  letterSpacing: 1,
                  textTransform: "uppercase",
                }}
              >
                Drag • Score • Automate
              </span>
            </div>
            <h1
              style={{
                fontSize: 28,
                fontWeight: 600,
                letterSpacing: 0.1,
                margin: 0,
              }}
            >
              Rules that feel{" "}
              <span
                style={{
                  background:
                    "linear-gradient(90deg,#38bdf8,#e0f2fe,#e5e7eb,#a5b4fc)",
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                }}
              >
                cinematic
              </span>{" "}
              but work like a{" "}
              <span
                style={{
                  background: "linear-gradient(90deg,#22c55e,#4ade80)",
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                }}
              >
                scoring engine
              </span>
              .
            </h1>
            <p
              style={{
                marginTop: 6,
                marginBottom: 0,
                color: "#cbd5f5",
                fontSize: 13,
                maxWidth: 640,
              }}
            >
              Define logic once, drag and reorder, and let the AI-assisted rule
              engine monitor every vendor, every certificate, every endorsement
              in real time.
            </p>
          </div>

          {/* HEADER ACTIONS */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              disabled={!canEdit}
              onClick={handleAiSuggest}
              style={{
                padding: "10px 16px",
                borderRadius: 999,
                border: "1px solid rgba(94,234,212,0.5)",
                background:
                  "radial-gradient(circle at top left,#22c55e,#16a34a,#0f766e)",
                boxShadow:
                  "0 14px 35px rgba(34,197,94,0.45), 0 0 0 1px rgba(15,23,42,0.8) inset",
                color: "white",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: 0.6,
                textTransform: "uppercase",
                cursor: canEdit ? "pointer" : "not-allowed",
                opacity: canEdit ? 1 : 0.45,
                display: "flex",
                alignItems: "center",
                gap: 8,
                justifyContent: "center",
              }}
            >
              {aiLoading ? (
                <>
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: "999px",
                      border: "2px solid rgba(226,232,240,0.6)",
                      borderTopColor: "transparent",
                      animation: "spin 0.8s linear infinite",
                    }}
                  />
                  <span>Asking AI for a rule…</span>
                </>
              ) : (
                <>
                  <span>✨</span>
                  <span>AI — suggest a rule</span>
                </>
              )}
            </button>
            <span
              style={{
                fontSize: 11,
                color: "#9ca3af",
                textAlign: "right",
              }}
            >
              {orgId ? `Org: ${orgId}` : "Org context active"}
            </span>
          </div>
        </div>

        {aiError && (
          <div
            style={{
              marginBottom: 16,
              padding: "10px 12px",
              borderRadius: 10,
              background: "rgba(248,113,113,0.08)",
              border: "1px solid rgba(248,113,113,0.6)",
              color: "#fecaca",
              fontSize: 12,
            }}
          >
            {aiError}
          </div>
        )}

        {!canEdit && (
          <div
            style={{
              marginBottom: 18,
              padding: "10px 12px",
              borderRadius: 10,
              background: "rgba(55,65,81,0.7)",
              border: "1px solid rgba(148,163,184,0.5)",
              fontSize: 12,
              color: "#e5e7eb",
            }}
          >
            You are in read-only mode. Rules will still run for this
            organization, but only admins and managers can edit them.
          </div>
        )}

        {/* MAIN LAYOUT */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "280px minmax(0, 1.4fr) minmax(0, 1.2fr)",
            gap: 18,
            alignItems: "stretch",
          }}
        >
          {/* LEFT — GROUPS */}
          <GroupColumn
            groups={groups}
            selectedGroupId={selectedGroup?.id}
            onSelectGroup={setSelectedGroupId}
            onCreateGroup={handleCreateGroup}
            onEditGroup={setEditingGroup}
            onDeleteGroup={handleDeleteGroup}
            moveGroup={moveGroup}
            canEdit={canEdit}
          />

          {/* CENTER — RULE CARDS */}
          <RuleBoard
            group={selectedGroup}
            rules={filteredRules}
            severityFilter={severityFilter}
            onSeverityChange={setSeverityFilter}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            showInactive={showInactive}
            onToggleShowInactive={setShowInactive}
            moveRule={moveRule}
            onToggleRuleActive={(ruleId) =>
              toggleRuleActive(selectedGroup.id, ruleId)
            }
            onEditRule={setEditingRule}
            onDeleteRule={handleDeleteRule}
            onCreateRule={handleCreateRule}
            canEdit={canEdit}
          />

          {/* RIGHT — SCORE + PREVIEW */}
          <ScoringPanel groups={groups} selectedGroup={selectedGroup} />
        </div>

        {/* MODALS */}
        {editingRule && (
          <RuleEditorModal
            open={!!editingRule}
            rule={editingRule}
            onClose={() => setEditingRule(null)}
            onSave={handleSaveRule}
          />
        )}

        {editingGroup && (
          <GroupEditorModal
            open={!!editingGroup}
            group={editingGroup}
            onClose={() => setEditingGroup(null)}
            onSave={handleSaveGroup}
          />
        )}

        <style jsx>{`
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    </DndProvider>
  );
}

/* ===========================
   GROUP COLUMN
=========================== */
function GroupColumn({
  groups,
  selectedGroupId,
  onSelectGroup,
  onCreateGroup,
  onEditGroup,
  onDeleteGroup,
  moveGroup,
  canEdit,
}) {
  return (
    <div
      style={{
        borderRadius: 24,
        padding: 14,
        background:
          "linear-gradient(145deg, rgba(15,23,42,0.96), rgba(15,23,42,0.86))",
        border: "1px solid rgba(148,163,184,0.5)",
        boxShadow: "0 20px 40px rgba(15,23,42,0.9)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 4,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 1.3,
              color: "#9ca3af",
              marginBottom: 4,
            }}
          >
            Rule Groups
          </div>
          <div style={{ fontSize: 13, color: "#e5e7eb" }}>
            Drag to reorder how groups appear on this screen.
          </div>
        </div>
        <button
          disabled={!canEdit}
          onClick={onCreateGroup}
          style={{
            borderRadius: 999,
            padding: "6px 11px",
            border: "1px solid rgba(129,140,248,0.7)",
            background:
              "radial-gradient(circle at top left,#4f46e5,#1d4ed8,#020617)",
            color: "white",
            fontSize: 11,
            fontWeight: 500,
            cursor: canEdit ? "pointer" : "not-allowed",
            opacity: canEdit ? 1 : 0.45,
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
        {groups.map((group, index) => (
          <GroupCard
            key={group.id}
            group={group}
            index={index}
            isSelected={group.id === selectedGroupId}
            onSelect={() => onSelectGroup(group.id)}
            onEdit={() => onEditGroup(group)}
            onDelete={() => onDeleteGroup(group.id)}
            moveGroup={moveGroup}
            canEdit={canEdit}
          />
        ))}

        {groups.length === 0 && (
          <div
            style={{
              padding: "12px 10px",
              borderRadius: 14,
              border: "1px dashed rgba(148,163,184,0.7)",
              fontSize: 12,
              color: "#9ca3af",
            }}
          >
            No groups yet. Create your first high-level bucket like{" "}
            <span style={{ color: "#e5e7eb" }}>
              “Expired / Missing Insurance”
            </span>{" "}
            or{" "}
            <span style={{ color: "#e5e7eb" }}>“Coverage Limits By Vendor”</span>
            .
          </div>
        )}
      </div>
    </div>
  );
}

function GroupCard({
  group,
  index,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  moveGroup,
  canEdit,
}) {
  const { ref, isDragging } = useDraggableGroup(group, index, moveGroup);

  return (
    <div
      ref={ref}
      onClick={onSelect}
      style={{
        position: "relative",
        borderRadius: 16,
        padding: "9px 10px 10px",
        background: isSelected
          ? "linear-gradient(135deg, rgba(56,189,248,0.16), rgba(37,99,235,0.04))"
          : "linear-gradient(135deg, rgba(15,23,42,0.9), rgba(15,23,42,0.92))",
        border: isSelected
          ? "1px solid rgba(59,130,246,0.9)"
          : "1px solid rgba(51,65,85,0.9)",
        boxShadow: isSelected
          ? "0 20px 40px rgba(37,99,235,0.45)"
          : "0 8px 26px rgba(15,23,42,0.9)",
        cursor: "pointer",
        opacity: isDragging ? 0.45 : 1,
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        transition:
          "transform 0.12s ease-out, box-shadow 0.15s ease-out, border-color 0.12s ease-out, background 0.15s ease-out",
      }}
    >
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 999,
          background:
            "radial-gradient(circle at 30% 0, rgba(56,189,248,0.4), rgba(37,99,235,0.3), rgba(15,23,42,1))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 16 }}>{group.icon || "⚙️"}</span>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 6,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "#e5e7eb",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
              overflow: "hidden",
            }}
          >
            {group.label}
          </div>
          <div style={{ fontSize: 11, color: "#9ca3af", flexShrink: 0 }}>
            {group.rules.length} rule
            {group.rules.length !== 1 ? "s" : ""}
          </div>
        </div>
        {group.description && (
          <div
            style={{
              fontSize: 11,
              color: "#9ca3af",
              marginTop: 4,
              lineHeight: 1.35,
            }}
          >
            {group.description}
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          marginLeft: 4,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          disabled={!canEdit}
          onClick={onEdit}
          style={{
            borderRadius: 999,
            border: "1px solid rgba(148,163,184,0.7)",
            background: "rgba(15,23,42,0.9)",
            color: "#e5e7eb",
            fontSize: 10,
            padding: "2px 7px",
            cursor: canEdit ? "pointer" : "not-allowed",
          }}
        >
          Edit
        </button>
        <button
          disabled={!canEdit}
          onClick={onDelete}
          style={{
            borderRadius: 999,
            border: "1px solid rgba(248,113,113,0.6)",
            background: "rgba(127,29,29,0.9)",
            color: "#fecaca",
            fontSize: 10,
            padding: "2px 7px",
            cursor: canEdit ? "pointer" : "not-allowed",
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

/* ===========================
   RULE BOARD
=========================== */
function RuleBoard({
  group,
  rules,
  severityFilter,
  onSeverityChange,
  searchTerm,
  onSearchChange,
  showInactive,
  onToggleShowInactive,
  moveRule,
  onToggleRuleActive,
  onEditRule,
  onDeleteRule,
  onCreateRule,
  canEdit,
}) {
  return (
    <div
      style={{
        borderRadius: 24,
        padding: 16,
        background:
          "radial-gradient(circle at top left, rgba(15,23,42,0.97), rgba(15,23,42,0.9))",
        border: "1px solid rgba(148,163,184,0.55)",
        boxShadow: "0 24px 60px rgba(15,23,42,0.95)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: 2,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 1.3,
              color: "#9ca3af",
              marginBottom: 6,
            }}
          >
            {group ? group.label : "Rules"}
          </div>
          <div style={{ fontSize: 13, color: "#e5e7eb", maxWidth: 380 }}>
            {group?.description ||
              "Select a group on the left to manage its logic."}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            alignItems: "flex-end",
          }}
        >
          <button
            disabled={!canEdit}
            onClick={onCreateRule}
            style={{
              borderRadius: 999,
              padding: "7px 13px",
              border: "1px solid rgba(56,189,248,0.8)",
              background:
                "linear-gradient(120deg, rgba(8,47,73,1), rgba(15,23,42,1))",
              color: "#e0f2fe",
              fontSize: 11,
              fontWeight: 500,
              cursor: canEdit ? "pointer" : "not-allowed",
              opacity: canEdit ? 1 : 0.45,
            }}
          >
            + New rule
          </button>
          <div style={{ fontSize: 10, color: "#9ca3af" }}>
            Drag cards to reorder. The order is how rules evaluate.
          </div>
        </div>
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 6,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 5px",
            borderRadius: 999,
            background: "rgba(15,23,42,0.8)",
            border: "1px solid rgba(51,65,85,0.9)",
          }}
        >
          {severityOptions.map((opt) => {
            const active = opt === severityFilter;
            return (
              <button
                key={opt}
                onClick={() => onSeverityChange(opt)}
                style={{
                  borderRadius: 999,
                  border: "none",
                  padding: "4px 8px",
                  fontSize: 11,
                  cursor: "pointer",
                  background: active
                    ? "radial-gradient(circle at top,#f97316,#ea580c,#451a03)"
                    : "transparent",
                  color: active ? "#fef3c7" : "#cbd5f5",
                  boxShadow: active
                    ? "0 0 18px rgba(248,250,252,0.25)"
                    : "none",
                }}
              >
                {opt}
              </button>
            );
          })}
        </div>

        <div
          style={{
            flex: 1,
            minWidth: 120,
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 9px",
            borderRadius: 999,
            border: "1px solid rgba(51,65,85,0.9)",
            background: "rgba(15,23,42,0.9)",
          }}
        >
          <span style={{ fontSize: 13, color: "#6b7280" }}>🔍</span>
          <input
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search logic, conditions, vendors…"
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              color: "#e5e7eb",
              fontSize: 12,
            }}
          />
        </div>

        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            color: "#9ca3af",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => onToggleShowInactive(e.target.checked)}
            style={{ cursor: "pointer" }}
          />
          Show inactive
        </label>
      </div>

      {/* Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 12,
          marginTop: 4,
        }}
      >
        {group && rules.length > 0 ? (
          rules.map((rule, index) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              index={index}
              groupId={group.id}
              moveRule={moveRule}
              onToggleActive={() => onToggleRuleActive(rule.id)}
              onEdit={() => onEditRule(rule)}
              onDelete={() => onDeleteRule(rule.id)}
              canEdit={canEdit}
            />
          ))
        ) : (
          <div
            style={{
              borderRadius: 18,
              border: "1px dashed rgba(75,85,99,0.9)",
              padding: "16px 14px",
              fontSize: 12,
              color: "#9ca3af",
            }}
          >
            {group
              ? "This group doesn’t have any rules yet. Start with 2–3 high-impact checks, then refine."
              : "Select a group on the left to see its rules."}
          </div>
        )}
      </div>
    </div>
  );
}

function severityChipStyle(severity) {
  switch (severity) {
    case "Critical":
      return {
        label: "Critical",
        bg: "rgba(248,113,113,0.14)",
        border: "rgba(248,113,113,0.8)",
        dot: "#fecaca",
        text: "#fee2e2",
      };
    case "High":
      return {
        label: "High",
        bg: "rgba(250,204,21,0.08)",
        border: "rgba(250,204,21,0.7)",
        dot: "#facc15",
        text: "#fef9c3",
      };
    case "Medium":
      return {
        label: "Medium",
        bg: "rgba(56,189,248,0.08)",
        border: "rgba(56,189,248,0.7)",
        dot: "#38bdf8",
        text: "#e0f2fe",
      };
    case "Low":
      return {
        label: "Low",
        bg: "rgba(52,211,153,0.08)",
        border: "rgba(52,211,153,0.7)",
        dot: "#34d399",
        text: "#ccfbf1",
      };
    default:
      return {
        label: severity || "Unset",
        bg: "rgba(148,163,184,0.08)",
        border: "rgba(148,163,184,0.7)",
        dot: "#e5e7eb",
        text: "#e5e7eb",
      };
  }
}

function RuleCard({
  rule,
  index,
  groupId,
  moveRule,
  onToggleActive,
  onEdit,
  onDelete,
  canEdit,
}) {
  const { ref, isDragging } = useDraggableRule(rule, index, moveRule, groupId);

  const sev = severityChipStyle(rule.severity);

  return (
    <div
      ref={ref}
      style={{
        position: "relative",
        borderRadius: 18,
        padding: 12,
        background:
          "radial-gradient(circle at top left, rgba(15,23,42,0.98), rgba(15,23,42,0.92))",
        border: `1px solid ${
          rule._aiSuggested
            ? "rgba(56,189,248,0.7)"
            : "rgba(55,65,81,0.95)"
        }`,
        boxShadow: rule._aiSuggested
          ? "0 18px 45px rgba(56,189,248,0.35)"
          : "0 18px 45px rgba(15,23,42,0.95)",
        opacity: isDragging ? 0.4 : 1,
        cursor: "grab",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: -2,
          background:
            "radial-gradient(circle at -10% -20%, rgba(56,189,248,0.22), transparent 55%)",
          opacity: 0.9,
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", zIndex: 1 }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 10,
            marginBottom: 6,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "#e5e7eb",
                marginBottom: 3,
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
                overflow: "hidden",
              }}
            >
              {rule.label}
            </div>
            {rule.description && (
              <div
                style={{
                  fontSize: 11,
                  color: "#9ca3af",
                  lineHeight: 1.35,
                }}
              >
                {rule.description}
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div
              style={{
                alignSelf: "flex-end",
                fontSize: 10,
                color: "#6b7280",
              }}
            >
              #{index + 1}
            </div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "2px 7px",
                borderRadius: 999,
                background: sev.bg,
                border: `1px solid ${sev.border}`,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 999,
                  background: sev.dot,
                  boxShadow: `0 0 12px ${sev.dot}`,
                }}
              />
              <span
                style={{
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: 0.9,
                  color: sev.text,
                }}
              >
                {sev.label}
              </span>
            </div>
          </div>
        </div>

        {rule.conditionsSummary && (
          <div
            style={{
              marginTop: 6,
              padding: "7px 8px",
              borderRadius: 10,
              background: "rgba(15,23,42,0.95)",
              border: "1px solid rgba(31,41,55,0.95)",
              fontFamily: "ui-monospace, Menlo, SFMono-Regular, monospace",
              fontSize: 11,
              color: "#e5e7eb",
              lineHeight: 1.4,
              maxHeight: 76,
              overflow: "hidden",
            }}
          >
            {rule.conditionsSummary}
          </div>
        )}

        <div
          style={{
            marginTop: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 11,
              color: "#9ca3af",
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!canEdit) return;
                onToggleActive();
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                borderRadius: 999,
                padding: "3px 9px",
                border: "1px solid rgba(75,85,99,0.95)",
                background: rule.active
                  ? "radial-gradient(circle at top left,#22c55e,#15803d,#052e16)"
                  : "rgba(15,23,42,0.9)",
                color: rule.active ? "#bbf7d0" : "#9ca3af",
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: 0.7,
                cursor: canEdit ? "pointer" : "not-allowed",
                opacity: canEdit ? 1 : 0.5,
              }}
            >
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: 999,
                  border: "2px solid rgba(148,163,184,0.8)",
                  background: rule.active ? "#bbf7d0" : "transparent",
                }}
              />
              {rule.active ? "Active" : "Inactive"}
            </button>

            {rule._aiSuggested && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "2px 7px",
                  borderRadius: 999,
                  border: "1px solid rgba(56,189,248,0.7)",
                  background: "rgba(8,47,73,0.9)",
                  color: "#e0f2fe",
                  fontSize: 10,
                }}
              >
                <span>✨</span>
                <span>AI suggested</span>
              </span>
            )}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 10,
            }}
          >
            <button
              disabled={!canEdit}
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              style={{
                borderRadius: 999,
                padding: "2px 8px",
                border: "1px solid rgba(148,163,184,0.8)",
                background: "rgba(15,23,42,0.95)",
                color: "#e5e7eb",
                cursor: canEdit ? "pointer" : "not-allowed",
              }}
            >
              Edit
            </button>
            <button
              disabled={!canEdit}
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              style={{
                borderRadius: 999,
                padding: "2px 8px",
                border: "1px solid rgba(248,113,113,0.8)",
                background: "rgba(127,29,29,0.95)",
                color: "#fecaca",
                cursor: canEdit ? "pointer" : "not-allowed",
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

/* ===========================
   SCORING PANEL
=========================== */
function ScoringPanel({ groups, selectedGroup }) {
  const totalRules = groups.reduce((sum, g) => sum + g.rules.length, 0);
  const activeRules = groups.reduce(
    (sum, g) => sum + g.rules.filter((r) => r.active).length,
    0
  );
  const criticalHigh = groups.reduce(
    (sum, g) =>
      sum +
      g.rules.filter(
        (r) =>
          r.active &&
          (r.severity === "Critical" || r.severity === "High")
      ).length,
    0
  );

  const coverageScore =
    totalRules === 0 ? 0 : Math.round((activeRules / totalRules) * 100);

  const highSignalScore =
    totalRules === 0 ? 0 : Math.min(100, criticalHigh * 12 + 10);

  const blended = Math.round((coverageScore * 0.6 + highSignalScore * 0.4) / 1);

  return (
    <div
      style={{
        borderRadius: 24,
        padding: 16,
        background:
          "radial-gradient(circle at top right, rgba(15,23,42,0.8), rgba(15,23,42,1))",
        border: "1px solid rgba(148,163,184,0.5)",
        boxShadow: "0 24px 60px rgba(15,23,42,0.95)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: 1.3,
          color: "#9ca3af",
        }}
      >
        Compliance Pulse
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div
          style={{
            position: "relative",
            width: 112,
            height: 112,
            borderRadius: "50%",
            background:
              "conic-gradient(from 220deg, #22c55e, #fbbf24, #fb7185, #0f172a)",
            padding: 4,
            boxShadow:
              "0 0 55px rgba(34,197,94,0.35), 0 0 110px rgba(248,250,252,0.17)",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 10,
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 30% 0, #0f172a, #020617 55%, #000 100%)",
            }}
          />
          <div
            style={{
              position: "relative",
              zIndex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "#e5e7eb",
            }}
          >
            <div
              style={{
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: 1.1,
                color: "#9ca3af",
                marginBottom: 4,
              }}
            >
              Score
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 600,
                background:
                  "linear-gradient(120deg,#22c55e,#bef264,#fbbf24)",
                WebkitBackgroundClip: "text",
                color: "transparent",
              }}
            >
              {blended}
            </div>
            <div style={{ fontSize: 10, color: "#9ca3af" }}>out of 100</div>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              color: "#e5e7eb",
              marginBottom: 6,
            }}
          >
            Rule coverage snapshot
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0,1fr))",
              gap: 8,
            }}
          >
            <MetricPill
              label="Active rules"
              value={`${activeRules} / ${totalRules}`}
              barValue={coverageScore}
              hint="How much of your logic is currently live."
            />
            <MetricPill
              label="High-severity signals"
              value={criticalHigh}
              barValue={highSignalScore}
              hint="How many rules can stop real risk fast."
            />
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 6,
          borderRadius: 16,
          padding: 10,
          background: "rgba(15,23,42,0.95)",
          border: "1px solid rgba(51,65,85,0.95)",
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 999,
            background:
              "radial-gradient(circle at 30% 0, rgba(56,189,248,0.3), rgba(15,23,42,1))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 18 }}>{selectedGroup?.icon || "⚙️"}</span>
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 12,
              color: "#e5e7eb",
              marginBottom: 2,
            }}
          >
            {selectedGroup
              ? selectedGroup.label
              : "Select a group to see its impact."}
          </div>
          <div
            style={{
              fontSize: 11,
              color: "#9ca3af",
              marginBottom: 4,
            }}
          >
            {selectedGroup?.description ||
              "The engine scores risk based on how many rules you have live across critical categories."}
          </div>
          <div
            style={{
              fontSize: 11,
              color: "#6b7280",
            }}
          >
            {selectedGroup
              ? `${selectedGroup.rules.filter((r) => r.active).length} active · ${
                  selectedGroup.rules.length
                } total rules in this lane.`
              : "No group selected."}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 2,
          fontSize: 10,
          color: "#6b7280",
          lineHeight: 1.4,
        }}
      >
        When this hits{" "}
        <span style={{ color: "#22c55e" }}>90+</span>, you have a cinematic
        ruleset that not only looks elite in the UI, but actually blocks risk
        before it reaches your finance team, ops team, or insurer.
      </div>
    </div>
  );
}

function MetricPill({ label, value, barValue, hint }) {
  return (
    <div
      style={{
        borderRadius: 14,
        padding: 9,
        background: "rgba(15,23,42,0.95)",
        border: "1px solid rgba(51,65,85,0.9)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "#9ca3af",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 13,
          color: "#e5e7eb",
          marginBottom: 6,
        }}
      >
        {value}
      </div>
      <div
        style={{
          width: "100%",
          height: 5,
          borderRadius: 999,
          background: "rgba(31,41,55,0.9)",
          overflow: "hidden",
          marginBottom: 4,
        }}
      >
        <div
          style={{
            width: `${Math.max(0, Math.min(barValue, 100))}%`,
            height: "100%",
            background:
              "linear-gradient(90deg,#22c55e,#eab308,#fb7185,#0ea5e9)",
          }}
        />
      </div>
      <div style={{ fontSize: 10, color: "#6b7280" }}>{hint}</div>
    </div>
  );
}

/* ===========================
   GROUP EDITOR MODAL
=========================== */
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

  if (!open) return null;

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = label.trim();
    if (!trimmed) return;
    onSave({
      id: group.id,
      label: trimmed,
      description: description.trim(),
      icon: icon.trim() || "⚙️",
    });
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.75)",
        backdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 460,
          borderRadius: 20,
          padding: 18,
          background:
            "radial-gradient(circle at top, #020617, #020617 55%, #020617 100%)",
          border: "1px solid rgba(148,163,184,0.7)",
          boxShadow: "0 30px 80px rgba(15,23,42,1)",
          color: "#e5e7eb",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 1.2,
                color: "#9ca3af",
              }}
            >
              Edit group
            </div>
            <div style={{ fontSize: 14, marginTop: 3 }}>
              Give this lane a clear{" "}
              <span style={{ color: "#22c55e" }}>risk theme</span>.
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              borderRadius: 999,
              width: 26,
              height: 26,
              border: "1px solid rgba(148,163,184,0.8)",
              background: "rgba(15,23,42,0.9)",
              color: "#e5e7eb",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            ✕
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 10 }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "64px minmax(0,1fr)",
              gap: 10,
              alignItems: "center",
            }}
          >
            <div>
              <label
                style={{
                  fontSize: 11,
                  color: "#9ca3af",
                  marginBottom: 4,
                  display: "block",
                }}
              >
                Icon
              </label>
              <input
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                style={{
                  width: "100%",
                  borderRadius: 999,
                  padding: "6px 8px",
                  border: "1px solid rgba(51,65,85,0.9)",
                  background: "rgba(15,23,42,0.95)",
                  color: "#e5e7eb",
                  fontSize: 16,
                  textAlign: "center",
                }}
                maxLength={2}
              />
            </div>

            <div>
              <label
                style={{
                  fontSize: 11,
                  color: "#9ca3af",
                  marginBottom: 4,
                  display: "block",
                }}
              >
                Group name
              </label>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Expired / Missing Insurance"
                style={{
                  width: "100%",
                  borderRadius: 999,
                  padding: "7px 10px",
                  border: "1px solid rgba(51,65,85,0.9)",
                  background: "rgba(15,23,42,0.95)",
                  color: "#e5e7eb",
                  fontSize: 13,
                }}
              />
            </div>
          </div>

          <div>
            <label
              style={{
                fontSize: 11,
                color: "#9ca3af",
                marginBottom: 4,
                display: "block",
              }}
            >
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what risk this lane owns."
              rows={3}
              style={{
                width: "100%",
                borderRadius: 12,
                padding: "7px 9px",
                border: "1px solid rgba(51,65,85,0.9)",
                background: "rgba(15,23,42,0.95)",
                color: "#e5e7eb",
                fontSize: 12,
                resize: "vertical",
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              marginTop: 4,
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                borderRadius: 999,
                padding: "6px 11px",
                border: "1px solid rgba(148,163,184,0.7)",
                background: "transparent",
                color: "#e5e7eb",
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                borderRadius: 999,
                padding: "6px 13px",
                border: "none",
                background:
                  "linear-gradient(120deg,#22c55e,#16a34a,#14532d)",
                color: "#ecfdf5",
                fontSize: 11,
                fontWeight: 500,
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

/* ===========================
   RULE EDITOR MODAL
=========================== */
function RuleEditorModal({ open, rule, onClose, onSave }) {
  const [label, setLabel] = useState(rule?.label || "");
  const [description, setDescription] = useState(rule?.description || "");
  const [severity, setSeverity] = useState(rule?.severity || "Medium");
  const [conditionsSummary, setConditionsSummary] = useState(
    rule?.conditionsSummary || ""
  );

  useEffect(() => {
    if (rule) {
      setLabel(rule.label || "");
      setDescription(rule.description || "");
      setSeverity(rule.severity || "Medium");
      setConditionsSummary(rule.conditionsSummary || "");
    }
  }, [rule]);

  if (!open) return null;

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = label.trim();
    if (!trimmed) return;
    onSave({
      ...rule,
      label: trimmed,
      description: description.trim(),
      severity,
      conditionsSummary: conditionsSummary.trim(),
    });
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.8)",
        backdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 620,
          borderRadius: 20,
          padding: 18,
          background:
            "radial-gradient(circle at top, #020617, #020617 55%, #020617 100%)",
          border: "1px solid rgba(148,163,184,0.7)",
          boxShadow: "0 34px 90px rgba(15,23,42,1)",
          color: "#e5e7eb",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 1.2,
                color: "#9ca3af",
              }}
            >
              Edit rule
            </div>
            <div style={{ fontSize: 14, marginTop: 3 }}>
              Turn a vague “policy check” into explicit, machine-readable logic.
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              borderRadius: 999,
              width: 26,
              height: 26,
              border: "1px solid rgba(148,163,184,0.8)",
              background: "rgba(15,23,42,0.9)",
              color: "#e5e7eb",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            ✕
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 10 }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0,2.1fr) minmax(0,1fr)",
              gap: 10,
            }}
          >
            <div>
              <label
                style={{
                  fontSize: 11,
                  color: "#9ca3af",
                  marginBottom: 4,
                  display: "block",
                }}
              >
                Rule name
              </label>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Expires Within 30 Days"
                style={{
                  width: "100%",
                  borderRadius: 999,
                  padding: "7px 10px",
                  border: "1px solid rgba(51,65,85,0.9)",
                  background: "rgba(15,23,42,0.95)",
                  color: "#e5e7eb",
                  fontSize: 13,
                }}
              />
            </div>

            <div>
              <label
                style={{
                  fontSize: 11,
                  color: "#9ca3af",
                  marginBottom: 4,
                  display: "block",
                }}
              >
                Severity
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                style={{
                  width: "100%",
                  borderRadius: 999,
                  padding: "7px 10px",
                  border: "1px solid rgba(51,65,85,0.9)",
                  background: "rgba(15,23,42,0.95)",
                  color: "#e5e7eb",
                  fontSize: 13,
                }}
              >
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div>
            <label
              style={{
                fontSize: 11,
                color: "#9ca3af",
                marginBottom: 4,
                display: "block",
              }}
            >
              Human-readable description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What risk does this catch? E.g. “Policy expires within 30 days while vendor is still active.”"
              rows={2}
              style={{
                width: "100%",
                borderRadius: 12,
                padding: "7px 9px",
                border: "1px solid rgba(51,65,85,0.9)",
                background: "rgba(15,23,42,0.95)",
                color: "#e5e7eb",
                fontSize: 12,
                resize: "vertical",
              }}
            />
          </div>

          <div>
            <label
              style={{
                fontSize: 11,
                color: "#9ca3af",
                marginBottom: 4,
                display: "block",
              }}
            >
              Logic (pseudo-SQL / DSL)
            </label>
            <textarea
              value={conditionsSummary}
              onChange={(e) => setConditionsSummary(e.target.value)}
              placeholder={`Certificate.expirationDate <= today + 30 days
AND Vendor.isActive = true`}
              rows={4}
              style={{
                width: "100%",
                borderRadius: 12,
                padding: "7px 9px",
                border: "1px solid rgba(30,64,175,0.9)",
                background: "rgba(15,23,42,0.98)",
                color: "#e5e7eb",
                fontFamily:
                  "ui-monospace, Menlo, SFMono-Regular, SFMono-Regular, monospace",
                fontSize: 12,
                resize: "vertical",
              }}
            />
            <div
              style={{
                fontSize: 10,
                color: "#6b7280",
                marginTop: 4,
                lineHeight: 1.4,
              }}
            >
              Keep it literal. Imagine this is a DSL your engine reads. You can
              reference{" "}
              <span style={{ color: "#e5e7eb" }}>
                Vendor, Certificate, Endorsement, Org
              </span>{" "}
              objects.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              marginTop: 4,
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                borderRadius: 999,
                padding: "6px 11px",
                border: "1px solid rgba(148,163,184,0.7)",
                background: "transparent",
                color: "#e5e7eb",
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                borderRadius: 999,
                padding: "6px 13px",
                border: "none",
                background:
                  "linear-gradient(120deg,#22c55e,#16a34a,#15803d)",
                color: "#ecfdf5",
                fontSize: 11,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Save rule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
