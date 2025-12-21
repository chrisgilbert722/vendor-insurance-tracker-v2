// components/dashboard/ComplianceIntelligencePanel.js
// Phase 1A — Compliance Intelligence (Read-Only Overview)
// Visual dominance only. System is prepared; automation activates later.

export default function ComplianceIntelligencePanel({
  policies = [],
  alertSummary = null,
}) {
  // --------------------------------------------------
  // Derive document intelligence (safe, inferred)
  // --------------------------------------------------

  const coiCount = policies.length;

  const alertsByType = alertSummary?.countsByType || {};
  const alertsBySeverity = alertSummary?.countsBySeverity || {};

  // Infer document categories (Phase 1 = visual only)
  const docs = [
    {
      label: "Certificates of Insurance",
      icon: "🛡️",
      count: coiCount,
      status:
        alertsBySeverity?.critical > 0
          ? "critical"
          : alertsBySeverity?.high > 0
          ? "warning"
          : coiCount > 0
          ? "healthy"
          : "missing",
    },
    {
      label: "W-9 Forms",
      icon: "📄",
      count: alertsByType?.missing_w9 || 0,
      status: alertsByType?.missing_w9 > 0 ? "attention" : "placeholder",
    },
    {
      label: "Licenses",
      icon: "🏗️",
      count: alertsByType?.missing_license || 0,
      status: alertsByType?.missing_license > 0 ? "attention" : "placeholder",
    },
    {
      label: "Contracts",
      icon: "📑",
      count: alertsByType?.contract_issue || 0,
      status: alertsByType?.contract_issue > 0 ? "attention" : "placeholder",
    },
    {
      label: "Safety Plans",
      icon: "📋",
      count: alertsByType?.safety_plan_missing || 0,
      status: alertsByType?.safety_plan_missing > 0 ? "attention" : "placeholder",
    },
  ];

  return (
    <div
      style={{
        marginBottom: 24,
        borderRadius: 22,
        padding: 18,
        border: "1px solid rgba(148,163,184,0.45)",
        background:
          "radial-gradient(circle at top left, rgba(15,23,42,0.98), rgba(15,23,42,0.94))",
        boxShadow:
          "0 0 40px rgba(56,189,248,0.18), inset 0 0 22px rgba(0,0,0,0.45)",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: "0.18em",
          color: "rgba(148,163,184,0.85)",
          marginBottom: 10,
        }}
      >
        Compliance Intelligence
      </div>

      {/* SYSTEM STATUS LINE (NEW — DAY 11) */}
      <div
        style={{
          fontSize: 13,
          color: "#cbd5f5",
          marginBottom: 18,
        }}
      >
        Compliance monitoring is active. Automated actions are prepared and will
        begin running once automation is activated.
      </div>

      {/* GRID */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
        }}
      >
        {docs.map((d) => (
          <div
            key={d.label}
            style={{
              borderRadius: 16,
              padding: 14,
              border: statusBorder(d.status),
              background: "rgba(15,23,42,0.92)",
              boxShadow: statusGlow(d.status),
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div style={{ fontSize: 22 }}>{d.icon}</div>

            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#e5e7eb",
                }}
              >
                {d.label}
              </div>

              <div
                style={{
                  fontSize: 12,
                  marginTop: 4,
                  color: statusColor(d.status),
                }}
              >
                {statusText(d.status, d.count)}
              </div>
            </div>

            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: statusColor(d.status),
              }}
            >
              {d.count}
            </div>
          </div>
        ))}
      </div>

      {/* FOOTER SYSTEM NOTE (NEW — DAY 11) */}
      <div
        style={{
          marginTop: 18,
          paddingTop: 14,
          borderTop: "1px solid rgba(148,163,184,0.18)",
          fontSize: 13,
          color: "#9ca3af",
        }}
      >
        Automation is standing by. No additional configuration is required.
      </div>
    </div>
  );
}

/* ============================================================
   STATUS HELPERS (LOCAL, SAFE)
============================================================ */

function statusText(status, count) {
  switch (status) {
    case "critical":
      return "Critical issues detected";
    case "warning":
      return "Attention required";
    case "healthy":
      return "Healthy";
    case "attention":
      return `${count} issues detected`;
    case "missing":
      return "No documents uploaded yet";
    default:
      return "Monitored by system";
  }
}

function statusColor(status) {
  switch (status) {
    case "critical":
      return "#fb7185";
    case "warning":
      return "#facc15";
    case "attention":
      return "#38bdf8";
    case "healthy":
      return "#22c55e";
    default:
      return "#9ca3af";
  }
}

function statusBorder(status) {
  return `1px solid ${statusColor(status)}80`;
}

function statusGlow(status) {
  return `0 0 18px ${statusColor(status)}33`;
}
