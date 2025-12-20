// components/dashboard/PropertyManagementRiskPreview.js
// ============================================================
// Property Risk Analysis (Derived Intelligence)
// - Quiet, authoritative, system-aligned
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
        marginTop: 24,
        marginBottom: 28,
        padding: 24,
        borderRadius: 22,
        background:
          "radial-gradient(circle at top, rgba(15,23,42,0.95), rgba(2,6,23,0.98))",
        border: "1px solid rgba(148,163,184,0.35)",
        boxShadow:
          "0 0 40px rgba(56,189,248,0.15), inset 0 0 24px rgba(15,23,42,0.9)",
      }}
    >
      {/* HEADER */}
      <div style={{ marginBottom: 16 }}>
        <h3
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 600,
            color: "#e5e7eb",
          }}
        >
          Property Risk Analysis
        </h3>

        <p style={{ marginTop: 6, fontSize: 13, color: "#9ca3af" }}>
          Vendor insurance status across your property portfolio.
        </p>
      </div>

      {/* METRICS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 14,
          marginBottom: 18,
        }}
      >
        <Metric label="Non-Compliant Vendors" value={nonCompliantVendors} />
        <Metric label="COIs Expiring ≤30 Days" value={expiringSoon} />
        <Metric label="Missing Endorsements" value={missingEndorsements} />
        <Metric label="Compliance Score" value={`${complianceScore}%`} />
      </div>

      {/* SYSTEM NOTE */}
      <div
        style={{
          fontSize: 13,
          color: "#cbd5f5",
          padding: 14,
          borderRadius: 14,
          background: "rgba(15,23,42,0.85)",
          border: "1px solid rgba(99,102,241,0.35)",
        }}
      >
        These gaps may increase owner liability exposure during audits,
        claims, or vendor incidents.
      </div>

      {/* LOCKED CTA */}
      {locked && (
        <div
          style={{
            marginTop: 16,
            paddingTop: 14,
            fontSize: 13,
            color: "#9ca3af",
          }}
        >
          Automation is currently paused. Complete setup to activate
          reminders, renewals, and compliance enforcement.
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 16,
        background: "rgba(15,23,42,0.9)",
        border: "1px solid rgba(148,163,184,0.3)",
      }}
    >
      <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 600, color: "#e5e7eb" }}>
        {value}
      </div>
    </div>
  );
}
