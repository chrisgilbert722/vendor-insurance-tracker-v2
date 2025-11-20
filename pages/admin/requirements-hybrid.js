// pages/admin/requirements-hybrid.js
import { useState, useMemo } from "react";

/* ===========================
   THEME TOKENS (match elite-rules)
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
  card: "#0B1220",
  border: "#1E293B",
};

/* ===========================
   SEED DATA
=========================== */
const requirementGroups = [
  {
    id: "grp-gl",
    label: "General Liability",
    description: "Core GL limits and conditions required for most vendors.",
    icon: "🛡️",
  },
  {
    id: "grp-auto",
    label: "Auto Liability",
    description: "Vendors operating vehicles or fleets on behalf of your org.",
    icon: "🚚",
  },
  {
    id: "grp-wc",
    label: "Workers Compensation",
    description: "Vendors with employees performing work on your premises.",
    icon: "🧑‍🔧",
  },
  {
    id: "grp-endorse",
    label: "Endorsements",
    description: "Additional insured, waiver of subrogation, primary / non-contrib, etc.",
    icon: "📄",
  },
  {
    id: "grp-docs",
    label: "Documentation",
    description: "COIs, contracts, and other documents required on file.",
    icon: "🗂️",
  },
];

const initialRequirementsByGroup = {
  "grp-gl": [
    {
      id: "req-gl-each-occurrence",
      label: "Each Occurrence Limit",
      type: "coverage",
      field: "Certificate.glEachOccurrence",
      requiredLimit: 1000000,
      unit: "per occurrence",
      severity: "High",
      active: true,
      note: "Standard GL requirement for most vendors.",
    },
    {
      id: "req-gl-aggregate",
      label: "General Aggregate Limit",
      type: "coverage",
      field: "Certificate.glGeneralAggregate",
      requiredLimit: 2000000,
      unit: "aggregate",
      severity: "Medium",
      active: true,
      note: "Ensures total protection across the policy period.",
    },
  ],
  "grp-auto": [
    {
      id: "req-auto-liab",
      label: "Auto Liability",
      type: "coverage",
      field: "Certificate.autoLiability",
      requiredLimit: 1000000,
      unit: "combined single limit",
      severity: "High",
      active: true,
      note: "Applies when vendor drives owned, hired, or non-owned vehicles.",
    },
  ],
  "grp-wc": [
    {
      id: "req-wc-stat",
      label: "Statutory Workers Compensation",
      type: "coverage",
      field: "Certificate.workersComp",
      requiredLimit: null,
      unit: "statutory",
      severity: "High",
      active: true,
      note: "Required when vendor has employees performing work.",
    },
    {
      id: "req-wc-el",
      label: "Employer’s Liability",
      type: "coverage",
      field: "Certificate.employersLiabilityEachAccident",
      requiredLimit: 500000,
      unit: "each accident",
      severity: "Medium",
      active: true,
      note: "EL coverage to protect against employee injury claims.",
    },
  ],
  "grp-endorse": [
    {
      id: "req-ai",
      label: "Additional Insured – Ongoing Operations",
      type: "endorsement",
      wordingHint:
        "Vendor must name your organization as Additional Insured for ongoing operations (CG 20 10 or equivalent).",
      severity: "Critical",
      active: true,
      note: "Required where you are exposed to vendor’s operations in real time.",
    },
    {
      id: "req-waiver",
      label: "Waiver of Subrogation",
      type: "endorsement",
      wordingHint:
        "Policy must include a waiver of subrogation in favor of your organization where permitted by law.",
      severity: "Medium",
      active: true,
      note: "Reduces the chance the carrier subrogates back against you.",
    },
  ],
  "grp-docs": [
    {
      id: "req-valid-coi",
      label: "Valid COI on File",
      type: "document",
      docType: "Certificate of Insurance",
      severity: "High",
      active: true,
      note: "At least one current COI must be on file for the vendor.",
    },
    {
      id: "req-signed-contract",
      label: "Signed Contract / Agreement",
      type: "document",
      docType: "Contract",
      severity: "Medium",
      active: true,
      note: "Executed contract or MSA must be attached for the vendor.",
    },
  ],
};

const severityOptions = ["Critical", "High", "Medium", "Low"];

/* ===========================
   HELPERS
=========================== */
function cloneRequirementMap(map) {
  return JSON.parse(JSON.stringify(map));
}

function requirementSeverityStyle(severity) {
  switch (severity) {
    case "Critical":
      return {
        bg: "rgba(248,113,113,0.14)",
        border: "rgba(248,113,113,0.8)",
        text: "#fee2e2",
      };
    case "High":
      return {
        bg: "rgba(250,204,21,0.12)",
        border: "rgba(250,204,21,0.8)",
        text: "#fef9c3",
      };
    case "Medium":
      return {
        bg: "rgba(56,189,248,0.14)",
        border: "rgba(56,189,248,0.8)",
        text: "#e0f2fe",
      };
    case "Low":
      return {
        bg: "rgba(52,211,153,0.14)",
        border: "rgba(52,211,153,0.8)",
        text: "#ccfbf1",
      };
    default:
      return {
        bg: "rgba(148,163,184,0.12)",
        border: "rgba(148,163,184,0.8)",
        text: "#e5e7eb",
      };
  }
}

/* ===========================
   MAIN PAGE
=========================== */
export default function RequirementsHybridPage() {
  const [requirementsByGroup, setRequirementsByGroup] = useState(
    initialRequirementsByGroup
  );
  const [selectedGroupId, setSelectedGroupId] = useState(
    requirementGroups[0]?.id
  );
  const [severityFilter, setSeverityFilter] = useState("All");
  const [showInactive, setShowInactive] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const selectedGroup = useMemo(
    () => requirementGroups.find((g) => g.id === selectedGroupId),
    [selectedGroupId]
  );

  const flatRequirements = useMemo(() => {
    const all = [];
    Object.keys(requirementsByGroup).forEach((groupId) => {
      const group = requirementGroups.find((g) => g.id === groupId);
      (requirementsByGroup[groupId] || []).forEach((req) => {
        all.push({ ...req, groupId, groupLabel: group?.label });
      });
    });
    return all;
  }, [requirementsByGroup]);

  const filteredRequirementsForSelectedGroup = useMemo(() => {
    const list = requirementsByGroup[selectedGroupId] || [];
    return list.filter((req) => {
      if (!showInactive && !req.active) return false;
      if (severityFilter !== "All" && req.severity !== severityFilter)
        return false;
      if (!searchTerm) return true;
      const haystack = (
        req.label +
        " " +
        (req.note || "") +
        " " +
        (req.docType || "") +
        " " +
        (req.wordingHint || "")
      ).toLowerCase();
      return haystack.includes(searchTerm.toLowerCase());
    });
  }, [
    requirementsByGroup,
    selectedGroupId,
    showInactive,
    severityFilter,
    searchTerm,
  ]);

  function toggleRequirementActive(groupId, requirementId) {
    setRequirementsByGroup((prev) => {
      const next = cloneRequirementMap(prev);
      const items = next[groupId] || [];
      const idx = items.findIndex((r) => r.id === requirementId);
      if (idx === -1) return prev;
      items[idx].active = !items[idx].active;
      return next;
    });
  }

  function updateRequirementLimit(groupId, requirementId, newLimit) {
    setRequirementsByGroup((prev) => {
      const next = cloneRequirementMap(prev);
      const items = next[groupId] || [];
      const idx = items.findIndex((r) => r.id === requirementId);
      if (idx === -1) return prev;
      items[idx].requiredLimit = newLimit;
      return next;
    });
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left,#020617 0,#020617 45%,#000000 100%)",
        padding: "32px 40px 40px",
        color: "white",
        fontFamily:
          "-apple-system,BlinkMacSystemFont,system-ui,Segoe UI,sans-serif",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 24,
          marginBottom: 24,
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "4px 10px",
              borderRadius: 999,
              border: "1px solid rgba(148,163,184,0.45)",
              background:
                "linear-gradient(90deg,rgba(15,23,42,0.95),rgba(15,23,42,0.3))",
              marginBottom: 8,
            }}
          >
            <span
              style={{
                width: 22,
                height: 22,
                borderRadius: "999px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background:
                  "radial-gradient(circle at 30% 0,#22c55e,#4ade80,#166534)",
                boxShadow: "0 0 25px rgba(74,222,128,0.6)",
                fontSize: 14,
              }}
            >
              📋
            </span>
            <span
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 1.2,
                color: "#e5e7eb",
              }}
            >
              Requirements Engine V2
            </span>
            <span
              style={{
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: 1,
                color: "#a5b4fc",
              }}
            >
              Coverage • Endorsements • Docs
            </span>
          </div>

          <h1
            style={{
              fontSize: 28,
              fontWeight: 600,
              margin: 0,
              letterSpacing: 0.1,
            }}
          >
            Hybrid requirements that{" "}
            <span
              style={{
                background:
                  "linear-gradient(90deg,#38bdf8,#e0f2fe,#a5b4fc,#f97316)",
                WebkitBackgroundClip: "text",
                color: "transparent",
              }}
            >
              adapt per vendor
            </span>{" "}
            instead of living in a static spreadsheet.
          </h1>
          <p
            style={{
              marginTop: 8,
              marginBottom: 0,
              color: "#cbd5f5",
              fontSize: 13,
              maxWidth: 680,
            }}
          >
            Define coverage limits, endorsements, and documentation in one
            cinematic view. The engine turns these into a machine-readable
            blueprint for every vendor, every contract, every COI.
          </p>
        </div>

        <div
          style={{
            padding: 12,
            borderRadius: 20,
            border: "1px solid rgba(148,163,184,0.55)",
            background:
              "radial-gradient(circle at top,#020617,#020617 70%,#020617 100%)",
            boxShadow: "0 22px 50px rgba(15,23,42,0.95)",
            minWidth: 240,
          }}
        >
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 1.2,
              color: "#9ca3af",
            }}
          >
            Blueprint snapshot
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 13,
              color: "#e5e7eb",
            }}
          >
            {flatRequirements.filter((r) => r.active).length} active
            requirements across{" "}
            {Object.keys(requirementsByGroup).filter(
              (k) => (requirementsByGroup[k] || []).length > 0
            ).length}{" "}
            groups.
          </div>
          <div
            style={{
              marginTop: 10,
              borderRadius: 999,
              overflow: "hidden",
              height: 6,
              background: "rgba(15,23,42,0.95)",
              border: "1px solid rgba(51,65,85,0.95)",
            }}
          >
            <div
              style={{
                width: "70%",
                height: "100%",
                background:
                  "linear-gradient(90deg,#22c55e,#a3e635,#facc15,#f97316)",
              }}
            />
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 10,
              color: "#6b7280",
              lineHeight: 1.4,
            }}
          >
            Hybrid means numeric limits + logical conditions + documents, all
            wired to the same evaluation engine.
          </div>
        </div>
      </div>

      {/* MAIN GRID */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "260px minmax(0,1.4fr) minmax(0,1.1fr)",
          gap: 18,
          alignItems: "stretch",
        }}
      >
        {/* LEFT — GROUPS */}
        <GroupColumn
          groups={requirementGroups}
          selectedGroupId={selectedGroupId}
          onSelectGroup={setSelectedGroupId}
        />

        {/* CENTER — REQUIREMENT CARDS */}
        <RequirementBoard
          group={selectedGroup}
          requirements={filteredRequirementsForSelectedGroup}
          severityFilter={severityFilter}
          onSeverityChange={setSeverityFilter}
          showInactive={showInactive}
          onToggleShowInactive={setShowInactive}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onToggleActive={(id) =>
            toggleRequirementActive(selectedGroupId, id)
          }
          onUpdateLimit={(id, newLimit) =>
            updateRequirementLimit(selectedGroupId, id, newLimit)
          }
        />

        {/* RIGHT — SCORING PANEL */}
        <RequirementScoringPanel
          groups={requirementGroups}
          requirementsByGroup={requirementsByGroup}
          selectedGroup={selectedGroup}
        />
      </div>
    </div>
  );
}

/* ===========================
   GROUP COLUMN
=========================== */
function GroupColumn({ groups, selectedGroupId, onSelectGroup }) {
  return (
    <div
      style={{
        borderRadius: 24,
        padding: 14,
        background:
          "linear-gradient(145deg,rgba(15,23,42,0.98),rgba(15,23,42,0.86))",
        border: "1px solid rgba(148,163,184,0.55)",
        boxShadow: "0 20px 40px rgba(15,23,42,0.95)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
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
          Requirement groups
        </div>
        <div style={{ fontSize: 13, color: "#e5e7eb" }}>
          Buckets that mirror how risk teams think about coverage.
        </div>
      </div>

      <div
        style={{
          marginTop: 8,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          maxHeight: 520,
          overflowY: "auto",
        }}
      >
        {groups.map((group) => (
          <GroupCard
            key={group.id}
            group={group}
            isSelected={group.id === selectedGroupId}
            onClick={() => onSelectGroup(group.id)}
          />
        ))}
      </div>
    </div>
  );
}

function GroupCard({ group, isSelected, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        position: "relative",
        borderRadius: 16,
        padding: "9px 10px 10px",
        background: isSelected
          ? "linear-gradient(135deg,rgba(56,189,248,0.18),rgba(37,99,235,0.06))"
          : "linear-gradient(135deg,rgba(15,23,42,0.96),rgba(15,23,42,0.94))",
        border: isSelected
          ? "1px solid rgba(59,130,246,0.9)"
          : "1px solid rgba(51,65,85,0.98)",
        boxShadow: isSelected
          ? "0 18px 38px rgba(37,99,235,0.45)"
          : "0 12px 28px rgba(15,23,42,0.95)",
        cursor: "pointer",
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        transition:
          "transform 0.12s ease-out, box-shadow 0.16s ease-out, border-color 0.12s ease-out, background 0.16s ease-out",
      }}
    >
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 999,
          background:
            "radial-gradient(circle at 30% 0,rgba(56,189,248,0.4),rgba(37,99,235,0.35),rgba(15,23,42,1))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 17 }}>{group.icon}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
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
    </div>
  );
}

/* ===========================
   REQUIREMENT BOARD
=========================== */
function RequirementBoard({
  group,
  requirements,
  severityFilter,
  onSeverityChange,
  showInactive,
  onToggleShowInactive,
  searchTerm,
  onSearchChange,
  onToggleActive,
  onUpdateLimit,
}) {
  return (
    <div
      style={{
        borderRadius: 24,
        padding: 16,
        background:
          "radial-gradient(circle at top left,rgba(15,23,42,0.97),rgba(15,23,42,0.9))",
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
            {group ? group.label : "Requirements"}
          </div>
          <div
            style={{
              fontSize: 13,
              color: "#e5e7eb",
              maxWidth: 420,
            }}
          >
            {group?.description ||
              "Select a group to define coverage, endorsement, and documentation requirements."}
          </div>
        </div>

        <div style={{ fontSize: 10, color: "#9ca3af", textAlign: "right" }}>
          Hybrid = numeric{" "}
          <span style={{ color: "#e5e7eb" }}>limits</span>, textual{" "}
          <span style={{ color: "#e5e7eb" }}>endorsements</span>, and{" "}
          <span style={{ color: "#e5e7eb" }}>documents</span> in one system.
        </div>
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 4,
        }}
      >
        {/* Severity chips */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "4px 6px",
            borderRadius: 999,
            background: "rgba(15,23,42,0.9)",
            border: "1px solid rgba(51,65,85,0.95)",
          }}
        >
          {["All", ...severityOptions].map((opt) => {
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

        {/* Search */}
        <div
          style={{
            flex: 1,
            minWidth: 140,
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 9px",
            borderRadius: 999,
            border: "1px solid rgba(51,65,85,0.95)",
            background: "rgba(15,23,42,0.95)",
          }}
        >
          <span style={{ fontSize: 13, color: "#6b7280" }}>🔍</span>
          <input
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search wording, docs, notes…"
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

        {/* Inactive toggle */}
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
        {group && requirements.length > 0 ? (
          requirements.map((req) => (
            <RequirementCard
              key={req.id}
              requirement={req}
              onToggleActive={() => onToggleActive(req.id)}
              onUpdateLimit={(val) => onUpdateLimit(req.id, val)}
            />
          ))
        ) : (
          <div
            style={{
              borderRadius: 18,
              border: "1px dashed rgba(75,85,99,0.95)",
              padding: "16px 14px",
              fontSize: 12,
              color: "#9ca3af",
            }}
          >
            {group
              ? "This group doesn’t have any requirements yet. Start with 2–3 non-negotiables, then layer more nuance."
              : "Select a group on the left to see its requirements."}
          </div>
        )}
      </div>
    </div>
  );
}

function RequirementCard({ requirement, onToggleActive, onUpdateLimit }) {
  const sev = requirementSeverityStyle(requirement.severity);

  return (
    <div
      style={{
        position: "relative",
        borderRadius: 18,
        padding: 12,
        background:
          "radial-gradient(circle at top left,rgba(15,23,42,0.98),rgba(15,23,42,0.92))",
        border: "1px solid rgba(51,65,85,0.98)",
        boxShadow: "0 18px 45px rgba(15,23,42,0.95)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: -2,
          background:
            "radial-gradient(circle at -10% -20%,rgba(56,189,248,0.25),transparent 60%)",
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
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "#e5e7eb",
                marginBottom: 4,
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
                overflow: "hidden",
              }}
            >
              {requirement.label}
            </div>

            {requirement.note && (
              <div
                style={{
                  fontSize: 11,
                  color: "#9ca3af",
                  lineHeight: 1.4,
                }}
              >
                {requirement.note}
              </div>
            )}
          </div>

          <button
            onClick={onToggleActive}
            style={{
              borderRadius: 999,
              padding: "3px 9px",
              border: "1px solid rgba(75,85,99,0.95)",
              background: requirement.active
                ? "radial-gradient(circle at top left,#22c55e,#15803d,#052e16)"
                : "rgba(15,23,42,0.96)",
              color: requirement.active ? "#bbf7d0" : "#9ca3af",
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: 0.8,
              cursor: "pointer",
            }}
          >
            {requirement.active ? "Active" : "Inactive"}
          </button>
        </div>

        <div
          style={{
            marginTop: 6,
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
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
                background: sev.text,
                boxShadow: `0 0 12px ${sev.text}`,
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
              {requirement.severity}
            </span>
          </div>

          {requirement.type === "coverage" && requirement.unit && (
            <div
              style={{
                fontSize: 11,
                color: "#9ca3af",
              }}
            >
              Field:{" "}
              <span style={{ color: "#e5e7eb" }}>{requirement.field}</span>
            </div>
          )}

          {requirement.type === "document" && requirement.docType && (
            <div
              style={{
                fontSize: 11,
                color: "#9ca3af",
              }}
            >
              Document:{" "}
              <span style={{ color: "#e5e7eb" }}>{requirement.docType}</span>
            </div>
          )}
        </div>

        {/* Body controls */}
        {requirement.type === "coverage" && (
          <div
            style={{
              marginTop: 10,
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "#9ca3af",
              }}
            >
              Required limit
            </div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 8px",
                borderRadius: 999,
                background: "rgba(15,23,42,0.96)",
                border: "1px solid rgba(30,64,175,0.9)",
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: "#6b7280",
                }}
              >
                $
              </span>
              <input
                type="number"
                value={requirement.requiredLimit ?? ""}
                onChange={(e) =>
                  onUpdateLimit(
                    e.target.value === ""
                      ? null
                      : Number(e.target.value || 0)
                  )
                }
                style={{
                  width: 90,
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  color: "#e5e7eb",
                  fontSize: 12,
                }}
              />
              {requirement.unit && (
                <span
                  style={{
                    fontSize: 11,
                    color: "#9ca3af",
                  }}
                >
                  {requirement.unit}
                </span>
              )}
            </div>
          </div>
        )}

        {requirement.type === "endorsement" && (
          <div style={{ marginTop: 10 }}>
            <div
              style={{
                fontSize: 11,
                color: "#9ca3af",
                marginBottom: 4,
              }}
            >
              Required wording (hint)
            </div>
            <div
              style={{
                borderRadius: 10,
                padding: "7px 8px",
                border: "1px dashed rgba(51,65,85,0.95)",
                background: "rgba(15,23,42,0.98)",
                fontSize: 11,
                color: "#e5e7eb",
                lineHeight: 1.4,
              }}
            >
              {requirement.wordingHint ||
                "Describe the endorsement language you expect to see on the policy or COI."}
            </div>
          </div>
        )}

        {requirement.type === "document" && (
          <div style={{ marginTop: 10 }}>
            <div
              style={{
                fontSize: 11,
                color: "#9ca3af",
                marginBottom: 4,
              }}
            >
              Document check
            </div>
            <div
              style={{
                borderRadius: 10,
                padding: "7px 8px",
                border: "1px dashed rgba(51,65,85,0.95)",
                background: "rgba(15,23,42,0.98)",
                fontSize: 11,
                color: "#e5e7eb",
                lineHeight: 1.4,
              }}
            >
              Engine will confirm at least one{" "}
              <span style={{ color: "#e5e7eb" }}>
                {requirement.docType || "required document"}
              </span>{" "}
              is on file and current.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ===========================
   SCORING PANEL
=========================== */
function RequirementScoringPanel({
  groups,
  requirementsByGroup,
  selectedGroup,
}) {
  const totalRequirements = useMemo(() => {
    return Object.values(requirementsByGroup).reduce(
      (sum, list) => sum + (list?.length || 0),
      0
    );
  }, [requirementsByGroup]);

  const activeRequirements = useMemo(() => {
    return Object.values(requirementsByGroup).reduce(
      (sum, list) => sum + (list || []).filter((r) => r.active).length,
      0
    );
  }, [requirementsByGroup]);

  const severityWeights = {
    Critical: 4,
    High: 3,
    Medium: 2,
    Low: 1,
  };

  const weightedActiveScore = useMemo(() => {
    let score = 0;
    let maxPossible = 0;
    Object.values(requirementsByGroup).forEach((list) => {
      (list || []).forEach((r) => {
        const weight = severityWeights[r.severity] || 1;
        maxPossible += weight;
        if (r.active) {
          score += weight;
        }
      });
    });
    if (maxPossible === 0) return 0;
    return Math.round((score / maxPossible) * 100);
  }, [requirementsByGroup]);

  const coverageCount = useMemo(() => {
    let total = 0;
    let active = 0;
    Object.values(requirementsByGroup).forEach((list) => {
      (list || []).forEach((r) => {
        if (r.type === "coverage") {
          total += 1;
          if (r.active) active += 1;
        }
      });
    });
    return { total, active };
  }, [requirementsByGroup]);

  const endorsementCount = useMemo(() => {
    let total = 0;
    let active = 0;
    Object.values(requirementsByGroup).forEach((list) => {
      (list || []).forEach((r) => {
        if (r.type === "endorsement") {
          total += 1;
          if (r.active) active += 1;
        }
      });
    });
    return { total, active };
  }, [requirementsByGroup]);

  const documentCount = useMemo(() => {
    let total = 0;
    let active = 0;
    Object.values(requirementsByGroup).forEach((list) => {
      (list || []).forEach((r) => {
        if (r.type === "document") {
          total += 1;
          if (r.active) active += 1;
        }
      });
    });
    return { total, active };
  }, [requirementsByGroup]);

  const coverageScore =
    coverageCount.total === 0
      ? 0
      : Math.round((coverageCount.active / coverageCount.total) * 100);
  const endorsementScore =
    endorsementCount.total === 0
      ? 0
      : Math.round((endorsementCount.active / endorsementCount.total) * 100);
  const documentScore =
    documentCount.total === 0
      ? 0
      : Math.round((documentCount.active / documentCount.total) * 100);

  const blendedScore = Math.round(
    (coverageScore * 0.4 +
      endorsementScore * 0.3 +
      documentScore * 0.2 +
      weightedActiveScore * 0.1) /
      1
  );

  return (
    <div
      style={{
        borderRadius: 24,
        padding: 16,
        background:
          "radial-gradient(circle at top right,rgba(15,23,42,0.9),rgba(15,23,42,1))",
        border: "1px solid rgba(148,163,184,0.55)",
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
        Requirements completeness
      </div>

      {/* Gauge + metrics */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        {/* Gauge */}
        <div
          style={{
            position: "relative",
            width: 112,
            height: 112,
            borderRadius: "50%",
            background:
              "conic-gradient(from 220deg,#22c55e,#a3e635,#facc15,#fb7185,#0f172a)",
            padding: 4,
            boxShadow:
              "0 0 55px rgba(34,197,94,0.35),0 0 110px rgba(248,250,252,0.15)",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 10,
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 30% 0,#020617,#020617 55%,#000)",
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
            }}
          >
            <div
              style={{
                fontSize: 11,
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
                  "linear-gradient(120deg,#22c55e,#bef264,#facc15)",
                WebkitBackgroundClip: "text",
                color: "transparent",
              }}
            >
              {blendedScore}
            </div>
            <div
              style={{
                fontSize: 10,
                color: "#6b7280",
              }}
            >
              out of 100
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              color: "#e5e7eb",
              marginBottom: 6,
            }}
          >
            Blueprint coverage snapshot
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2,minmax(0,1fr))",
              gap: 8,
            }}
          >
            <MetricPill
              label="Active requirements"
              value={`${activeRequirements} / ${totalRequirements}`}
              barValue={
                totalRequirements === 0
                  ? 0
                  : Math.round(
                      (activeRequirements / totalRequirements) * 100
                    )
              }
              hint="How much of your blueprint is currently live."
            />
            <MetricPill
              label="Weighted severity"
              value={`${weightedActiveScore} / 100`}
              barValue={weightedActiveScore}
              hint="How strong your active requirements are against risk."
            />
          </div>
        </div>
      </div>

      {/* Category breakdown */}
      <div
        style={{
          marginTop: 4,
          borderRadius: 16,
          padding: 10,
          background: "rgba(15,23,42,0.98)",
          border: "1px solid rgba(51,65,85,0.98)",
          display: "grid",
          gridTemplateColumns: "repeat(3,minmax(0,1fr))",
          gap: 8,
          fontSize: 11,
        }}
      >
        <CategoryChip
          label="Coverage"
          score={coverageScore}
          detail={`${coverageCount.active} / ${coverageCount.total} active`}
        />
        <CategoryChip
          label="Endorsements"
          score={endorsementScore}
          detail={`${endorsementCount.active} / ${endorsementCount.total} active`}
        />
        <CategoryChip
          label="Documents"
          score={documentScore}
          detail={`${documentCount.active} / ${documentCount.total} active`}
        />
      </div>

      {/* Selected group preview */}
      <div
        style={{
          marginTop: 4,
          borderRadius: 16,
          padding: 10,
          background: "rgba(15,23,42,0.96)",
          border: "1px solid rgba(51,65,85,0.98)",
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
              "radial-gradient(circle at 30% 0,rgba(56,189,248,0.3),rgba(15,23,42,1))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 18 }}>{selectedGroup?.icon || "🧩"}</span>
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
              "Requirements here become part of the unified compliance score your ops team sees."}
          </div>
          {selectedGroup && (
            <div
              style={{
                fontSize: 11,
                color: "#6b7280",
              }}
            >
              {(requirementsByGroup[selectedGroup.id] || []).filter(
                (r) => r.active
              ).length}{" "}
              active ·{" "}
              {(requirementsByGroup[selectedGroup.id] || []).length} total
              requirements in this lane.
            </div>
          )}
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
        When this score nudges into the{" "}
        <span style={{ color: "#22c55e" }}>90s</span>, you’re no longer
        guessing if vendors “probably meet requirements” — the blueprint itself
        proves it.
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
        background: "rgba(15,23,42,0.98)",
        border: "1px solid rgba(51,65,85,0.98)",
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
          background: "rgba(30,41,59,0.98)",
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
      <div
        style={{
          fontSize: 10,
          color: "#6b7280",
        }}
      >
        {hint}
      </div>
    </div>
  );
}

function CategoryChip({ label, score, detail }) {
  return (
    <div
      style={{
        borderRadius: 12,
        padding: 8,
        border: "1px solid rgba(51,65,85,0.98)",
        background: "rgba(15,23,42,0.98)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 4,
        }}
      >
        <div
          style={{
            fontSize: 11,
            color: "#e5e7eb",
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "#a5b4fc",
          }}
        >
          {score}%
        </div>
      </div>
      <div
        style={{
          fontSize: 10,
          color: "#6b7280",
        }}
      >
        {detail}
      </div>
    </div>
  );
}
