// components/dashboard/PropertyManagementRiskPreview.js
// ============================================================
// Property Management Risk Preview
// - Self-selling, read-only risk framing
// - Replaces sales calls
// - Designed for Property Managers
// ============================================================

export default function PropertyManagementRiskPreview({
  complianceScore = 0,
  nonCompliantVendors = 0,
  expiringSoon = 0,
  missingEndorsements = 0,
  vendorsTotal = 0,
  locked = true,
}) {
  return (
    <div
      style={{
        marginBottom: 28,
        padding: 28,
        borderRadius: 28,
        background:
          "radial-gradient(circle at top left, rgba(15,23,42,0.98), rgba(2,6,23,0.96))",
        border: "1px solid rgba(239,68,68,0.45)",
        boxShadow:
          "0 0 80px rgba(239,68,68,0.18), inset 0 0 30px rgba(15,23,42,0.9)",
      }}
    >
      {/* HEADER */}
      <div style={{ marginBottom: 18 }}>
        <h2
          style={{
            margin: 0,
            fontSize: 26,
            fontWeight: 700,
            color: "#fecaca",
            textShadow: "0 0 18px rgba(239,68,68,0.6)",
          }}
        >
          Your Properties Are Exposed to Vendor Insurance Risk
        </h2>

        <p style={{ marginTop: 8, fontSize: 14, color: "#9ca3af" }}>
          We analyzed vendors servicing your properties. These gaps increase
          owner liability exposure and audit risk.
        </p>
      </div>

      {/* METRICS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 18,
          marginBottom: 22,
        }}
      >
        <Metric
          label="Non-Compliant Vendors"
          value={nonCompliantVendors}
          color="#ef4444"
        />
        <Metric
          label="COIs Expiring ≤30 Days"
          value={expiringSoon}
          color="#f59e0b"
        />
        <Metric
          label="Missing Endorsements"
          value={missingEndorsements}
          color="#eab308"
        />
        <Metric
          label="Compliance Score"
          value={`${complianceScore}%`}
          color="#22c55e"
        />
      </div>

      {/* OWNER FRAMING */}
      <div
        style={{
          marginBottom: 22,
          padding: 16,
          borderRadius: 16,
          background: "rgba(15,23,42,0.9)",
          border: "1px solid rgba(148,163,184,0.3)",
        }}
      >
        <p style={{ margin: 0, fontSize: 14, color: "#e5e7eb" }}>
          Property owners expect vendors to meet insurance requirements at all
          times. These gaps can surface during claims, audits, or owner reviews.
        </p>
      </div>

      {/* FIX PREVIEW */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <FixItem text="Vendor COI reminders prepared" />
        <FixItem text="Broker request emails ready" />
        <FixItem text="Renewal autopilot configured" />
        <FixItem text="Audit-ready compliance reports generated" />
      </div>

      {/* PAYWALL CTA */}
      {locked && (
        <div
          style={{
            padding: 20,
            borderRadius: 20,
            background:
              "linear-gradient(135deg, rgba(56,189,248,0.15), rgba(99,102,241,0.18))",
            border: "1px solid rgba(56,189,248,0.45)",
            boxShadow: "0 0 40px rgba(56,189,248,0.4)",
          }}
        >
          <h3
            style={{
              margin: 0,
              marginBottom: 6,
              fontSize: 18,
              color: "#e5f2ff",
            }}
          >
            Automation Is Paused
          </h3>

          <p style={{ margin: 0, marginBottom: 14, fontSize: 14, color: "#c7d2fe" }}>
            Fix plans are ready, but vendor reminders and renewals won’t run
            until automation is activated.
          </p>

          <button
            disabled
            style={{
              padding: "10px 20px",
              borderRadius: 999,
              border: "1px solid rgba(56,189,248,0.9)",
              background:
                "linear-gradient(90deg,#38bdf8,#6366f1,#0f172a)",
              color: "#020617",
              fontWeight: 700,
              cursor: "not-allowed",
              opacity: 0.9,
            }}
          >
            Activate Automation
          </button>

          <div
            style={{
              marginTop: 10,
              fontSize: 12,
              color: "#9ca3af",
            }}
          >
            Activate to automatically fix vendor compliance and protect owners.
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   SUBCOMPONENTS
============================================================ */

function Metric({ label, value, color }) {
  return (
    <div
      style={{
        padding: 18,
        borderRadius: 18,
        background: "rgba(15,23,42,0.95)",
        border: `1px solid ${color}55`,
        boxShadow: `0 0 20px ${color}33`,
      }}
    >
      <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 6 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          color,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function FixItem({ text }) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 14,
        background: "rgba(2,6,23,0.8)",
        border: "1px solid rgba(148,163,184,0.25)",
        fontSize: 13,
        color: "#e5e7eb",
      }}
    >
      ✔ {text}
    </div>
  );
}
