// pages/admin/alerts.js
import { useState, useMemo } from "react";

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
   SEED ALERT DATA
   (Later this will come from API)
=========================== */
const seedAlerts = [
  {
    id: "a1",
    severity: "Critical",
    type: "Coverage",
    title: "GL limit below required",
    vendorName: "Summit Roofing & Coatings",
    vendorCategory: "Roofing / Exterior Work",
    message:
      "General Liability each occurrence is $500,000. Blueprint requires $1,000,000.",
    createdAt: "2025-11-20T14:23:00Z",
    status: "Open",
    ruleLabel: "General Liability Below Required",
    requirementLabel: "Each Occurrence Limit",
    expected: "$1,000,000 per occurrence",
    found: "$500,000 per occurrence",
    group: "General Liability",
  },
  {
    id: "a2",
    severity: "High",
    type: "Endorsement",
    title: "Missing Additional Insured endorsement",
    vendorName: "Northline Mechanical Services",
    vendorCategory: "HVAC / Mechanical",
    message:
      "No Additional Insured wording found on COI or endorsements for this vendor.",
    createdAt: "2025-11-20T13:11:00Z",
    status: "Open",
    ruleLabel: "Additional Insured Not Found",
    requirementLabel: "Additional Insured – Ongoing Operations",
    expected: "CG 20 10 or equivalent AI wording",
    found: "No AI wording detected",
    group: "Endorsements",
  },
  {
    id: "a3",
    severity: "High",
    type: "Document",
    title: "COI expired 7 days ago",
    vendorName: "Brightline Janitorial Group",
    vendorCategory: "Janitorial / Cleaning",
    message:
      "Primary COI on file expired 7 days ago. No replacement document uploaded.",
    createdAt: "2025-11-20T09:02:00Z",
    status: "Open",
    ruleLabel: "Expired / Missing COI",
    requirementLabel: "Valid COI on File",
    expected: "Active COI with future expiration date",
    found: "COI expired 7 days ago",
    group: "Documentation",
  },
  {
    id: "a4",
    severity: "Medium",
    type: "Coverage",
    title: "Umbrella limit at threshold",
    vendorName: "Titan Logistics & Fleet",
    vendorCategory: "Transportation / Fleet",
    message:
      "Umbrella limit is exactly at the minimum required ($5,000,000).",
    createdAt: "2025-11-19T17:45:00Z",
    status: "Open",
    ruleLabel: "Umbrella At Minimum",
    requirementLabel: "Umbrella / Excess Limit",
    expected: "≥ $5,000,000",
    found: "$5,000,000",
    group: "Umbrella / Excess",
  },
  {
    id: "a5",
    severity: "Medium",
    type: "Endorsement",
    title: "Waiver of Subrogation unclear",
    vendorName: "Harbor Electrical Contractors",
    vendorCategory: "Electrical",
    message:
      "Text mentions waiver of subrogation but does not specify your org by name.",
    createdAt: "2025-11-19T11:20:00Z",
    status: "Open",
    ruleLabel: "Waiver of Subrogation Wording",
    requirementLabel: "Waiver of Subrogation",
    expected: "Named waiver in favor of your organization",
    found: "Generic waiver wording only",
    group: "Endorsements",
  },
  {
    id: "a6",
    severity: "Low",
    type: "Document",
    title: "Contract missing for low-risk vendor",
    vendorName: "GreenLeaf Plant Services",
    vendorCategory: "Plants / Décor",
    message:
      "No signed contract found, but vendor is categorized as low-risk (on-site minimal exposure).",
    createdAt: "2025-11-18T16:05:00Z",
    status: "Open",
    ruleLabel: "Missing Contract – Low Risk",
    requirementLabel: "Signed Contract / Agreement",
    expected: "Executed contract on file",
    found: "None located",
    group: "Documentation",
  },
  {
    id: "a7",
    severity: "High",
    type: "Rule",
    title: "Onsite contractor missing Workers Comp",
    vendorName: "Atlas Concrete & Sitework",
    vendorCategory: "Concrete / Structural",
    message:
      "Vendor flagged as 'Onsite Contractor' but Workers Compensation coverage not detected.",
    createdAt: "2025-11-18T13:40:00Z",
    status: "Open",
    ruleLabel: "Onsite Contractor Requires Workers Comp",
    requirementLabel: "Statutory Workers Compensation",
    expected: "Workers Comp policy present",
    found: "No Workers Comp coverage found",
    group: "Workers Compensation",
  },
  {
    id: "a8",
    severity: "Medium",
    type: "Rule",
    title: "COI expires within 30 days",
    vendorName: "Precision Fire & Life Safety",
    vendorCategory: "Fire / Life Safety",
    message:
      "Primary GL policy expiration is in 23 days. Notification sent to vendor.",
    createdAt: "2025-11-17T10:30:00Z",
    status: "Open",
    ruleLabel: "Expires Within 30 Days",
    requirementLabel: "Valid COI on File",
    expected: "Expiration > 30 days from today",
    found: "Expiration in 23 days",
    group: "General Liability",
  },
  {
    id: "a9",
    severity: "Low",
    type: "Coverage",
    title: "Cyber liability missing (not required)",
    vendorName: "PixelPoint Creative Studio",
    vendorCategory: "Creative / Marketing",
    message:
      "Cyber liability not found. Blueprint marks it as optional for this vendor category.",
    createdAt: "2025-11-16T15:18:00Z",
    status: "Resolved",
    ruleLabel: "Optional Cyber Coverage",
    requirementLabel: "Cyber Liability (Optional)",
    expected: "Optional",
    found: "Not present (no action required)",
    group: "Cyber Liability",
  },
];

/* ===========================
   UTILS
=========================== */
const severityWeights = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

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

function severityPillStyle(sev) {
  switch (sev) {
    case "Critical":
      return {
        bg: "rgba(248,113,113,0.15)",
        border: "rgba(248,113,113,0.9)",
        text: "#fee2e2",
      };
    case "High":
      return {
        bg: "rgba(251,191,36,0.15)",
        border: "rgba(250,204,21,0.9)",
        text: "#fef9c3",
      };
    case "Medium":
      return {
        bg: "rgba(56,189,248,0.15)",
        border: "rgba(56,189,248,0.9)",
        text: "#e0f2fe",
      };
    case "Low":
      return {
        bg: "rgba(52,211,153,0.15)",
        border: "rgba(52,211,153,0.9)",
        text: "#ccfbf1",
      };
    default:
      return {
        bg: "rgba(148,163,184,0.15)",
        border: "rgba(148,163,184,0.9)",
        text: "#e5e7eb",
      };
  }
}

/* ===========================
   MAIN PAGE
=========================== */
export default function AlertsDashboardPage() {
  const [severityFilter, setSeverityFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("Open");
  const [timeFilter, setTimeFilter] = useState("7d");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAlertId, setSelectedAlertId] = useState(seedAlerts[0]?.id);

  const filteredAlerts = useMemo(() => {
    const now = new Date();
    const cutoff = new Date(now);
    if (timeFilter === "24h") cutoff.setDate(now.getDate() - 1);
    else if (timeFilter === "7d") cutoff.setDate(now.getDate() - 7);
    else if (timeFilter === "30d") cutoff.setDate(now.getDate() - 30);
    else cutoff.setFullYear(now.getFullYear() - 5); // "All"

    return seedAlerts.filter((a) => {
      if (severityFilter !== "All" && a.severity !== severityFilter) return false;
      if (typeFilter !== "All" && a.type !== typeFilter) return false;
      if (statusFilter !== "All" && a.status !== statusFilter) return false;
      if (new Date(a.createdAt) < cutoff) return false;
      if (!searchTerm) return true;
      const haystack = (
        a.title +
        " " +
        a.vendorName +
        " " +
        a.vendorCategory +
        " " +
        a.message +
        " " +
        (a.ruleLabel || "") +
        " " +
        (a.requirementLabel || "")
      ).toLowerCase();
      return haystack.includes(searchTerm.toLowerCase());
    });
  }, [severityFilter, typeFilter, statusFilter, timeFilter, searchTerm]);

  const selectedAlert = useMemo(
    () => filteredAlerts.find((a) => a.id === selectedAlertId) || filteredAlerts[0] || seedAlerts[0],
    [filteredAlerts, selectedAlertId]
  );

  const stats = useMemo(() => {
    const open = seedAlerts.filter((a) => a.status === "Open");
    const openCount = open.length;
    const critHighOpen = open.filter(
      (a) => a.severity === "Critical" || a.severity === "High"
    ).length;

    const today = new Date();
    const last24h = seedAlerts.filter(
      (a) => today - new Date(a.createdAt) <= 24 * 60 * 60 * 1000
    ).length;

    const coverage = open.filter((a) => a.type === "Coverage").length;
    const endorsements = open.filter((a) => a.type === "Endorsement").length;
    const docs = open.filter((a) => a.type === "Document").length;
    const rules = open.filter((a) => a.type === "Rule").length;

    let weighted = 0;
    let maxWeighted = 0;
    open.forEach((a) => {
      const w = severityWeights[a.severity] || 1;
      weighted += w;
      maxWeighted += 4; // assume max = Critical
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
  }, []);

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

        {/* Quick stats summary */}
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

      {/* MAIN GRID */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1.6fr) minmax(0,1.1fr)",
          gap: 18,
          alignItems: "stretch",
        }}
      >
        {/* LEFT — FILTERS + TIMELINE */}
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
          {/* Filters row */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 8,
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

            {/* Type filter */}
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
            </select>

            {/* Status filter */}
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

            {/* Time filter */}
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

          {/* Timeline */}
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
                of {seedAlerts.length}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                position: "relative",
              }}
            >
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

        {/* RIGHT — HEATMAP + SELECTED ALERT */}
        <RightPanel
          stats={stats}
          alerts={seedAlerts}
          selectedAlert={selectedAlert}
        />
      </div>

      {/* tiny keyframes hook for pulsing dots */}
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
   ALERT TIMELINE ITEM
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
      {/* Timeline dot */}
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
              : "0 0 0 rgba(0,0,0,0)",
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
            <div
              style={{
                fontSize: 12,
                color: "#e5e7eb",
                marginBottom: 2,
              }}
            >
              {alert.title}
            </div>
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

        <div
          style={{
            fontSize: 11,
            color: "#9ca3af",
            marginBottom: 6,
          }}
        >
          {alert.message}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
            fontSize: 10,
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

          <div
            style={{
              padding: "2px 7px",
              borderRadius: 999,
              border: "1px solid rgba(51,65,85,0.98)",
              background: "rgba(15,23,42,1)",
              color:
                alert.status === "Open" ? "#f97316" : "rgba(148,163,184,0.9)",
            }}
          >
            {alert.status}
          </div>
        </div>
      </div>
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
      {/* Heatmap + categories */}
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

      {/* Selected alert detail */}
      <SelectedAlertDetail alert={selectedAlert} />
    </div>
  );
}

/* ===========================
   HEATMAP CARD
=========================== */
function HeatmapCard({ alerts }) {
  // Fake a simple 7x4 heatmap (7 days x 4 slots)
  // Intensity based on number of alerts bucketed by severity/recency.
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
    // blend from slate to amber/red
    return `rgba(${248},${181},${82},${0.15 + intensity * 0.55})`;
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
        <span style={{ color: "#e5e7eb" }}>
          {alerts.length} total events
        </span>
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
                    count > 0
                      ? "0 0 10px rgba(248,181,82,0.7)"
                      : "none",
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <div
        style={{ fontSize: 10, color: "#6b7280", marginTop: 4 }}
      >
        Brighter cells = more alerts fired in that window. It’s your GitHub
        heatmap, but for risk.
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
      hint: "Logic-based alerts from Elite Rules.",
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
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 13,
              color: "#e5e7eb",
              marginBottom: 4,
            }}
          >
            {alert.title}
          </div>
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

          <div
            style={{
              fontSize: 11,
              color: "#9ca3af",
              marginBottom: 6,
            }}
          >
            {alert.message}
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              fontSize: 10,
              marginBottom: 8,
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

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
              gap: 8,
              marginTop: 6,
            }}
          >
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

        {/* Expected vs found panel */}
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

          <div
            style={{
              marginBottom: 6,
            }}
          >
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
            In the future this card can power one-click outreach: send the
            vendor a pre-drafted email with exactly what needs to change.
          </div>
        </div>
      </div>
    </div>
  );
}
