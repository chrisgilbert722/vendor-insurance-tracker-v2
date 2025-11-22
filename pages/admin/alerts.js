// pages/admin/alerts.js
import { useState, useMemo } from "react";
import { useOrg } from "../../context/OrgContext";
import { useRole } from "../../lib/useRole";

/* ===========================
   CINEMATIC THEME TOKENS
=========================== */
const GP = {
  red: "#FF3B3B",
  orange: "#FF9800",
  yellow: "#FFC107",
  green: "#00C27A",
  blueSoft: "#38bdf8",
  ink: "#0D1623",
  inkSoft: "#64748B",
  surface: "#020617",
  border: "#1E293B",
};

/* ===========================
   MOCK ALERTS (Replace later)
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
   HELPERS
=========================== */
function formatRelative(iso) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = diff / 60000;
  if (mins < 1) return "just now";
  if (mins < 60) return `${Math.round(mins)}m ago`;
  const hrs = mins / 60;
  if (hrs < 24) return `${Math.round(hrs)}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const severityRank = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};
/* ===========================
   MAIN PAGE — CINEMATIC V2.1
=========================== */
export default function AlertsPage() {
  const { orgId } = useOrg();
  const { isAdmin, isManager } = useRole();
  const canEdit = isAdmin || isManager;

  const [severityFilter, setSeverityFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("Open");
  const [search, setSearch] = useState("");

  const metrics = useMemo(() => {
    return {
      total: initialAlerts.length,
      critical: initialAlerts.filter((a) => a.severity === "Critical").length,
      warning: initialAlerts.filter(
        (a) => a.severity === "High" || a.severity === "Medium"
      ).length,
      info: initialAlerts.filter((a) => a.severity === "Low").length,
    };
  }, []);

  const filtered = useMemo(() => {
    return initialAlerts
      .filter((a) => {
        if (severityFilter !== "All" && a.severity !== severityFilter)
          return false;
        if (typeFilter !== "All" && a.type !== typeFilter) return false;
        if (statusFilter !== "All" && a.status !== statusFilter) return false;

        if (search.length) {
          const hay = (
            a.title +
            " " +
            a.message +
            " " +
            a.vendorName +
            " " +
            a.ruleLabel
          ).toLowerCase();
          if (!hay.includes(search.toLowerCase())) return false;
        }
        return true;
      })
      .sort(
        (a, b) =>
          severityRank[b.severity] - severityRank[a.severity] ||
          new Date(b.createdAt) - new Date(a.createdAt)
      );
  }, [severityFilter, typeFilter, statusFilter, search]);

  return (
    <div
      style={{
        minHeight: "100vh",
        position: "relative",
        background:
          "radial-gradient(circle at top left,#020617 0%, #020617 40%, #000 100%)",
        padding: "30px 40px 40px",
        color: "#e5e7eb",
        overflowX: "hidden",
      }}
    >
      {/* CINEMATIC HEADER AURA */}
      <div
        style={{
          position: "absolute",
          top: -200,
          left: "50%",
          transform: "translateX(-50%)",
          width: 900,
          height: 900,
          background:
            "radial-gradient(circle, rgba(255,120,0,0.22), transparent 60%)",
          filter: "blur(90px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* HEADER */}
      <div style={{ position: "relative", zIndex: 2 }}>
        <div
          style={{
            display: "flex",
            gap: 14,
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <div
            style={{
              padding: 12,
              borderRadius: 999,
              background:
                "radial-gradient(circle at 30% 0,#f97316,#ea580c,#7c2d12)",
              boxShadow: "0 0 40px rgba(248,113,113,0.5)",
            }}
          >
            <span style={{ fontSize: 22 }}>🚨</span>
          </div>

          <div>
            <div
              style={{
                display: "inline-flex",
                gap: 8,
                padding: "4px 10px",
                borderRadius: 999,
                border: "1px solid rgba(148,163,184,0.4)",
                background:
                  "linear-gradient(120deg,rgba(15,23,42,0.9),rgba(15,23,42,0))",
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  color: "#9ca3af",
                  letterSpacing: 1.2,
                  textTransform: "uppercase",
                }}
              >
                Alerts Dashboard V2.1
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: "#f97316",
                  letterSpacing: 1,
                  textTransform: "uppercase",
                }}
              >
                real-time risk pulse
              </span>
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: 28,
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
              Live feed of your rule engine + requirements engine firing.
            </p>
          </div>
        </div>

      {/* METRICS + FILTERS */}
      <MetricsAndFilters
        metrics={metrics}
        severityFilter={severityFilter}
        setSeverityFilter={setSeverityFilter}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        search={search}
                setSearch={setSearch}
      />

      {/* ===========================
          METRICS + FILTERS PANEL
      ============================ */}

function MetricsAndFilters({

  metrics,
  severityFilter,
  setSeverityFilter,
  typeFilter,
  setTypeFilter,
  statusFilter,
  setStatusFilter,
  search,
  setSearch,
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0,2.1fr) minmax(0,1.5fr)",
        gap: 18,
        marginTop: 24,
        marginBottom: 24,
      }}
    >
      {/* LEFT — 4 METRICS */}
      <MetricPanel metrics={metrics} />

      {/* RIGHT — FILTERS */}
      <div
        style={{
          borderRadius: 22,
          padding: 16,
          background:
            "linear-gradient(135deg,rgba(15,23,42,0.96),rgba(15,23,42,0.9))",
          border: "1px solid rgba(148,163,184,0.4)",
          boxShadow: "0 22px 50px rgba(15,23,42,0.98)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div
          style={{
            fontSize: 11,
            letterSpacing: 1.2,
            color: "#9ca3af",
            textTransform: "uppercase",
          }}
        >
          Filters
        </div>

        {/* Filter pills */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            alignItems: "center",
          }}
        >
          <FilterPillGroup
            options={["All", "Critical", "High", "Medium", "Low"]}
            active={severityFilter}
            onSelect={setSeverityFilter}
            palette="severity"
          />

          <FilterPillGroup
            options={["Open", "All"]}
            active={statusFilter}
            onSelect={setStatusFilter}
            palette="status"
          />
        </div>

        {/* Type + Search */}
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          {/* Type selector */}
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

          {/* Search bar */}
          <div
            style={{
              flex: 1,
              minWidth: 160,
              background: "rgba(15,23,42,0.95)",
              border: "1px solid rgba(51,65,85,0.9)",
              borderRadius: 999,
              display: "flex",
              alignItems: "center",
              padding: "4px 9px",
              gap: 6,
            }}
          >
            <span style={{ color: "#6b7280", fontSize: 12 }}>🔍</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search all alerts…"
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
      </div>
    </div>
  );
}
/* ===========================
   METRIC PANEL (4 KPIs)
=========================== */

function MetricPanel({ metrics }) {
  return (
    <div
      style={{
        borderRadius: 22,
        padding: 16,
        background:
          "radial-gradient(circle at top left,rgba(15,23,42,0.96),rgba(15,23,42,0.92))",
        border: "1px solid rgba(148,163,184,0.55)",
        boxShadow:
          "0 25px 65px rgba(0,0,0,0.55), 0 0 25px rgba(248,113,113,0.25) inset",
        display: "grid",
        gridTemplateColumns: "repeat(4,minmax(0,1fr))",
        gap: 12,
      }}
    >
      <MetricCard label="Critical" value={metrics.critical} tone="critical" />
      <MetricCard label="Warning" value={metrics.warning} tone="warning" />
      <MetricCard label="Info" value={metrics.info} tone="info" />
      <MetricCard label="Total" value={metrics.total} tone="total" />
    </div>
  );
}

/* ===========================
   SINGLE METRIC CARD
=========================== */

function MetricCard({ label, value, tone }) {
  const palette = {
    critical: {
      border: "rgba(248,113,113,0.85)",
      bg: "rgba(127,29,29,0.85)",
      text: "#fecaca",
    },
    warning: {
      border: "rgba(250,204,21,0.85)",
      bg: "rgba(113,63,18,0.85)",
      text: "#fef9c3",
    },
    info: {
      border: "rgba(56,189,248,0.85)",
      bg: "rgba(15,23,42,0.85)",
      text: "#e0f2fe",
    },
    total: {
      border: "rgba(148,163,184,0.85)",
      bg: "rgba(15,23,42,0.85)",
      text: "#e5e7eb",
    },
  }[tone];

  return (
    <div
      style={{
        borderRadius: 18,
        padding: "14px 12px",
        border: `1px solid ${palette.border}`,
        background: palette.bg,
        color: palette.text,
        boxShadow:
          "0 20px 55px rgba(15,23,42,0.85), 0 0 15px rgba(255,255,255,0.08) inset",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 4,
        minHeight: 88,
      }}
    >
      <div
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: 1.1,
          color: "#cbd5f5",
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 26,
          fontWeight: 600,
          color: palette.text,
        }}
      >
        {value}
      </div>
    </div>
  );
}

/* ===========================
   FILTER PILL GROUP
=========================== */

function FilterPillGroup({ options, active, onSelect, palette }) {
  const colors = {
    severity: {
      Critical: "#f97316",
      High: "#facc15",
      Medium: "#38bdf8",
      Low: "#34d399",
      All: "#cbd5f5",
    },
    status: {
      Open: "#22c55e",
      All: "#cbd5f5",
    },
  }[palette];

  return (
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
      {options.map((opt) => {
        const isActive = active === opt;

        return (
          <button
            key={opt}
            onClick={() => onSelect(opt)}
            style={{
              borderRadius: 999,
              border: "none",
              padding: "5px 10px",
              fontSize: 11,
              cursor: "pointer",
              background: isActive
                ? `radial-gradient(circle at top, ${colors[opt]}AA, ${colors[opt]}44, #0f172a)`
                : "transparent",
              color: isActive ? "#ffffff" : "#cbd5f5",
              transition: "0.2s ease",
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
/* ===========================
   MAIN GRID WRAPPER
=========================== */

function MainGrid({ filtered, allAlerts, canEdit }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0,2.1fr) minmax(0,1.4fr)",
        gap: 20,
        alignItems: "flex-start",
        marginBottom: 50,
      }}
    >
      <TimelinePanel filtered={filtered} canEdit={canEdit} />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <RiskPulsePanel alerts={allAlerts} />
        <WhereAlertsFromPanel alerts={allAlerts} />
        <SelectedAlertHintPanel alerts={allAlerts} />
      </div>
    </div>
  );
}

/* ===========================
   TIMELINE PANEL
=========================== */

function TimelinePanel({ filtered, canEdit }) {
  return (
    <div
      style={{
        borderRadius: 24,
        padding: 16,
        background:
          "radial-gradient(circle at top left,rgba(15,23,42,0.97),rgba(15,23,42,0.92))",
        border: "1px solid rgba(148,163,184,0.6)",
        boxShadow: "0 24px 60px rgba(15,23,42,0.98)",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              color: "#9ca3af",
              marginBottom: 4,
            }}
          >
            Alerts Timeline
          </div>
          <div style={{ fontSize: 13, color: "#e5e7eb" }}>
            Brighter, higher cards = more urgent issues.
          </div>
        </div>

        <div style={{ fontSize: 11, color: "#6b7280" }}>
          Showing {filtered.length}
        </div>
      </div>

      {/* TIMELINE FEED */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.map((alert, idx) => (
          <AlertCard
            key={alert.id}
            alert={alert}
            index={idx}
            canEdit={canEdit}
          />
        ))}
      </div>
    </div>
  );
}

/* ===========================
   INDIVIDUAL ALERT CARD
=========================== */

function AlertCard({ alert, index, canEdit }) {
  const meta = {
    Critical: {
      dot: "#f97316",
      bg: "rgba(127,29,29,0.95)",
      glow: "0 20px 50px rgba(248,113,113,0.4)",
    },
    High: {
      dot: "#facc15",
      bg: "rgba(113,63,18,0.95)",
      glow: "0 18px 45px rgba(250,204,21,0.3)",
    },
    Medium: {
      dot: "#38bdf8",
      bg: "rgba(15,23,42,0.95)",
      glow: "0 14px 35px rgba(56,189,248,0.3)",
    },
    Low: {
      dot: "#34d399",
      bg: "rgba(15,23,42,0.95)",
      glow: "0 14px 35px rgba(52,211,153,0.25)",
    },
  }[alert.severity];
  return (
    <div
      style={{
        position: "relative",
        padding: 14,
        borderRadius: 20,
        background:
          "radial-gradient(circle at top left,rgba(15,23,42,0.99),rgba(15,23,42,0.94))",
        border: `1px solid ${meta.dot}55`,
        boxShadow: meta.glow,
        display: "grid",
        gridTemplateColumns: "22px minmax(0,1fr)",
        gap: 12,
      }}
    >
      {/* TIMELINE SPINE */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
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

      {/* CONTENT */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {/* TITLE + TIMESTAMP */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          {/* Title + Message */}
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "#e5e7eb",
                marginBottom: 2,
              }}
            >
              {alert.title}
            </div>

            <div style={{ fontSize: 11, color: "#9ca3af" }}>
              {alert.message}
            </div>
          </div>

          {/* Top-right severity badge */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <SeverityBadge severity={alert.severity} />
            <span style={{ fontSize: 10, color: "#6b7280" }}>
              {alert.status} · {formatRelative(alert.createdAt)}
            </span>
          </div>
        </div>

        {/* Vendor + Rule details */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 11,
            color: "#9ca3af",
          }}
        >
          <div>
            <div style={{ color: "#e5e7eb" }}>{alert.vendorName}</div>
            <div>{alert.vendorTagline}</div>
          </div>

          <div style={{ textAlign: "right" }}>
            Rule:{" "}
            <span style={{ color: "#e5e7eb" }}>{alert.ruleLabel}</span>
            <br />
            Field:{" "}
            <span style={{ color: "#e5e7eb" }}>{alert.field}</span>
          </div>
        </div>

        {/* FOOTER BUTTONS */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 4,
          }}
        >
          <span style={{ fontSize: 10, color: "#6b7280" }}>
            Source: {alert.source} · {formatDate(alert.createdAt)}
          </span>

          <div style={{ display: "flex", gap: 6 }}>
            <button
              style={{
                borderRadius: 999,
                padding: "3px 8px",
                border: "1px solid rgba(148,163,184,0.8)",
                background: "rgba(15,23,42,0.96)",
                color: "#e5e7eb",
                fontSize: 10,
              }}
            >
              View vendor
            </button>

            <button
              style={{
                borderRadius: 999,
                padding: "3px 8px",
                border: "1px solid rgba(22,163,74,0.9)",
                background:
                  "radial-gradient(circle at top,#22c55e,#16a34a,#14532d)",
                color: "#ecfdf5",
                fontSize: 10,
                opacity: canEdit ? 1 : 0.5,
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

/* ===========================
   SEVERITY BADGE
=========================== */

function SeverityBadge({ severity }) {
  const palette = {
    Critical: ["#f97316", "#fecaca"],
    High: ["#facc15", "#fef9c3"],
    Medium: ["#38bdf8", "#e0f2fe"],
    Low: ["#34d399", "#ccfbf1"],
  }[severity];

  return (
    <div
      style={{
        padding: "3px 8px",
        borderRadius: 999,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: `${palette[0]}22`,
        border: `1px solid ${palette[0]}`,
      }}
    >
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: palette[0],
          boxShadow: `0 0 12px ${palette[0]}`,
        }}
      />
      <span
        style={{
          fontSize: 10,
          color: palette[1],
          letterSpacing: 0.8,
          textTransform: "uppercase",
        }}
      >
        {severity}
      </span>
    </div>
  );
}
/* ===========================
   RIGHT PANEL — RISK PULSE
=========================== */

function RiskPulsePanel({ alerts }) {
  const open = alerts.length;
  const critical = alerts.filter((a) => a.severity === "Critical").length;
  const high = alerts.filter((a) => a.severity === "High").length;

  const riskScore = Math.min(100, critical * 30 + high * 10 + open * 3 + 20);

  return (
    <div
      style={{
        borderRadius: 22,
        padding: 16,
        background:
          "radial-gradient(circle at top right,rgba(15,23,42,0.96),rgba(15,23,42,1))",
        border: "1px solid rgba(148,163,184,0.55)",
        boxShadow: "0 22px 55px rgba(15,23,42,0.98)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: 1.2,
          textTransform: "uppercase",
          color: "#9ca3af",
          marginBottom: 4,
        }}
      >
        Live Risk Snapshot
      </div>

      <div style={{ fontSize: 13, color: "#e5e7eb", marginBottom: 10 }}>
        {open} open alerts · {critical} critical · {high} high
      </div>

      {/* Animated Risk Pulse Bar */}
      <div
        style={{
          height: 8,
          width: "100%",
          borderRadius: 999,
          overflow: "hidden",
          background: "#0f172a",
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
            animation: "pulseShift 4s infinite linear",
          }}
        />
      </div>

      <style>{`
        @keyframes pulseShift {
          0% { filter: brightness(1); }
          50% { filter: brightness(1.25); }
          100% { filter: brightness(1); }
        }
      `}</style>

      {/* Heat map bricks */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(0,1fr))",
          gap: 4,
        }}
      >
        {new Array(14).fill(0).map((_, i) => {
          const level =
            i < critical * 2
              ? "#fb7185"
              : i < critical * 2 + high * 2
              ? "#facc15"
              : "#22c55e";
          const op =
            i < critical * 2 + high * 2 ? 0.9 : 0.35;
          return (
            <div
              key={i}
              style={{
                height: 14,
                borderRadius: 4,
                background: level,
                opacity: op,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
/* ===========================
   WHERE ALERTS COME FROM
=========================== */

function WhereAlertsFromPanel({ alerts }) {
  const coverage = alerts.filter((a) => a.type === "Coverage").length;
  const endorsements = alerts.filter((a) => a.type === "Endorsement").length;
  const documents = alerts.filter((a) => a.type === "Document").length;
  const info = alerts.filter((a) => a.type === "Info").length;

  return (
    <div
      style={{
        borderRadius: 22,
        padding: 16,
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
          color: "#9ca3af",
          marginBottom: 8,
        }}
      >
        Where Alerts Are Coming From
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2,minmax(0,1fr))",
          gap: 10,
        }}
      >
        <SourceCard label="Coverage" value={coverage} />
        <SourceCard label="Endorsements" value={endorsements} />
        <SourceCard label="Documents" value={documents} />
        <SourceCard label="Info / Other" value={info} />
      </div>
    </div>
  );
}

function SourceCard({ label, value }) {
  return (
    <div
      style={{
        borderRadius: 16,
        padding: "10px 12px",
        border: "1px solid rgba(75,85,99,0.9)",
        background: "rgba(15,23,42,0.95)",
        display: "flex",
        justifyContent: "space-between",
        fontSize: 12,
        color: "#e5e7eb",
      }}
    >
      <span>{label}</span>
      <span style={{ color: "#9ca3af" }}>{value} open</span>
    </div>
  );
}

/* ===========================
   SELECTED ALERT EXAMPLE
=========================== */

function SelectedAlertHintPanel({ alerts }) {
  const picked = alerts[0];
  if (!picked) return null;

  return (
    <div
      style={{
        borderRadius: 22,
        padding: 16,
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
          marginBottom: 8,
          color: "#9ca3af",
        }}
      >
        Example Alert Seen by Finance / Risk
      </div>

      <div style={{ fontSize: 13, color: "#e5e7eb", marginBottom: 6 }}>
        {picked.title}
      </div>

      <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 8 }}>
        {picked.message}
      </div>

      <div style={{ fontSize: 10, color: "#6b7280" }}>
        This is what finance / risk sees as the issue description.
      </div>
    </div>
  );
}
/* ===========================
   END OF FILE — SAFE CLOSE
=========================== */

// No additional exports needed.
// AlertsPage is already the default export.
// All subcomponents live inside this file.

//
// File ends here.
//
