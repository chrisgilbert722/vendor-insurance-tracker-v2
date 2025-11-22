// pages/admin/alerts.js
import { useState, useMemo } from "react";
import { useOrg } from "../../context/OrgContext";
import { useRole } from "../../lib/useRole";

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
  surface: "#020617",
  border: "#1E293B",
};

/* ===========================
   SEEDED MOCK ALERTS
   (Replace later with real API data)
=========================== */

const initialAlerts = [
  {
    id: "alt-1",
    vendorName: "Summit Roofing & Coatings",
    vendorTagline: "Roofing / Exterior Work",
    severity: "Critical",
    type: "Coverage",
    title: "GL limit below required",
    message:
      "General Liability each occurrence is $500,000. Blueprint requires $1,000,000.",
    field: "Certificate.glEachOccurrence",
    status: "Open",
    createdAt: "2025-11-20T09:15:00Z",
    lastSeen: "2025-11-21T14:12:00Z",
    source: "Elite Rule Engine",
    ruleLabel: "General Liability Below Required",
  },
  {
    id: "alt-2",
    vendorName: "Northline Mechanical Services",
    vendorTagline: "HVAC / Mechanical",
    severity: "High",
    type: "Endorsement",
    title: "Missing Additional Insured endorsement",
    message:
      "Required AI wording not found in any uploaded endorsement documents.",
    field: "Endorsement.document",
    status: "Open",
    createdAt: "2025-11-20T13:40:00Z",
    lastSeen: "2025-11-21T10:00:00Z",
    source: "Requirements Engine",
    ruleLabel: "Additional Insured Not Found",
  },
  {
    id: "alt-3",
    vendorName: "Brightline Janitorial Group",
    vendorTagline: "Janitorial / Cleaning",
    severity: "Medium",
    type: "Document",
    title: "Primary COI expired 7 days ago",
    message:
      "Primary certificate expiration date passed 7 days ago. No replacement document uploaded.",
    field: "Certificate.expirationDate",
    status: "Open",
    createdAt: "2025-11-14T08:05:00Z",
    lastSeen: "2025-11-21T08:12:00Z",
    source: "Expiration Monitor",
    ruleLabel: "Expired / Missing Insurance",
  },
  {
    id: "alt-4",
    vendorName: "Precision Fire & Life Safety",
    vendorTagline: "Life Safety / Fire",
    severity: "Low",
    type: "Info",
    title: "Umbrella policy expiring in 45 days",
    message:
      "Umbrella / Excess policy will expire in 45 days. Confirm renewal plans with broker.",
    field: "Certificate.umbrellaExpiration",
    status: "Open",
    createdAt: "2025-11-19T09:00:00Z",
    lastSeen: "2025-11-21T12:55:00Z",
    source: "Expiration Monitor",
    ruleLabel: "Umbrella Expiring Soon",
  },
];

/* ===========================
   HELPER FUNCTIONS
=========================== */

const severityOrder = {
  Critical: 3,
  High: 2,
  Medium: 1,
  Low: 0,
};

function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatRelative(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (Number.isNaN(diff)) return "";

  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function severityChipMeta(severity) {
  switch (severity) {
    case "Critical":
      return {
        bg: "rgba(248,113,113,0.12)",
        border: "rgba(248,113,113,0.9)",
        label: "Critical",
        text: "#fecaca",
        dot: "#f97316",
      };
    case "High":
      return {
        bg: "rgba(250,204,21,0.12)",
        border: "rgba(250,204,21,0.9)",
        label: "High",
        text: "#fef9c3",
        dot: "#facc15",
      };
    case "Medium":
      return {
        bg: "rgba(56,189,248,0.12)",
        border: "rgba(56,189,248,0.9)",
        label: "Medium",
        text: "#e0f2fe",
        dot: "#38bdf8",
      };
    case "Low":
      return {
        bg: "rgba(52,211,153,0.12)",
        border: "rgba(52,211,153,0.9)",
        label: "Low",
        text: "#ccfbf1",
        dot: "#34d399",
      };
    default:
      return {
        bg: "rgba(148,163,184,0.12)",
        border: "rgba(148,163,184,0.8)",
        label: severity || "Unknown",
        text: "#e5e7eb",
        dot: "#9ca3af",
      };
  }
}

/* ===========================
   MAIN PAGE
=========================== */

export default function AlertsPage() {
  const { orgId } = useOrg();
  const { isAdmin, isManager } = useRole();

  // Filters
  const [severityFilter, setSeverityFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("Open");
  const [searchTerm, setSearchTerm] = useState("");

  const canEdit = isAdmin || isManager;

  const metrics = useMemo(() => {
    const total = initialAlerts.length;
    const critical = initialAlerts.filter((a) => a.severity === "Critical")
      .length;
    const warning = initialAlerts.filter(
      (a) => a.severity === "High" || a.severity === "Medium"
    ).length;
    const info = initialAlerts.filter((a) => a.severity === "Low").length;

    return {
      total,
      critical,
      warning,
      info,
    };
  }, []);

  const filteredAlerts = useMemo(() => {
    return initialAlerts
      .filter((a) => {
        if (severityFilter !== "All" && a.severity !== severityFilter)
          return false;
        if (typeFilter !== "All" && a.type !== typeFilter) return false;
        if (statusFilter !== "All" && a.status !== statusFilter) return false;
        if (!searchTerm) return true;
        const haystack = (
          a.title +
          " " +
          a.message +
          " " +
          a.vendorName +
          " " +
          a.ruleLabel
        ).toLowerCase();
        return haystack.includes(searchTerm.toLowerCase());
      })
      .sort((a, b) => {
        const sevDiff =
          severityOrder[b.severity] - severityOrder[a.severity] || 0;
        if (sevDiff !== 0) return sevDiff;
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
  }, [severityFilter, typeFilter, statusFilter, searchTerm]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left,#020617 0,#020617 55%,#000 100%)",
        padding: "30px 40px 40px",
        color: "#e5e7eb",
        fontFamily:
          "-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',system-ui,sans-serif",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 18,
          marginBottom: 20,
        }}
      >
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <div
            style={{
              padding: 10,
              borderRadius: 999,
              background:
                "radial-gradient(circle at 30% 0,#f97316,#ea580c,#7c2d12)",
              boxShadow: "0 0 40px rgba(248,113,113,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: 22 }}>🚨</span>
          </div>
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "4px 10px",
                borderRadius: 999,
                border: "1px solid rgba(148,163,184,0.4)",
                marginBottom: 6,
                background:
                  "linear-gradient(120deg,rgba(15,23,42,0.9),rgba(15,23,42,0))",
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  letterSpacing: 1.2,
                  textTransform: "uppercase",
                  color: "#9ca3af",
                }}
              >
                Alerts Dashboard V2
              </span>
              <span
                style={{
                  fontSize: 10,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  color: "#f97316",
                }}
              >
                Real-time risk pulse
              </span>
            </div>
            <h1
              style={{
                margin: 0,
                fontSize: 26,
                fontWeight: 600,
                letterSpacing: 0.2,
              }}
            >
              See{" "}
              <span
                style={{
                  background:
                    "linear-gradient(90deg,#f97316,#facc15,#fb7185)",
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
                marginTop: 6,
                marginBottom: 0,
                fontSize: 13,
                color: "#cbd5f5",
                maxWidth: 640,
              }}
            >
              This is the live feed of your rule engine and requirements engine
              firing. Every card is a vendor, a policy, an endorsement, or a
              document that needs attention.
            </p>
          </div>
        </div>

        <div style={{ textAlign: "right", minWidth: 180 }}>
          <div
            style={{
              fontSize: 11,
              color: "#9ca3af",
              marginBottom: 4,
            }}
          >
            Org context
          </div>
          <div
            style={{
              fontSize: 12,
              color: "#e5e7eb",
              marginBottom: 8,
            }}
          >
            {orgId ? `Org: ${orgId}` : "Active organization loaded"}
          </div>
          {!canEdit && (
            <div
              style={{
                fontSize: 11,
                color: "#facc15",
                padding: "6px 9px",
                borderRadius: 10,
                border: "1px solid rgba(251,191,36,0.6)",
                background: "rgba(113,63,18,0.5)",
              }}
            >
              Read-only view. Only admins/managers can resolve alerts.
            </div>
          )}
        </div>
      </div>

      {/* METRICS + FILTERS STRIP */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,2.1fr) minmax(0,1.5fr)",
          gap: 18,
          marginBottom: 18,
          alignItems: "stretch",
        }}
      >
        {/* Metrics */}
        <div
          style={{
            borderRadius: 22,
            padding: 14,
            background:
              "radial-gradient(circle at top left,rgba(15,23,42,0.96),rgba(15,23,42,0.9))",
            border: "1px solid rgba(148,163,184,0.55)",
            boxShadow: "0 22px 55px rgba(15,23,42,0.98)",
            display: "grid",
            gridTemplateColumns: "repeat(4,minmax(0,1fr))",
            gap: 10,
          }}
        >
          <MetricCard
            label="Critical"
            value={metrics.critical}
            tone="critical"
          />
          <MetricCard
            label="Warning"
            value={metrics.warning}
            tone="warning"
          />
          <MetricCard label="Info" value={metrics.info} tone="info" />
          <MetricCard label="Total" value={metrics.total} tone="total" />
        </div>

        {/* Filters */}
        <div
          style={{
            borderRadius: 22,
            padding: 14,
            background:
              "linear-gradient(135deg,rgba(15,23,42,0.96),rgba(15,23,42,0.9))",
            border: "1px solid rgba(148,163,184,0.4)",
            boxShadow: "0 22px 50px rgba(15,23,42,0.98)",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div
            style={{
              fontSize: 11,
              letterSpacing: 1.2,
              textTransform: "uppercase",
              color: "#9ca3af",
              marginBottom: 2,
            }}
          >
            Filters
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              alignItems: "center",
            }}
          >
            {/* Severity pills */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "3px 4px",
                borderRadius: 999,
                background: "rgba(15,23,42,0.9)",
                border: "1px solid rgba(51,65,85,0.9)",
              }}
            >
              {["All", "Critical", "High", "Medium", "Low"].map((sev) => {
                const active = severityFilter === sev;
                return (
                  <button
                    key={sev}
                    onClick={() => setSeverityFilter(sev)}
                    style={{
                      borderRadius: 999,
                      border: "none",
                      padding: "4px 9px",
                      fontSize: 11,
                      cursor: "pointer",
                      background: active
                        ? "radial-gradient(circle at top,#f97316,#ea580c,#7c2d12)"
                        : "transparent",
                      color: active ? "#fffbeb" : "#cbd5f5",
                    }}
                  >
                    {sev}
                  </button>
                );
              })}
            </div>

            {/* Status filter */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "3px 4px",
                borderRadius: 999,
                background: "rgba(15,23,42,0.9)",
                border: "1px solid rgba(51,65,85,0.9)",
              }}
            >
              {["Open", "All"].map((st) => {
                const active = statusFilter === st;
                return (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    style={{
                      borderRadius: 999,
                      border: "none",
                      padding: "4px 9px",
                      fontSize: 11,
                      cursor: "pointer",
                      background: active
                        ? "radial-gradient(circle at top,#22c55e,#16a34a,#14532d)"
                        : "transparent",
                      color: active ? "#ecfdf5" : "#cbd5f5",
                    }}
                  >
                    {st}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            {/* Type filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{
                borderRadius: 999,
                padding: "6px 10px",
                border: "1px solid rgba(51,65,85,0.9)",
                background: "rgba(15,23,42,0.96)",
                color: "#e5e7eb",
                fontSize: 12,
                outline: "none",
                minWidth: 130,
              }}
            >
              <option value="All">All types</option>
              <option value="Coverage">Coverage</option>
              <option value="Endorsement">Endorsement</option>
              <option value="Document">Document</option>
              <option value="Info">Info</option>
            </select>

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
                border: "1px solid rgba(51,65,85,0.9)",
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
          </div>

          <div
            style={{
              fontSize: 10,
              color: "#6b7280",
            }}
          >
            Tip: Later we can add quick filters for{" "}
            <span style={{ color: "#e5e7eb" }}>“Rule engine only”</span>,{" "}
            <span style={{ color: "#e5e7eb" }}>“Requirements only”</span>, or{" "}
            <span style={{ color: "#e5e7eb" }}>“AI low confidence issues”</span>
            .
          </div>
        </div>
      </div>

      {/* MAIN GRID: TIMELINE + SNAPSHOTS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,2.1fr) minmax(0,1.4fr)",
          gap: 18,
          alignItems: "flex-start",
        }}
      >
        {/* LEFT — TIMELINE */}
        <div
          style={{
            borderRadius: 24,
            padding: 14,
            background:
              "radial-gradient(circle at top left,rgba(15,23,42,0.97),rgba(15,23,42,0.92))",
            border: "1px solid rgba(148,163,184,0.6)",
            boxShadow: "0 24px 60px rgba(15,23,42,0.98)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: 1.2,
                  color: "#9ca3af",
                  marginBottom: 4,
                }}
              >
                Alerts timeline
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "#e5e7eb",
                }}
              >
                Brighter, higher cards = more urgent issues to clear.
              </div>
            </div>
            <div
              style={{
                fontSize: 11,
                color: "#6b7280",
              }}
            >
              Showing {filteredAlerts.length} of {initialAlerts.length}
            </div>
          </div>

          <div
            style={{
              marginTop: 8,
            }}
          >
            {filteredAlerts.length === 0 ? (
              <div
                style={{
                  padding: "16px 14px",
                  borderRadius: 18,
                  border: "1px dashed rgba(75,85,99,0.9)",
                  fontSize: 12,
                  color: "#9ca3af",
                }}
              >
                No alerts match your filters. Try widening your severity or
                status selections.
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                {filteredAlerts.map((alert, index) => (
                  <AlertTimelineCard
                    key={alert.id}
                    alert={alert}
                    index={index}
                    canEdit={canEdit}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — SNAPSHOTS / HEAT / SUMMARY */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <RiskPulsePanel alerts={initialAlerts} />
          <WhereAlertsFromPanel alerts={initialAlerts} />
          <SelectedAlertHintPanel alerts={initialAlerts} />
        </div>
      </div>
    </div>
  );
}

/* ===========================
   SUBCOMPONENTS
=========================== */

function MetricCard({ label, value, tone }) {
  let border, bg, text;
  switch (tone) {
    case "critical":
      border = "rgba(248,113,113,0.85)";
      bg = "rgba(127,29,29,0.9)";
      text = "#fecaca";
      break;
    case "warning":
      border = "rgba(234,179,8,0.85)";
      bg = "rgba(113,63,18,0.9)";
      text = "#fef9c3";
      break;
    case "info":
      border = "rgba(56,189,248,0.85)";
      bg = "rgba(15,23,42,0.9)";
      text = "#e0f2fe";
      break;
    case "total":
    default:
      border = "rgba(148,163,184,0.85)";
      bg = "rgba(15,23,42,0.9)";
      text = "#e5e7eb";
  }

  return (
    <div
      style={{
        borderRadius: 18,
        padding: "12px 10px",
        border: `1px solid ${border}`,
        background: bg,
        boxShadow: "0 16px 40px rgba(15,23,42,0.95)",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        minHeight: 72,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "#cbd5f5",
          textTransform: "uppercase",
          letterSpacing: 1,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 600,
          color: text,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function AlertTimelineCard({ alert, index, canEdit }) {
  const meta = severityChipMeta(alert.severity);
  const isCritical = alert.severity === "Critical";
  const isHigh = alert.severity === "High";

  return (
    <div
      style={{
        position: "relative",
        padding: 11,
        borderRadius: 18,
        background:
          "radial-gradient(circle at top left,rgba(15,23,42,0.98),rgba(15,23,42,0.92))",
        border: `1px solid ${meta.border}`,
        boxShadow: isCritical
          ? "0 20px 50px rgba(248,113,113,0.4)"
          : isHigh
          ? "0 18px 45px rgba(250,204,21,0.3)"
          : "0 14px 35px rgba(15,23,42,0.95)",
        display: "grid",
        gridTemplateColumns: "18px minmax(0,1fr)",
        gap: 10,
        overflow: "hidden",
      }}
    >
      {/* timeline spine */}
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: index === 0 ? 4 : 0,
        }}
      >
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            background: meta.dot,
            boxShadow: `0 0 10px ${meta.dot}`,
            marginBottom: 4,
          }}
        />
        <div
          style={{
            flex: 1,
            width: 2,
            background:
              "linear-gradient(to bottom,rgba(148,163,184,0.6),transparent)",
          }}
        />
      </div>

      {/* content */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        {/* top row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 2,
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
                {alert.title}
              </div>
              <span
                style={{
                  fontSize: 11,
                  color: "#9ca3af",
                  whiteSpace: "nowrap",
                }}
              >
                {formatRelative(alert.createdAt)}
              </span>
            </div>
            <div
              style={{
                fontSize: 11,
                color: "#9ca3af",
              }}
            >
              {alert.message}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 4,
              flexShrink: 0,
            }}
          >
            <SeverityPill severity={alert.severity} />
            <div
              style={{
                fontSize: 10,
                color: "#6b7280",
              }}
            >
              {alert.status} · {alert.type}
            </div>
          </div>
        </div>

        {/* vendor + rule row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 3,
              fontSize: 11,
            }}
          >
            <div
              style={{
                color: "#e5e7eb",
              }}
            >
              {alert.vendorName}
            </div>
            <div
              style={{
                color: "#9ca3af",
              }}
            >
              {alert.vendorTagline}
            </div>
          </div>

          <div
            style={{
              fontSize: 10,
              color: "#9ca3af",
              textAlign: "right",
            }}
          >
            Rule:{" "}
            <span
              style={{
                color: "#e5e7eb",
              }}
            >
              {alert.ruleLabel}
            </span>
            <br />
            Field:{" "}
            <span
              style={{
                color: "#e5e7eb",
              }}
            >
              {alert.field}
            </span>
          </div>
        </div>

        {/* footer buttons */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
            marginTop: 4,
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: "#6b7280",
            }}
          >
            Source:{" "}
            <span
              style={{
                color: "#e5e7eb",
              }}
            >
              {alert.source}
            </span>
            {" · "}
            Created {formatDateTime(alert.createdAt)}
          </div>
          <div
            style={{
              display: "flex",
              gap: 6,
            }}
          >
            <button
              disabled={!canEdit}
              style={{
                borderRadius: 999,
                padding: "3px 8px",
                border: "1px solid rgba(148,163,184,0.8)",
                background: "rgba(15,23,42,0.96)",
                color: "#e5e7eb",
                fontSize: 10,
                cursor: canEdit ? "pointer" : "not-allowed",
              }}
            >
              View vendor
            </button>
            <button
              disabled={!canEdit}
              style={{
                borderRadius: 999,
                padding: "3px 8px",
                border: "1px solid rgba(34,197,94,0.9)",
                background:
                  "radial-gradient(circle at top left,#22c55e,#16a34a,#14532d)",
                color: "#ecfdf5",
                fontSize: 10,
                cursor: canEdit ? "pointer" : "not-allowed",
                opacity: canEdit ? 1 : 0.6,
              }}
            >
              Resolve
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SeverityPill({ severity }) {
  const meta = severityChipMeta(severity);
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "2px 7px",
        borderRadius: 999,
        background: meta.bg,
        border: `1px solid ${meta.border}`,
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: 999,
          background: meta.dot,
          boxShadow: `0 0 12px ${meta.dot}`,
        }}
      />
      <span
        style={{
          fontSize: 10,
          color: meta.text,
          textTransform: "uppercase",
          letterSpacing: 0.8,
        }}
      >
        {meta.label}
      </span>
    </div>
  );
}

/* ===========================
   RIGHT-SIDE PANELS
=========================== */

function RiskPulsePanel({ alerts }) {
  const openCount = alerts.filter((a) => a.status === "Open").length;
  const criticalCount = alerts.filter((a) => a.severity === "Critical").length;
  const highCount = alerts.filter((a) => a.severity === "High").length;

  const riskScore = Math.min(
    100,
    criticalCount * 25 + highCount * 10 + openCount * 3 + 20
  );

  return (
    <div
      style={{
        borderRadius: 22,
        padding: 12,
        background:
          "radial-gradient(circle at top right,rgba(15,23,42,0.96),rgba(15,23,42,1))",
        border: "1px solid rgba(148,163,184,0.55)",
        boxShadow: "0 22px 55px rgba(15,23,42,0.98)",
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
          marginBottom: 8,
        }}
      >
        {openCount} open alerts · {criticalCount} critical · {highCount} high
      </div>

      <div
        style={{
          marginBottom: 4,
          fontSize: 11,
          color: "#9ca3af",
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <span>Risk pulse (last 7 days)</span>
        <span>{riskScore}/100</span>
      </div>

      <div
        style={{
          width: "100%",
          height: 7,
          borderRadius: 999,
          background: "rgba(15,23,42,1)",
          overflow: "hidden",
          border: "1px solid rgba(30,64,175,0.9)",
          marginBottom: 10,
        }}
      >
        <div
          style={{
            width: `${riskScore}%`,
            height: "100%",
            background:
              "linear-gradient(90deg,#22c55e,#eab308,#fb7185,#ef4444)",
            boxShadow: "0 0 18px rgba(248,113,113,0.7)",
          }}
        />
      </div>

      {/* Simple "heatmap" blocks */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(0,1fr))",
          gap: 3,
          marginBottom: 4,
        }}
      >
        {new Array(14).fill(0).map((_, i) => {
          const level =
            i < criticalCount
              ? 3
              : i < criticalCount + highCount
              ? 2
              : i < openCount
              ? 1
              : 0;
          const bg =
            level === 3
              ? "#fb7185"
              : level === 2
              ? "#facc15"
              : level === 1
              ? "#22c55e"
              : "rgba(15,23,42,1)";
          const op = level === 0 ? 0.35 : 0.9;
          return (
            <div
              key={i}
              style={{
                height: 12,
                borderRadius: 3,
                background: bg,
                opacity: op,
              }}
            />
          );
        })}
      </div>

      <div
        style={{
          fontSize: 10,
          color: "#6b7280",
        }}
      >
        Brighter cells = more alerts fired in that window. It&apos;s your risk
        heatmap at a glance.
      </div>
    </div>
  );
}

function WhereAlertsFromPanel({ alerts }) {
  const coverage = alerts.filter((a) => a.type === "Coverage").length;
  const endorsements = alerts.filter((a) => a.type === "Endorsement").length;
  const documents = alerts.filter((a) => a.type === "Document").length;
  const info = alerts.filter((a) => a.type === "Info").length;

  return (
    <div
      style={{
        borderRadius: 22,
        padding: 12,
        background:
          "radial-gradient(circle at top right,rgba(15,23,42,0.97),rgba(15,23,42,1))",
        border: "1px solid rgba(148,163,184,0.55)",
        boxShadow: "0 22px 55px rgba(15,23,42,0.98)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: 1.2,
          color: "#9ca3af",
          marginBottom: 6,
        }}
      >
        Where alerts are coming from
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2,minmax(0,1fr))",
          gap: 8,
          fontSize: 11,
        }}
      >
        <AlertSourceRow label="Coverage" count={coverage} />
        <AlertSourceRow label="Endorsements" count={endorsements} />
        <AlertSourceRow label="Documents" count={documents} />
        <AlertSourceRow label="Info / other" count={info} />
      </div>
    </div>
  );
}

function AlertSourceRow({ label, count }) {
  return (
    <div
      style={{
        borderRadius: 14,
        padding: "7px 9px",
        border: "1px solid rgba(51,65,85,0.9)",
        background: "rgba(15,23,42,0.96)",
        display: "flex",
        justifyContent: "space-between",
        gap: 8,
        alignItems: "center",
      }}
    >
      <span
        style={{
          color: "#e5e7eb",
        }}
      >
        {label}
      </span>
      <span
        style={{
          color: "#9ca3af",
        }}
      >
        {count} open
      </span>
    </div>
  );
}

function SelectedAlertHintPanel({ alerts }) {
  const critical = alerts.find((a) => a.severity === "Critical") || alerts[0];

  if (!critical) return null;

  return (
    <div
      style={{
        borderRadius: 22,
        padding: 12,
        background:
          "radial-gradient(circle at top right,rgba(15,23,42,0.97),rgba(15,23,42,1))",
        border: "1px solid rgba(148,163,184,0.55)",
        boxShadow: "0 22px 55px rgba(15,23,42,0.98)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: 1.2,
          color: "#9ca3af",
          marginBottom: 6,
        }}
      >
        Example alert as seen by finance / risk
      </div>
      <div
        style={{
          fontSize: 12,
          color: "#e5e7eb",
          marginBottom: 4,
        }}
      >
        {critical.title}
      </div>
      <div
        style={{
          fontSize: 11,
          color: "#9ca3af",
          marginBottom: 8,
        }}
      >
        {critical.message}
      </div>
      <div
        style={{
          fontSize: 10,
          color: "#6b7280",
        }}
      >
        This is the narrative your finance or risk team will see when this alert
        shows up in their queue or email summaries.
      </div>
    </div>
  );
}

