// pages/admin/alerts.js
import { useState, useMemo, useEffect } from "react";

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
  surface: "#0B1220",
  border: "#1E293B",
};

/* ===========================
   UTILS
=========================== */
function formatTimeAgo(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.round(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return diffMins + " min ago";
  const diffHours = Math.round(diffMins / 60);
  if (diffHours < 24) return diffHours + " h ago";
  const diffDays = Math.round(diffHours / 24);
  return diffDays + " d ago";
}

/* ===========================
   SEVERITY MAPPING (LIVE ENGINE)
=========================== */
function getSeverity(type, message = "") {
  if (type === "rule_failure" && message.includes("Critical")) return "Critical";
  if (type === "rule_failure" && message.includes("High")) return "High";
  if (type === "rule_failure") return "Medium";
  if (type === "requirement_failure") return "High";
  return "Low";
}

function severityPillStyle(sev) {
  switch (sev) {
    case "Critical":
      return { bg: "rgba(248,113,113,0.15)", border: "rgba(248,113,113,0.9)", text: "#fee2e2" };
    case "High":
      return { bg: "rgba(251,191,36,0.15)", border: "rgba(250,204,21,0.9)", text: "#fef9c3" };
    case "Medium":
      return { bg: "rgba(56,189,248,0.15)", border: "rgba(56,189,248,0.9)", text: "#e0f2fe" };
    case "Low":
      return { bg: "rgba(52,211,153,0.15)", border: "rgba(52,211,153,0.9)", text: "#ccfbf1" };
    default:
      return { bg: "rgba(148,163,184,0.15)", border: "rgba(148,163,184,0.9)", text: "#e5e7eb" };
  }
}

/* ===========================
   MAIN PAGE — ALERTS DASHBOARD V2
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
     LOAD LIVE ALERTS FROM NEON
  ============================ */
  useEffect(() => {
    async function loadAlerts() {
      try {
        const res = await fetch(`/api/alerts/list?orgId=2`);
        const data = await res.json();
        if (data.ok) {
          // Map severity using our rule-based system
          const mapped = (data.alerts || []).map((a) => ({
            ...a,
            severity: getSeverity(a.type, a.message || ""),
          }));

          setAlerts(mapped);

          if (!selectedAlertId && mapped.length > 0) {
            setSelectedAlertId(mapped[0].id);
          }
        }
      } catch (err) {
        console.error("Failed loading alerts:", err);
      }
    }
    loadAlerts();
  }, []);
  /* ===========================
     FILTER CALCULATION
  ============================ */
  const filteredAlerts = useMemo(() => {
    const now = new Date();
    const cutoff = new Date(now);

    if (timeFilter === "24h") cutoff.setDate(now.getDate() - 1);
    else if (timeFilter === "7d") cutoff.setDate(now.getDate() - 7);
    else if (timeFilter === "30d") cutoff.setDate(now.getDate() - 30);
    else cutoff.setFullYear(now.getFullYear() - 5);

    return alerts.filter((a) => {
      if (severityFilter !== "All" && a.severity !== severityFilter) return false;
      if (typeFilter !== "All" && a.type !== typeFilter) return false;
      if (statusFilter === "Open" && a.is_read === true) return false;
      if (new Date(a.created_at) < cutoff) return false;

      if (!searchTerm) return true;

      const haystack =
        (a.message || "") +
        " " +
        (a.vendor_name || "") +
        " " +
        (a.type || "") +
        " ";

      return haystack.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [alerts, severityFilter, typeFilter, statusFilter, timeFilter, searchTerm]);

  const selectedAlert =
    filteredAlerts.find((a) => a.id === selectedAlertId) ||
    filteredAlerts[0] ||
    null;

  /* ===========================
     LIVE STATS FROM REAL DATA
  ============================ */
  const stats = useMemo(() => {
    const open = alerts.filter((a) => !a.is_read);
    const openCount = open.length;
    const critHighOpen = open.filter(
      (a) => a.severity === "Critical" || a.severity === "High"
    ).length;

    const today = new Date();
    const last24h = alerts.filter(
      (a) => today - new Date(a.created_at) <= 24 * 60 * 60 * 1000
    ).length;

    const coverage = open.filter((a) => a.type === "Coverage").length;
    const endorsements = open.filter((a) => a.type === "Endorsement").length;
    const docs = open.filter((a) => a.type === "Document").length;
    const rules = open.filter((a) => a.type === "rule_failure").length;

    const sevWeights = { Critical: 4, High: 3, Medium: 2, Low: 1 };
    let weighted = 0;
    let maxWeighted = 0;

    open.forEach((a) => {
      const w = sevWeights[a.severity] || 1;
      weighted += w;
      maxWeighted += 4;
    });

    return {
      openCount,
      critHighOpen,
      last24h,
      coverage,
      endorsements,
      docs,
      rules,
      weightedScore:
        maxWeighted === 0 ? 0 : Math.round((weighted / maxWeighted) * 100),
    };
  }, [alerts]);
  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left,#020617 0,#020617 45%,#000 100%)",
        padding: "32px 40px 40px",
        color: "white",
        fontFamily:
          "-apple-system,BlinkMacSystemFont,system-ui,Segoe UI,sans-serif",
      }}
    >
      <AlertsHeader stats={stats} />

      <MainGrid
        alerts={alerts}
        filteredAlerts={filteredAlerts}
        stats={stats}
        selectedAlert={selectedAlert}
        selectedAlertId={selectedAlertId}
        setSelectedAlertId={setSelectedAlertId}
        severityFilter={severityFilter}
        typeFilter={typeFilter}
        statusFilter={statusFilter}
        timeFilter={timeFilter}
        searchTerm={searchTerm}
        setSeverityFilter={setSeverityFilter}
        setTypeFilter={setTypeFilter}
        setStatusFilter={setStatusFilter}
        setTimeFilter={setTimeFilter}
        setSearchTerm={setSearchTerm}
      />
    </div>
  );
}
/* ======================================================
   MAIN GRID
====================================================== */
function MainGrid({
  alerts,
  filteredAlerts,
  stats,
  selectedAlert,
  selectedAlertId,
  setSelectedAlertId,
  severityFilter,
  typeFilter,
  statusFilter,
  timeFilter,
  searchTerm,
  setSeverityFilter,
  setTypeFilter,
  setStatusFilter,
  setTimeFilter,
  setSearchTerm,
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0,1.6fr) minmax(0,1.1fr)",
        gap: 18,
      }}
    >
      <LeftPanel
        alerts={alerts}
        filteredAlerts={filteredAlerts}
        severityFilter={severityFilter}
        setSeverityFilter={setSeverityFilter}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        timeFilter={timeFilter}
        setTimeFilter={setTimeFilter}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedAlertId={selectedAlertId}
        setSelectedAlertId={setSelectedAlertId}
        selectedAlert={selectedAlert}
      />

      <RightPanel stats={stats} alerts={filteredAlerts} selectedAlert={selectedAlert} />
    </div>
  );
}

/* ======================================================
   LEFT PANEL
====================================================== */
function LeftPanel({
  alerts,
  filteredAlerts,
  severityFilter,
  setSeverityFilter,
  typeFilter,
  setTypeFilter,
  statusFilter,
  setStatusFilter,
  timeFilter,
  setTimeFilter,
  searchTerm,
  setSearchTerm,
  selectedAlertId,
  setSelectedAlertId,
  selectedAlert,
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
        gap: 12,
      }}
    >
      <FiltersRow
        severityFilter={severityFilter}
        setSeverityFilter={setSeverityFilter}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        timeFilter={timeFilter}
        setTimeFilter={setTimeFilter}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />

      <AlertsTimeline
        filteredAlerts={filteredAlerts}
        selectedAlert={selectedAlert}
        selectedAlertId={selectedAlertId}
        setSelectedAlertId={setSelectedAlertId}
      />
    </div>
  );
}

/* ======================================================
   FILTER ROW
====================================================== */
function FiltersRow({
  severityFilter,
  setSeverityFilter,
  typeFilter,
  setTypeFilter,
  statusFilter,
  setStatusFilter,
  timeFilter,
  setTimeFilter,
  searchTerm,
  setSearchTerm,
}) {
  return (
    <>
      {/* Severity */}
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
              }}
            >
              {sev}
            </button>
          );
        })}
      </div>

      {/* Type */}
      <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={selectStyle}>
        <option value="All">All types</option>
        <option value="Coverage">Coverage</option>
        <option value="Endorsement">Endorsements</option>
        <option value="Document">Documents</option>
        <option value="rule_failure">Rule triggers</option>
      </select>

      {/* Status */}
      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={selectStyle}>
        <option value="Open">Open only</option>
        <option value="All">All</option>
      </select>

      {/* Time */}
      <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)} style={selectStyle}>
        <option value="24h">Last 24 hours</option>
        <option value="7d">Last 7 days</option>
        <option value="30d">Last 30 days</option>
        <option value="all">All time</option>
      </select>

      {/* Search */}
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
        <span style={{ color: "#6b7280", fontSize: 13 }}>🔍</span>
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search alerts…"
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
    </>
  );
}

const selectStyle = {
  borderRadius: 999,
  padding: "5px 10px",
  border: "1px solid rgba(51,65,85,0.95)",
  background: "rgba(15,23,42,0.95)",
  color: "#e5e7eb",
  fontSize: 11,
};

/* ======================================================
   ALERTS TIMELINE
====================================================== */
function AlertsTimeline({ filteredAlerts, selectedAlert, selectedAlertId, setSelectedAlertId }) {
  return (
    <div
      style={{
        marginTop: 4,
        borderRadius: 18,
        padding: "8px 10px",
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
        <span style={{ color: "#e5e7eb" }}>{filteredAlerts.length} events</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, position: "relative" }}>
        <div
          style={{
            position: "absolute",
            left: 10,
            top: 0,
            bottom: 0,
            width: 2,
            background: "linear-gradient(to bottom,rgba(56,189,248,0.3),rgba(56,189,248,0))",
          }}
        />

        {filteredAlerts.map((alert, idx) => (
          <AlertTimelineItem
            key={alert.id}
            alert={alert}
            isFirst={idx === 0}
            isSelected={alert.id === selectedAlertId}
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
            No alerts match your filters.
          </div>
        )}
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
/* ======================================================
   RIGHT PANEL (Heatmap + Selected Alert)
====================================================== */
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
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1.4fr) minmax(0,1.1fr)",
          gap: 10,
        }}
      >
        <HeatmapCard alerts={alerts} />
        <CategoryBreakdown stats={stats} />
      </div>

      <SelectedAlertDetail alert={selectedAlert} />
    </div>
  );
}

/* ======================================================
   HEATMAP CARD
====================================================== */
function HeatmapCard({ alerts }) {
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
        const t = new Date(a.created_at);
        return t >= slotStart && t < slotEnd;
      }).length;

      col.push(count);
    }
    grid.push(col);
  }

  const maxCount = Math.max(...grid.flat(), 1);

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
        <span style={{ color: "#e5e7eb" }}>{alerts.length} events</span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${grid.length},12px)`,
          gap: 4,
        }}
      >
        {grid.map((col, i) => (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateRows: `repeat(${col.length},12px)`,
              gap: 4,
            }}
          >
            {col.map((count, j) => (
              <div
                key={j}
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 4,
                  background: cellColor(count),
                  border:
                    count === 0
                      ? "1px solid rgba(30,41,59,1)"
                      : "1px solid rgba(248,181,82,0.6)",
                  boxShadow:
                    count > 0 ? "0 0 10px rgba(248,181,82,0.7)" : "none",
                }}
                title={`${count} event${count === 1 ? "" : "s"}`}
              />
            ))}
          </div>
        ))}
      </div>

      <div style={{ color: "#6b7280", fontSize: 10, marginTop: 6 }}>
        Brighter cells = more alerts fired during that time window.
      </div>
    </div>
  );
}

/* ======================================================
   CATEGORY BREAKDOWN
====================================================== */
function CategoryBreakdown({ stats }) {
  const items = [
    { label: "Coverage", count: stats.coverage, hint: "Limit issues, missing coverage." },
    { label: "Endorsements", count: stats.endorsements, hint: "AI/Waiver/PNC issues." },
    { label: "Documents", count: stats.docs, hint: "Expired/missing COIs or contracts." },
    { label: "Rule triggers", count: stats.rules, hint: "Logic failures (Rules Engine V2)." },
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
      <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 2 }}>
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

/* ======================================================
   SELECTED ALERT DETAIL
====================================================== */
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
      <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 6 }}>
        Selected alert
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        {/* LEFT SIDE */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, color: "#e5e7eb", marginBottom: 4 }}>
            {alert.message}
          </div>

          <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 6 }}>
            {alert.vendor_name || "Unknown Vendor"}
          </div>

          {/* Chips */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 10 }}>
            {/* Severity */}
            <div
              style={{
                padding: "2px 7px",
                borderRadius: 999,
                background: sev.bg,
                border: `1px solid ${sev.border}`,
                color: sev.text,
              }}
            >
              {alert.severity}
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
                color: alert.is_read ? "#9ca3af" : "#f97316",
              }}
            >
              {alert.is_read ? "Resolved" : "Open"}
            </div>

            {/* Time */}
            <div
              style={{
                padding: "2px 7px",
                borderRadius: 999,
                border: "1px solid rgba(51,65,85,0.98)",
                background: "rgba(15,23,42,1)",
                color: "#9ca3af",
              }}
            >
              {formatTimeAgo(alert.created_at)}
            </div>
          </div>
        </div>

        {/* RIGHT SIDE */}
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
          <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 6 }}>
            Alert details
          </div>

          <div style={{ marginBottom: 6 }}>
            <div style={{ color: "#6b7280", marginBottom: 2 }}>Message</div>
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
              {alert.message}
            </div>
          </div>

          <div>
            <div style={{ color: "#6b7280", marginBottom: 2 }}>Vendor</div>
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
              {alert.vendor_name}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
