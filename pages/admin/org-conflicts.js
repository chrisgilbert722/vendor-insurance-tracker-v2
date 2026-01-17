// pages/admin/org-conflicts.js
// ============================================================
// ORG CONFLICT INTELLIGENCE UI — V5
// Shows AI-analyzed rule conflicts for the ACTIVE ORG ONLY.
// Powered by /api/requirements-v5/conflicts?orgId=...
// ============================================================

import { useEffect, useState } from "react";
import { useOrg } from "../../context/OrgContext";

const GP = {
  bg: "#020617",
  panel: "rgba(15,23,42,0.98)",
  border: "rgba(51,65,85,0.9)",
  text: "#e5e7eb",
  textSoft: "#9ca3af",
  neonBlue: "#38bdf8",
  neonPurple: "#a855f7",
  neonGreen: "#22c55e",
  neonGold: "#facc15",
  neonRed: "#fb7185",
};

export default function OrgConflictsPage() {
  const { activeOrgId } = useOrg();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [conflicts, setConflicts] = useState([]);
  const [aiDetails, setAiDetails] = useState([]);
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Listen for visibility changes and custom events to trigger refetch
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setRefreshKey((k) => k + 1);
      }
    };

    const handleDataChanged = () => {
      setRefreshKey((k) => k + 1);
    };

    const handleStorage = (e) => {
      if (e?.key === "policies:changed" || e?.key === "vendors:changed") {
        handleDataChanged();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("policies:changed", handleDataChanged);
    window.addEventListener("vendors:changed", handleDataChanged);
    window.addEventListener("onboarding:complete", handleDataChanged);
    window.addEventListener("storage", handleStorage);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("policies:changed", handleDataChanged);
      window.removeEventListener("vendors:changed", handleDataChanged);
      window.removeEventListener("onboarding:complete", handleDataChanged);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    if (!activeOrgId) {
      setLoading(false);
      return;
    }

    async function loadConflicts() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(
          `/api/requirements-v5/conflicts?orgId=${activeOrgId}`
        );
        const json = await res.json();

        if (!json.ok) {
          throw new Error(json.error || "Failed to load conflicts.");
        }

        const logic = json.logicConflicts || [];
        const ai = json.aiDetails || [];

        setConflicts(logic);
        setAiDetails(ai);
      } catch (err) {
        console.error("[OrgConflicts] ERROR:", err);
        setError(err.message || "Failed to load conflicts.");
      } finally {
        setLoading(false);
      }
    }

    loadConflicts();
  }, [activeOrgId, refreshKey]);

  if (!activeOrgId) {
    return (
      <Page>
        <h1>Select an organization to view rule conflicts.</h1>
      </Page>
    );
  }

  if (loading) {
    return (
      <Page>
        <h1>Analyzing rule conflicts…</h1>
      </Page>
    );
  }

  if (error) {
    return (
      <Page>
        <h1>Org Conflict Intelligence</h1>
        <p style={{ color: GP.neonRed, marginTop: 8 }}>{error}</p>
      </Page>
    );
  }

  // Derive conflict types & filtered list
  const uniqueTypes = Array.from(
    new Set(conflicts.map((c) => c.type || "Unknown"))
  );

  const filteredConflicts = conflicts.filter((c, idx) => {
    const type = c.type || "Unknown";
    const matchesType =
      typeFilter === "all" ? true : type === typeFilter;
    const text = `${c.message || ""} ${
      aiDetails[idx]?.explanation || ""
    } ${aiDetails[idx]?.recommendation || ""}`.toLowerCase();
    const matchesSearch = !search
      ? true
      : text.includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  const totalConflicts = conflicts.length;

  return (
    <Page>
      {/* HEADER */}
      <div style={headerRow}>
        <div>
          <div style={breadcrumb}>
            <span>Admin</span>
            <span>/</span>
            <span>Org Conflicts</span>
          </div>

          <h1 style={title}>
            Org Conflict Intelligence •{" "}
            <span style={titleGradient}>Active Org</span>
          </h1>

          <p style={{ fontSize: 13, color: GP.textSoft, marginTop: 4 }}>
            AI-analyzed rule conflicts detected in this organization’s V5
            coverage requirements.
          </p>
        </div>
      </div>

      {/* SNAPSHOT STRIP */}
      <div style={snapshotGrid}>
        <SnapCard
          label="Total Conflicts"
          value={totalConflicts}
          color={totalConflicts > 0 ? GP.neonRed : GP.neonGreen}
        />
        <SnapCard
          label="Conflict Types"
          value={uniqueTypes.length}
          color={GP.neonBlue}
        />
        <SnapCard
          label="With AI Details"
          value={aiDetails.length}
          color={GP.neonPurple}
        />
      </div>

      {/* FILTER BAR */}
      <div
        style={{
          marginTop: 20,
          marginBottom: 12,
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        {/* Type Filter */}
        <div>
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 1.2,
              color: GP.textSoft,
              marginBottom: 4,
            }}
          >
            Conflict Type
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              border: `1px solid ${GP.border}`,
              background: GP.panel,
              color: GP.text,
              fontSize: 12,
              outline: "none",
            }}
          >
            <option value="all">All Types</option>
            {uniqueTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div style={{ flex: 1, minWidth: 220 }}>
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 1.2,
              color: GP.textSoft,
              marginBottom: 4,
            }}
          >
            Search
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conflicts, explanations, recommendations…"
            style={{
              width: "100%",
              padding: "7px 10px",
              borderRadius: 999,
              border: `1px solid ${GP.border}`,
              background: "rgba(15,23,42,0.96)",
              color: GP.text,
              fontSize: 12,
              outline: "none",
            }}
          />
        </div>
      </div>

      {/* CONFLICT LIST */}
      <Panel title="Detected Conflicts" color={GP.neonBlue}>
        {filteredConflicts.length === 0 ? (
          <Empty text="No conflicts match the current filters." />
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              maxHeight: 480,
              overflowY: "auto",
              paddingRight: 4,
            }}
          >
            {filteredConflicts.map((c, idx) => {
              // Find original index so we match the AI details correctly
              const originalIndex = conflicts.indexOf(c);
              const ai = aiDetails[originalIndex] || null;

              return (
                <ConflictCard
                  key={`${c.type}-${originalIndex}-${idx}`}
                  conflict={c}
                  ai={ai}
                  index={originalIndex}
                  expanded={expandedIndex === originalIndex}
                  onToggle={() =>
                    setExpandedIndex(
                      expandedIndex === originalIndex ? null : originalIndex
                    )
                  }
                />
              );
            })}
          </div>
        )}
      </Panel>
    </Page>
  );
}

/* ============================================================
   SUPPORT COMPONENTS + STYLES
============================================================ */

function Page({ children }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left,#020617 0,#020617 45%,#000 100%)",
        padding: "32px 40px",
        color: GP.text,
        position: "relative",
      }}
    >
      {/* Aura */}
      <div
        style={{
          position: "absolute",
          top: -260,
          left: "50%",
          transform: "translateX(-50%)",
          width: 1100,
          height: 1100,
          background:
            "radial-gradient(circle, rgba(56,189,248,0.35), transparent 60%)",
          filter: "blur(120px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
}

function Panel({ title, color, children }) {
  return (
    <div
      style={{
        borderRadius: 20,
        padding: 16,
        border: `1px solid ${color}55`,
        background: GP.panel,
        marginTop: 20,
      }}
    >
      <h2
        style={{
          marginTop: 0,
          marginBottom: 10,
          fontSize: 16,
          color,
        }}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}

function Empty({ text }) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 12,
        border: `1px dashed ${GP.border}`,
        background: "rgba(15,23,42,0.9)",
        color: GP.textSoft,
        fontSize: 13,
        textAlign: "center",
      }}
    >
      {text}
    </div>
  );
}

function SnapCard({ label, value, color }) {
  return (
    <div
      style={{
        borderRadius: 16,
        padding: 14,
        border: `1px solid ${color}55`,
        background: GP.panel,
      }}
    >
      <div style={{ fontSize: 12, color: GP.textSoft }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function ConflictCard({ conflict, ai, index, expanded, onToggle }) {
  const type = conflict.type || "Unknown";
  const values =
    Array.isArray(conflict.values) && conflict.values.length
      ? conflict.values
      : null;
  const ruleIds =
    Array.isArray(conflict.ruleIds) && conflict.ruleIds.length
      ? conflict.ruleIds
      : null;

  return (
    <div
      style={{
        borderRadius: 16,
        padding: 12,
        border: "1px solid rgba(148,163,184,0.7)",
        background:
          "radial-gradient(circle at top left,rgba(15,23,42,0.98),rgba(15,23,42,0.94))",
        boxShadow: "0 12px 30px rgba(15,23,42,0.9)",
      }}
    >
      {/* Top row: type + index */}
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
            fontSize: 12,
            fontWeight: 600,
            color: GP.neonBlue,
          }}
        >
          {type}
        </div>
        <div
          style={{
            fontSize: 11,
            color: GP.textSoft,
          }}
        >
          Conflict #{index + 1}
        </div>
      </div>

      {/* Message */}
      <div
        style={{
          fontSize: 13,
          color: GP.text,
          marginBottom: 4,
        }}
      >
        {conflict.message}
      </div>

      {/* Values / Rule IDs */}
      {values && (
        <div
          style={{
            fontSize: 11,
            color: GP.textSoft,
            marginBottom: 2,
          }}
        >
          Values: {values.join(", ")}
        </div>
      )}

      {ruleIds && (
        <div
          style={{
            fontSize: 11,
            color: GP.textSoft,
            marginBottom: 6,
          }}
        >
          Rules Involved: {ruleIds.join(", ")}
        </div>
      )}

      {/* AI Explanation toggle */}
      {ai ? (
        <>
          <button
            onClick={onToggle}
            style={{
              marginTop: 4,
              borderRadius: 999,
              padding: "5px 10px",
              border: "1px solid rgba(56,189,248,0.8)",
              background: "rgba(15,23,42,0.96)",
              color: "#7dd3fc",
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            {expanded ? "Hide AI Explanation" : "Show AI Explanation"}
          </button>

          {expanded && (
            <div
              style={{
                marginTop: 8,
                borderRadius: 10,
                padding: 10,
                border: "1px solid rgba(56,189,248,0.5)",
                background: "rgba(15,23,42,0.98)",
                fontSize: 12,
                color: GP.text,
              }}
            >
              {ai.explanation && (
                <div style={{ marginBottom: 6 }}>
                  <div
                    style={{
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: 1.1,
                      color: GP.textSoft,
                      marginBottom: 2,
                    }}
                  >
                    Explanation
                  </div>
                  <div>{ai.explanation}</div>
                </div>
              )}

              {ai.impact && (
                <div style={{ marginBottom: 6 }}>
                  <div
                    style={{
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: 1.1,
                      color: GP.textSoft,
                      marginBottom: 2,
                    }}
                  >
                    Impact
                  </div>
                  <div>{ai.impact}</div>
                </div>
              )}

              {ai.recommendation && (
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: 1.1,
                      color: GP.textSoft,
                      marginBottom: 2,
                    }}
                  >
                    Recommendation
                  </div>
                  <div>{ai.recommendation}</div>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div
          style={{
            marginTop: 6,
            fontSize: 11,
            color: GP.textSoft,
          }}
        >
          AI explanation not available for this conflict.
        </div>
      )}
    </div>
  );
}

/* ======= STYLES ======= */

const headerRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  flexWrap: "wrap",
  marginBottom: 18,
};

const breadcrumb = {
  fontSize: 12,
  color: GP.textSoft,
  marginBottom: 6,
  display: "flex",
  gap: 8,
  alignItems: "center",
};

const title = {
  margin: 0,
  fontSize: 24,
  fontWeight: 600,
  color: GP.text,
};

const titleGradient = {
  background: "linear-gradient(90deg,#38bdf8,#a855f7,#f97316)",
  WebkitBackgroundClip: "text",
  color: "transparent",
};

const snapshotGrid = {
  marginTop: 20,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: 14,
};
