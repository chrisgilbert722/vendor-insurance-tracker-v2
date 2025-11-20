// pages/admin/alerts.js
import { useState, useMemo, useEffect } from "react";

/* ===========================
   THEME TOKENS (match other admin UIs)
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
  surface: "#0B1220",
  border: "#1E293B",
};

/* ===========================
   LIVE SEVERITY MAPPING
=========================== */
function getSeverity(type, message = "") {
  if (type === "rule_failure" && message.includes("Critical")) return "Critical";
  if (type === "rule_failure" && message.includes("High")) return "High";
  if (type === "rule_failure") return "Medium";
  if (type === "requirement_failure") return "High";
  return "Low";
}

/* ===========================
   MAIN PAGE
=========================== */
export default function AlertsDashboardPage() {
  const [alerts, setAlerts] = useState([]);
  const [severityFilter, setSeverityFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("Open");
  const [timeFilter, setTimeFilter] = useState("7d");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAlertId, setSelectedAlertId] = useState(null);

  /* ===========================
     STEP 2 — LOAD LIVE ALERTS
  ============================ */
  useEffect(() => {
    async function loadAlerts() {
      try {
        const res = await fetch(`/api/alerts/list?orgId=2`);
        const data = await res.json();
        if (data.ok && Array.isArray(data.alerts)) {
          // Inject severity dynamically
          const processed = data.alerts.map(a => ({
            ...a,
            severity: a.severity || getSeverity(a.type, a.message),
          }));
          setAlerts(processed);
          if (processed.length > 0) {
            setSelectedAlertId(processed[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load alerts:", err);
      }
    }
    loadAlerts();
  }, []);
  /* ===========================
     FILTERED ALERTS (using state)
  ============================ */
  const filteredAlerts = useMemo(() => {
    const now = new Date();
    const cutoff = new Date(now);

    if (timeFilter === "24h") cutoff.setDate(now.getDate() - 1);
    else if (timeFilter === "7d") cutoff.setDate(now.getDate() - 7);
    else if (timeFilter === "30d") cutoff.setDate(now.getDate() - 30);
    else cutoff.setFullYear(now.getFullYear() - 5); // "All time"

    return alerts.filter((a) => {
      if (severityFilter !== "All" && a.severity !== severityFilter) return false;
      if (typeFilter !== "All" && a.type !== typeFilter) return false;
      if (statusFilter !== "All" && a.status !== statusFilter) return false;

      if (a.createdAt && new Date(a.createdAt) < cutoff) return false;

      if (!searchTerm) return true;

      const haystack = [
        a.title,
        a.vendorName,
        a.vendorCategory,
        a.message,
        a.ruleLabel,
        a.requirementLabel,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(searchTerm.toLowerCase());
    });
  }, [alerts, severityFilter, typeFilter, statusFilter, timeFilter, searchTerm]);

  /* ===========================
     SELECTED ALERT
  ============================ */
  const selectedAlert = useMemo(() => {
    return (
      filteredAlerts.find((a) => a.id === selectedAlertId) ||
      filteredAlerts[0] ||
      null
    );
  }, [filteredAlerts, selectedAlertId]);

  /* ===========================
     LIVE STATS
  ============================ */
  const stats = useMemo(() => {
    const open = alerts.filter((a) => a.status === "Open");
    const openCount = open.length;

    const critHighOpen = open.filter(
      (a) => a.severity === "Critical" || a.severity === "High"
    ).length;

    const today = new Date();
    const last24h = alerts.filter(
      (a) => today - new Date(a.createdAt) <= 24 * 60 * 60 * 1000
    ).length;

    const coverage = open.filter((a) => a.type === "Coverage").length;
    const endorsements = open.filter((a) => a.type === "Endorsement").length;
    const docs = open.filter((a) => a.type === "Document").length;
    const rules = open.filter((a) => a.type === "Rule" || a.type === "rule_failure").length;

    let weighted = 0;
    let maxWeighted = 0;

    open.forEach((a) => {
      const sevWeight = { Critical: 4, High: 3, Medium: 2, Low: 1 }[a.severity] || 1;
      weighted += sevWeight;
      maxWeighted += 4;
    });

    const weightedScore =
      maxWeighted === 0 ? 0 : Math.round((weighted / maxWeighted) * 100);

    return {
      openCount,
      critHighOpen,
      last24h,
      coverage,
      endorsements,
      docs,
      rules,
      weightedScore,
    };
  }, [alerts]);
  /* ===========================
     PAGE UI — MAIN RETURN
  ============================ */
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
      {/* ===========================
          HEADER
      ============================ */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 24,
          marginBottom: 24,
        }}
      >
        {/* LEFT SIDE HEADER CONTENT */}
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
                "linear-gradient(90deg,rgba(15,23,42,0.95),rgba(15,23,42,0.35))",
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
                  "radial-gradient(circle at 30% 0,#f97316,#facc15,#b45309)",
                boxShadow: "0 0 25px rgba(248,181,82,0.6)",
                fontSize: 14,
              }}
            >
              🚨
            </span>
            <span
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 1.2,
                color: "#e5e7eb",
              }}
            >
              Alerts Dashboard V2
            </span>
            <span
              style={{
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: 1,
                color: "#facc15",
              }}
            >
              Real-time risk pulse
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
            See{" "}
            <span
              style={{
                background:
                  "linear-gradient(90deg,#fb7185,#fde68a,#22c55e,#38bdf8)",
                WebkitBackgroundClip: "text",
                color: "transparent",
              }}
            >
              every compliance issue
            </span>{" "}
            before it reaches finance, ops, or your insurer.
          </h1>

          <p
            style={{
              marginTop: 8,
              marginBottom: 0,
              color: "#cbd5f5",
              fontSize: 13,
              maxWidth: 720,
            }}
          >
            This is the live feed of your rule engine and requirements engine
            firing. Every card is a vendor, a policy, an endorsement, or a
            document that needs attention.
          </p>
        </div>

        {/* ===========================
            QUICK STATS SUMMARY
        ============================ */}
        <div
          style={{
            padding: 12,
            borderRadius: 20,
            border: "1px solid rgba(148,163,184,0.55)",
            background:
              "radial-gradient(circle at top,#020617,#020617 70%,#020617 100%)",
            boxShadow: "0 22px 50px rgba(15,23,42,0.95)",
            minWidth: 260,
          }}
        >
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 1.2,
              color: "#9ca3af",
              marginBottom: 4,
            }}
          >
            Live risk snapshot
          </div>
          <div
            style={{
              fontSize: 13,
              color: "#e5e7eb",
              marginBottom: 4,
            }}
          >
            {stats.openCount} open alerts · {stats.critHighOpen} critical / high
          </div>
          <div
            style={{
              fontSize: 11,
              color: "#9ca3af",
            }}
          >
            {stats.last24h} new in the last 24 hours.
          </div>

          {/* RISK BAR */}
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
                width: `${stats.weightedScore || 5}%`,
                height: "100%",
                background:
                  "linear-gradient(90deg,#fb7185,#facc15,#22c55e,#38bdf8)",
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
            Weighted by severity. The hotter this bar, the more your team should
            live in this screen.
          </div>
        </div>
      </div>

      {/* ===========================
          MAIN GRID
      ============================ */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1.6fr) minmax(0,1.1fr)",
          gap: 18,
          alignItems: "stretch",
        }}
      >
        {/* ===========================
            LEFT SIDE (Filters + Timeline)
        ============================ */}
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
            gap: 12,
          }}
        >
          {/* ===========================
              FILTERS ROW
          ============================ */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 8,
            }}
          >
            {/* ===== Severity chips ===== */}
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
              {["All", "Critical", "High", "Medium", "Low"].map((sev) => {
                const active = sev === severityFilter;
                return (
                  <button
                    key={sev}
                    onClick={() => setSeverityFilter(sev)}
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
                    {sev}
                  </button>
                );
              })}
            </div>

            {/* ===== Type filter ===== */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{
                borderRadius: 999,
                padding: "5px 10px",
                border: "1px solid rgba(51,65,85,0.95)",
                background: "rgba(15,23,42,0.95)",
                color: "#e5e7eb",
                fontSize: 11,
              }}
            >
              <option value="All">All types</option>
              <option value="Coverage">Coverage</option>
              <option value="Endorsement">Endorsements</option>
              <option value="Document">Documents</option>
              <option value="Rule">Rule triggers</option>
              <option value="rule_failure">Rule failures</option>
              <option value="requirement_failure">Requirement failures</option>
            </select>

            {/* ===== Status filter ===== */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                borderRadius: 999,
                padding: "5px 10px",
                border: "1px solid rgba(51,65,85,0.95)",
                background: "rgba(15,23,42,0.95)",
                color: "#e5e7eb",
                fontSize: 11,
              }}
            >
              <option value="Open">Open only</option>
              <option value="All">All (open + resolved)</option>
            </select>

            {/* ===== Time filter ===== */}
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              style={{
                borderRadius: 999,
                padding: "5px 10px",
                border: "1px solid rgba(51,65,85,0.95)",
                background: "rgba(15,23,42,0.95)",
                color: "#e5e7eb",
                fontSize: 11,
              }}
            >
              <option value="24h">Last 24h</option>
              <option value="7d">Last 7d</option>
              <option value="30d">Last 30d</option>
              <option value="all">All time</option>
            </select>
          </div>

          {/* ===========================
              SEARCH BAR
          ============================ */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 10px",
              borderRadius: 999,
              border: "1px solid rgba(51,65,85,0.95)",
              background: "rgba(15,23,42,0.95)",
            }}
          >
            <span style={{ fontSize: 13, color: "#6b7280" }}>🔍</span>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search vendors, alerts, rules, requirements…"
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

          {/* ===========================
              TIMELINE SECTION
          ============================ */}
          <div
            style={{
              marginTop: 4,
              borderRadius: 18,
              padding: "8px 10px 10px",
              background: "rgba(15,23,42,0.98)",
              border: "1px solid rgba(51,65,85,0.98)",
              maxHeight: 530,
              overflowY: "auto",
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "#9ca3af",
                marginBottom: 6,
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>Alerts timeline</span>
              <span>
                Showing{" "}
                <span style={{ color: "#e5e7eb" }}>
                  {filteredAlerts.length}
                </span>{" "}
                of {alerts.length}
              </span>
            </div>

            {/* TIMELINE LIST */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                position: "relative",
              }}
            >
              {/* Vertical line */}
              <div
                style={{
                  position: "absolute",
                  left: 10,
                  top: 0,
                  bottom: 0,
                  width: 2,
                  background:
                    "linear-gradient(to bottom,rgba(56,189,248,0.3),rgba(56,189,248,0))",
                }}
              />

              {/* ===== MAP ALERTS ===== */}
              {filteredAlerts.map((alert, idx) => (
                <AlertTimelineItem
                  key={alert.id}
                  alert={alert}
                  isFirst={idx === 0}
                  isSelected={alert.id === selectedAlert?.id}
                  onSelect={() => setSelectedAlertId(alert.id)}
                />
              ))}

              {filteredAlerts.length === 0 && (
                <div
                  style={{
                    padding: "14px 10px",
                    borderRadius: 14,
                    border: "1px dashed rgba(75,85,99,0.95)",
                    fontSize: 12,
                    color: "#9ca3af",
                    background: "rgba(15,23,42,0.96)",
                  }}
                >
                  No alerts match your filters. Try broadening severity, type,
                  or timeframe.
                </div>
              )}
            </div>
          </div>
        </div>
        {/* ===========================
            RIGHT SIDE (Heatmap + Selected Alert)
        ============================ */}
        <RightPanel
          stats={stats}
          alerts={alerts}
          selectedAlert={selectedAlert}
        />
      </div>

      {/* Tiny keyframes hook for pulsing dots */}
      <style jsx>{`
        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.35);
            opacity: 0.4;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

/* ===========================
   RIGHT PANEL
=========================== */
function RightPanel({ stats, alerts, selectedAlert }) {
  return (
    <div
      style={{
        borderRadius: 24,
        padding: 16,
        background:
          "radial-gradient(circle at top right,rgba(15,23,42,0.92),rgba(15,23,42,1))",
        border: "1px solid rgba(148,163,184,0.55)",
        boxShadow: "0 24px 60px rgba(15,23,42,0.95)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {/* Top section: heatmap + categories */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1.4fr) minmax(0,1.1fr)",
          gap: 10,
          alignItems: "stretch",
        }}
      >
        <HeatmapCard alerts={alerts} />
        <CategoryBreakdown stats={stats} />
      </div>

      {/* Bottom section: selected alert detail */}
      <SelectedAlertDetail alert={selectedAlert} />
    </div>
  );
}

/* ===========================
   HEATMAP CARD
=========================== */
function HeatmapCard({ alerts }) {
  // 7 days × 4 slots (6-hour windows)
  const now = new Date();
  const grid = [];

  for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
    const col = [];
    for (let slot = 0; slot < 4; slot++) {
      const slotStart = new Date(now);
      slotStart.setDate(now.getDate() - dayOffset);
      slotStart.setHours(6 * slot, 0, 0, 0);

      const slotEnd = new Date(slotStart);
      slotEnd.setHours(slotStart.getHours() + 6);

      const count = alerts.filter((a) => {
        if (!a.createdAt) return false;
        const t = new Date(a.createdAt);
        return t >= slotStart && t < slotEnd;
      }).length;

      col.push(count);
    }
    grid.push(col);
  }

  const maxCount = grid.flat().reduce((max, v) => Math.max(max, v), 1);

  function cellColor(count) {
    if (count === 0) return "rgba(15,23,42,1)";

    const intensity = count / maxCount;
    return `rgba(248,181,82,${0.15 + intensity * 0.55})`;
  }

  return (
    <div
      style={{
        borderRadius: 18,
        padding: 10,
        background: "rgba(15,23,42,0.98)",
        border: "1px solid rgba(51,65,85,0.98)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "#9ca3af",
          marginBottom: 6,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>Risk pulse (last 7 days)</span>
        <span style={{ color: "#e5e7eb" }}>{alerts.length} total events</span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${grid.length},12px)`,
          gap: 4,
          alignItems: "flex-end",
          justifyContent: "flex-start",
          paddingTop: 4,
          paddingBottom: 4,
        }}
      >
        {grid.map((col, colIndex) => (
          <div
            key={colIndex}
            style={{
              display: "grid",
              gridTemplateRows: `repeat(${col.length},12px)`,
              gap: 4,
            }}
          >
            {col.map((count, rowIndex) => (
              <div
                key={rowIndex}
                title={`${count} event${count === 1 ? "" : "s"}`}
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 4,
                  background: cellColor(count),
                  border:
                    count === 0
                      ? "1px solid rgba(30,41,59,1)"
                      : "1px solid rgba(251,191,36,0.6)",
                  boxShadow:
                    count > 0 ? "0 0 10px rgba(248,181,82,0.7)" : "none",
                }}
              />
            ))}
          </div>
        ))}
      </div>

      <div
        style={{ fontSize: 10, color: "#6b7280", marginTop: 4 }}
      >
        Brighter cells = more alerts fired in that window.
      </div>
    </div>
  );
}

/* ===========================
   CATEGORY BREAKDOWN
=========================== */
function CategoryBreakdown({ stats }) {
  const items = [
    {
      label: "Coverage",
      count: stats.coverage,
      hint: "Limits below blueprint or missing.",
    },
    {
      label: "Endorsements",
      count: stats.endorsements,
      hint: "AI, waiver, primary/non-contrib issues.",
    },
    {
      label: "Documents",
      count: stats.docs,
      hint: "Expired or missing COIs / contracts.",
    },
    {
      label: "Rule triggers",
      count: stats.rules,
      hint: "Triggered by logic in Elite Rules.",
    },
  ];

  return (
    <div
      style={{
        borderRadius: 18,
        padding: 10,
        background: "rgba(15,23,42,0.98)",
        border: "1px solid rgba(51,65,85,0.98)",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "#9ca3af",
          marginBottom: 2,
        }}
      >
        Where alerts are coming from
      </div>

      {items.map((item) => (
        <div
          key={item.label}
          style={{
            borderRadius: 12,
            padding: 7,
            border: "1px solid rgba(51,65,85,0.98)",
            background: "rgba(15,23,42,1)",
            fontSize: 11,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 3,
            }}
          >
            <span style={{ color: "#e5e7eb" }}>{item.label}</span>
            <span style={{ color: "#a5b4fc" }}>{item.count} open</span>
          </div>
          <div style={{ color: "#6b7280" }}>{item.hint}</div>
        </div>
      ))}
    </div>
  );
}
/* ===========================
   SELECTED ALERT DETAIL
=========================== */
function SelectedAlertDetail({ alert }) {
  if (!alert) return null;

  const sev = severityPillStyle(alert.severity);

  return (
    <div
      style={{
        borderRadius: 18,
        padding: 12,
        background: "rgba(15,23,42,0.98)",
        border: "1px solid rgba(51,65,85,0.98)",
        marginTop: 6,
        boxShadow: "0 18px 45px rgba(15,23,42,0.9)",
      }}
    >
      {/* Header */}
      <div
        style={{
          fontSize: 11,
          color: "#9ca3af",
          marginBottom: 6,
        }}
      >
        Selected alert
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        {/* LEFT CONTENT */}
        <div style={{ flex: 1 }}>
          {/* Title */}
          <div
            style={{
              fontSize: 13,
              color: "#e5e7eb",
              marginBottom: 4,
            }}
          >
            {alert.title}
          </div>

          {/* Vendor */}
          <div
            style={{
              fontSize: 11,
              color: "#9ca3af",
              marginBottom: 6,
            }}
          >
            {alert.vendorName} ·{" "}
            <span style={{ color: "#e5e7eb" }}>{alert.vendorCategory}</span>
          </div>

          {/* Message */}
          <div
            style={{
              fontSize: 11,
              color: "#9ca3af",
              marginBottom: 6,
            }}
          >
            {alert.message}
          </div>

          {/* Pills */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              fontSize: 10,
              marginBottom: 8,
            }}
          >
            {/* Severity pill */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "2px 7px",
                borderRadius: 999,
                background: sev.bg,
                border: `1px solid ${sev.border}`,
                color: sev.text,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 999,
                  background: sev.text,
                  boxShadow: `0 0 10px ${sev.text}`,
                }}
              />
              <span
                style={{
                  textTransform: "uppercase",
                  letterSpacing: 0.9,
                }}
              >
                {alert.severity}
              </span>
            </div>

            {/* Type */}
            <div
              style={{
                padding: "2px 7px",
                borderRadius: 999,
                border: "1px solid rgba(51,65,85,0.98)",
                background: "rgba(15,23,42,1)",
                color: "#e5e7eb",
              }}
            >
              {alert.type}
            </div>

            {/* Status */}
            <div
              style={{
                padding: "2px 7px",
                borderRadius: 999,
                border: "1px solid rgba(51,65,85,0.98)",
                background: "rgba(15,23,42,1)",
                color:
                  alert.status === "Open"
                    ? "#f97316"
                    : "rgba(148,163,184,0.9)",
              }}
            >
              {alert.status}
            </div>

            {/* Time Ago */}
            <div
              style={{
                padding: "2px 7px",
                borderRadius: 999,
                border: "1px solid rgba(51,65,85,0.98)",
                background: "rgba(15,23,42,1)",
                color: "#9ca3af",
              }}
            >
              {formatTimeAgo(alert.createdAt)}
            </div>
          </div>

          {/* Rule + Requirement cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
              gap: 8,
              marginTop: 6,
            }}
          >
            {/* Rule Fired */}
            <div
              style={{
                borderRadius: 12,
                padding: 8,
                border: "1px solid rgba(30,64,175,0.98)",
                background: "rgba(15,23,42,0.98)",
                fontSize: 11,
              }}
            >
              <div
                style={{
                  color: "#9ca3af",
                  marginBottom: 3,
                }}
              >
                Rule fired
              </div>
              <div style={{ color: "#e5e7eb" }}>
                {alert.ruleLabel || "From rule engine"}
              </div>
            </div>

            {/* Requirement */}
            <div
              style={{
                borderRadius: 12,
                padding: 8,
                border: "1px solid rgba(30,64,175,0.98)",
                background: "rgba(15,23,42,0.98)",
                fontSize: 11,
              }}
            >
              <div
                style={{
                  color: "#9ca3af",
                  marginBottom: 3,
                }}
              >
                Requirement impacted
              </div>
              <div style={{ color: "#e5e7eb" }}>
                {alert.requirementLabel || "From requirements engine"}
              </div>
            </div>
          </div>
        </div>

        {/* ===========================
            EXPECTED VS FOUND PANEL
        ============================ */}
        <div
          style={{
            width: 220,
            borderRadius: 16,
            padding: 10,
            border: "1px solid rgba(51,65,85,0.98)",
            background: "rgba(15,23,42,1)",
            fontSize: 11,
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "#9ca3af",
              marginBottom: 6,
            }}
          >
            Expected vs found
          </div>

          {/* Expected */}
          <div style={{ marginBottom: 6 }}>
            <div
              style={{
                color: "#6b7280",
                marginBottom: 2,
              }}
            >
              Expected
            </div>
            <div
              style={{
                borderRadius: 10,
                padding: "6px 7px",
                border: "1px solid rgba(30,64,175,0.98)",
                background:
                  "linear-gradient(135deg,rgba(15,23,42,0.98),rgba(15,23,42,0.94))",
                color: "#e5e7eb",
              }}
            >
              {alert.expected || "Defined in blueprint requirements."}
            </div>
          </div>

          {/* Found */}
          <div>
            <div
              style={{
                color: "#6b7280",
                marginBottom: 2,
              }}
            >
              Found
            </div>
            <div
              style={{
                borderRadius: 10,
                padding: "6px 7px",
                border: "1px solid rgba(127,29,29,0.98)",
                background:
                  "linear-gradient(135deg,rgba(15,23,42,0.98),rgba(15,23,42,0.94))",
                color: "#fecaca",
              }}
            >
              {alert.found || "Actual values from COI, policy, or vendor."}
            </div>
          </div>

          <div
            style={{
              marginTop: 8,
              fontSize: 10,
              color: "#6b7280",
              lineHeight: 1.4,
            }}
          >
            Future version: auto-email vendor with what to fix.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===========================
   TIMELINE ITEM
=========================== */
function AlertTimelineItem({ alert, isFirst, isSelected, onSelect }) {
  const sev = severityPillStyle(alert.severity);

  return (
    <div
      onClick={onSelect}
      style={{
        display: "grid",
        gridTemplateColumns: "20px minmax(0,1fr)",
        gap: 10,
        cursor: "pointer",
        padding: "4px 4px 4px 0",
        borderRadius: 12,
        background: isSelected ? "rgba(15,23,42,0.98)" : "transparent",
      }}
    >
      {/* Dot */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          paddingTop: 3,
        }}
      >
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: 999,
            border: "2px solid rgba(56,189,248,0.9)",
            background: isFirst
              ? "rgba(56,189,248,0.9)"
              : "rgba(15,23,42,1)",
            boxShadow: isFirst
              ? "0 0 18px rgba(56,189,248,0.9)"
              : "none",
            animation: isFirst ? "pulse 1300ms ease-in-out infinite" : "none",
          }}
        />
      </div>

      {/* Card */}
      <div
        style={{
          borderRadius: 14,
          padding: "8px 10px",
          border: isSelected
            ? "1px solid rgba(59,130,246,0.95)"
            : "1px solid rgba(30,41,59,0.95)",
          background: isSelected
            ? "linear-gradient(135deg,rgba(15,23,42,0.98),rgba(15,23,42,0.92))"
            : "rgba(15,23,42,0.98)",
          boxShadow: isSelected
            ? "0 16px 36px rgba(37,99,235,0.55)"
            : "0 8px 26px rgba(15,23,42,0.95)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 6,
            alignItems: "flex-start",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Title */}
            <div
              style={{
                fontSize: 12,
                color: "#e5e7eb",
                marginBottom: 2,
              }}
            >
              {alert.title}
            </div>

            {/* Vendor */}
            <div
              style={{
                fontSize: 11,
                color: "#9ca3af",
                marginBottom: 4,
              }}
            >
              {alert.vendorName} ·{" "}
              <span style={{ color: "#e5e7eb" }}>{alert.vendorCategory}</span>
            </div>
          </div>

          {/* Time */}
          <div
            style={{
              fontSize: 10,
              color: "#6b7280",
              textAlign: "right",
              flexShrink: 0,
            }}
          >
            {formatTimeAgo(alert.createdAt)}
          </div>
        </div>

        {/* Message */}
        <div
          style={{
            fontSize: 11,
            color: "#9ca3af",
            marginBottom: 6,
          }}
        >
          {alert.message}
        </div>

        {/* Pills */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
            fontSize: 10,
          }}
        >
          {/* Severity */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "2px 7px",
              borderRadius: 999,
              background: sev.bg,
              border: `1px solid ${sev.border}`,
              color: sev.text,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: 999,
                background: sev.text,
                boxShadow: `0 0 10px ${sev.text}`,
              }}
            />
            <span
              style={{
                textTransform: "uppercase",
                letterSpacing: 0.9,
              }}
            >
              {alert.severity}
            </span>
          </div>

          {/* Type */}
          <div
            style={{
              padding: "2px 7px",
              borderRadius: 999,
              border: "1px solid rgba(51,65,85,0.98)",
              background: "rgba(15,23,42,1)",
              color: "#e5e7eb",
            }}
          >
            {alert.type}
          </div>

          {/* Status */}
          <div
            style={{
              padding: "2px 7px",
              borderRadius: 999,
              border: "1px solid rgba(51,65,85,0.98)",
              background: "rgba(15,23,42,1)",
              color:
                alert.status === "Open"
                  ? "#f97316"
                  : "rgba(148,163,184,0.9)",
            }}
          >
            {alert.status}
          </div>
        </div>
      </div>
    </div>
  );
}

