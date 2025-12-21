// components/dashboard/FixPreview.js
// ============================================================
// Automation Fix Preview (LOCKED)
// - Cockpit-aligned
// - Read-only preview of automation power
// - Designed to sell activation without forcing checkout
// ============================================================

export default function FixPreview({ locked = true }) {
  return (
    <div
      style={{
        marginTop: 26,
        padding: 22,
        borderRadius: 22,
        background:
          "radial-gradient(circle at top, rgba(15,23,42,0.96), rgba(2,6,23,0.98))",
        border: "1px solid rgba(148,163,184,0.35)",
        boxShadow:
          "0 0 42px rgba(56,189,248,0.18), inset 0 0 24px rgba(15,23,42,0.85)",
      }}
    >
      {/* HEADER */}
      <div style={{ marginBottom: 18 }}>
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#60a5fa",
            marginBottom: 6,
          }}
        >
          Automation Preview
        </div>

        <h3
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 600,
            color: "#e5e7eb",
          }}
        >
          Compliance Actions Ready to Run
        </h3>

        <p style={{ marginTop: 6, fontSize: 13, color: "#9ca3af" }}>
          These actions are preconfigured and will activate automatically once
          automation is enabled.
        </p>
      </div>

      {/* PREVIEW ROWS */}
      <div style={{ display: "grid", gap: 14 }}>
        <PreviewRow
          title="Vendor Reminder Emails"
          description="Automatically notify vendors with expiring or missing COIs."
          meta="Scheduled intelligently based on expiration risk"
        />

        <PreviewRow
          title="Broker Requests"
          description="Request updated certificates directly from assigned brokers."
          meta="Triggered when coverage gaps are detected"
        />

        <PreviewRow
          title="Renewal Escalation Schedule"
          description="30 → 15 → 5 day escalation cadence before expiration."
          meta="Runs continuously in the background"
        />
      </div>

      {/* FOOTER STATUS */}
      <div
        style={{
          marginTop: 18,
          paddingTop: 14,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: "1px solid rgba(148,163,184,0.15)",
          fontSize: 13,
        }}
      >
        <div style={{ color: "#9ca3af" }}>
          Automation status:{" "}
          <span style={{ color: "#facc15", fontWeight: 500 }}>
            Paused
          </span>
        </div>

        <button
          type="button"
          disabled={locked}
          style={{
            padding: "8px 18px",
            borderRadius: 999,
            border: "1px solid rgba(56,189,248,0.6)",
            background: "rgba(15,23,42,0.85)",
            color: "#9ca3af",
            fontSize: 13,
            cursor: "not-allowed",
            boxShadow: "0 0 18px rgba(56,189,248,0.25)",
          }}
        >
          Activate Automation
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------
   PREVIEW ROW (LOCKED)
------------------------------------------------------------ */

function PreviewRow({ title, description, meta }) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 16,
        background: "rgba(15,23,42,0.9)",
        border: "1px solid rgba(148,163,184,0.25)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: "#e5e7eb",
            marginBottom: 4,
          }}
        >
          {title}
        </div>

        <div style={{ fontSize: 13, color: "#9ca3af" }}>
          {description}
        </div>

        <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
          {meta}
        </div>
      </div>

      <div
        style={{
          padding: "6px 10px",
          borderRadius: 999,
          fontSize: 12,
          color: "#93c5fd",
          border: "1px solid rgba(59,130,246,0.5)",
          background: "rgba(59,130,246,0.12)",
          whiteSpace: "nowrap",
        }}
      >
        Locked
      </div>
    </div>
  );
}
