// components/dashboard/PropertyManagementRiskPreview.js
// ============================================================
// Portfolio Exposure Overview (Cockpit Extension)
// - Matches Iron Man cockpit language (neon + holographic)
// - Derived intelligence for Property Managers
// ============================================================

export default function PropertyManagementRiskPreview({
  complianceScore = 0,
  nonCompliantVendors = 0,
  expiringSoon = 0,
  missingEndorsements = 0,
  vendorsTotal = 0,
  locked = true,
}) {
  // Severity helpers (simple, stable)
  const sevNonCompliant =
    nonCompliantVendors > 0 ? "critical" : "ok";
  const sevExpiring =
    expiringSoon > 0 ? (expiringSoon >= 5 ? "critical" : "warn") : "ok";
  const sevEndorsements =
    missingEndorsements > 0 ? (missingEndorsements >= 5 ? "critical" : "warn") : "ok";
  const sevScore =
    complianceScore >= 90 ? "ok" : complianceScore >= 75 ? "warn" : "critical";

  const statusLine = locked
    ? "AUTOMATION STATUS: PAUSED · Complete setup to enable renewals + reminders"
    : "AUTOMATION STATUS: ACTIVE · Renewals and compliance enforcement running";

  return (
    <div
      style={{
        marginTop: 18,
        marginBottom: 24,
        borderRadius: 26,
        padding: 22,
        position: "relative",
        overflow: "hidden",

        // Cockpit-aligned background (quiet, holographic)
        background:
          "radial-gradient(circle at top left, rgba(15,23,42,0.92), rgba(2,6,23,0.98))",

        border: "1px solid rgba(148,163,184,0.22)",
        boxShadow:
          "0 0 0 1px rgba(255,255,255,0.02), 0 28px 70px rgba(0,0,0,0.55)",
      }}
    >
      {/* Breathing system aura */}
      <style>
        {`
          @keyframes pmPulse {
            0%   { opacity: .28; transform: translate(-50%, -50%) scale(1); }
            50%  { opacity: .42; transform: translate(-50%, -50%) scale(1.05); }
            100% { opacity: .28; transform: translate(-50%, -50%) scale(1); }
          }
        `}
      </style>

      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "18%",
          width: 520,
          height: 520,
          transform: "translate(-50%, -50%)",
          background:
            "radial-gradient(circle, rgba(56,189,248,0.22), transparent 60%)",
          filter: "blur(40px)",
          animation: "pmPulse 4.8s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "78%",
          width: 620,
          height: 620,
          transform: "translate(-50%, -50%)",
          background:
            "radial-gradient(circle, rgba(168,85,247,0.18), transparent 60%)",
          filter: "blur(50px)",
          animation: "pmPulse 5.6s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />

      {/* Header */}
      <div style={{ position: "relative", zIndex: 1, marginBottom: 14 }}>
        <div
          style={{
            display: "inline-flex",
            gap: 8,
            alignItems: "center",
            padding: "4px 10px",
            borderRadius: 999,
            border: "1px solid rgba(148,163,184,0.25)",
            background:
              "linear-gradient(120deg,rgba(15,23,42,0.85),rgba(2,6,23,0.65))",
            marginBottom: 8,
          }}
        >
          <span
            style={{
              fontSize: 10,
              color: "#9ca3af",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            Portfolio
          </span>
          <span
            style={{
              fontSize: 10,
              color: "#38bdf8",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            Exposure Overview
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 650,
              color: "#e5e7eb",
            }}
          >
            Property Risk Intelligence
          </h3>

          <div style={{ fontSize: 12, color: "#9ca3af" }}>
            Vendors tracked:{" "}
            <span style={{ color: "#e5e7eb", fontWeight: 600 }}>
              {Number(vendorsTotal || 0)}
            </span>
          </div>
        </div>

        <div style={{ marginTop: 6, fontSize: 13, color: "#9ca3af" }}>
          Vendor insurance status across your property portfolio.
        </div>
      </div>

      {/* KPI strip (cockpit extension — no “random boxes”) */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 12,
          marginTop: 14,
        }}
      >
        <Kpi
          label="Non-Compliant Vendors"
          value={Number(nonCompliantVendors || 0)}
          severity={sevNonCompliant}
        />
        <Kpi
          label="COIs Expiring ≤30d"
          value={Number(expiringSoon || 0)}
          severity={sevExpiring}
        />
        <Kpi
          label="Missing Endorsements"
          value={Number(missingEndorsements || 0)}
          severity={sevEndorsements}
        />
        <Kpi
          label="Compliance Score"
          value={`${Number(complianceScore || 0)}%`}
          severity={sevScore}
        />
      </div>

      {/* Operator status line */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          marginTop: 14,
          padding: "10px 12px",
          borderRadius: 14,
          border: "1px solid rgba(148,163,184,0.18)",
          background: "rgba(2,6,23,0.55)",
          color: "#cbd5f5",
          fontSize: 12,
          letterSpacing: "0.02em",
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <span>
          OWNER EXPOSURE:{" "}
          <span style={{ color: sevNonCompliant === "ok" ? "#22c55e" : "#ef4444", fontWeight: 700 }}>
            {sevNonCompliant === "ok" ? "NONE DETECTED" : "ACTION REQUIRED"}
          </span>
        </span>

        <span style={{ color: "#9ca3af" }}>{statusLine}</span>
      </div>
    </div>
  );
}

/* ============================================================
   KPI TILE (Cockpit-style)
============================================================ */

function Kpi({ label, value, severity }) {
  const palette =
    severity === "critical"
      ? { border: "rgba(239,68,68,0.35)", glow: "rgba(239,68,68,0.22)", value: "#fecaca" }
      : severity === "warn"
      ? { border: "rgba(245,158,11,0.35)", glow: "rgba(245,158,11,0.18)", value: "#fde68a" }
      : { border: "rgba(34,197,94,0.28)", glow: "rgba(34,197,94,0.14)", value: "#bbf7d0" };

  return (
    <div
      style={{
        padding: 14,
        borderRadius: 16,
        background: "rgba(15,23,42,0.72)",
        border: `1px solid ${palette.border}`,
        boxShadow: `0 0 18px ${palette.glow}`,
        minHeight: 72,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div style={{ fontSize: 12, color: "#9ca3af", lineHeight: 1.2 }}>
        {label}
      </div>

      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: palette.value,
          textShadow: "0 0 16px rgba(0,0,0,0.35)",
        }}
      >
        {value}
      </div>
    </div>
  );
}
