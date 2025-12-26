// components/FixPreviewPanel.js
// =======================================
// FIX PREVIEW PANEL — READ ONLY
// No automation. No billing. No side effects.
// =======================================

import React from "react";

export default function FixPreviewPanel({ open, onClose, vendor }) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        width: 420,
        height: "100vh",
        background:
          "radial-gradient(circle at top, rgba(15,23,42,0.98), rgba(2,6,23,0.98))",
        borderLeft: "1px solid rgba(56,189,248,0.25)",
        boxShadow: "-20px 0 60px rgba(0,0,0,0.6)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          padding: "18px 20px",
          borderBottom: "1px solid rgba(51,65,85,0.8)",
        }}
      >
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "#9ca3af",
            marginBottom: 6,
          }}
        >
          Fix Preview
        </div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: "#e5e7eb",
          }}
        >
          No actions will be taken yet
        </div>
      </div>

      {/* BODY */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 20,
        }}
      >
        {/* SUMMARY */}
        <Section title="What will happen">
          <p style={bodyText}>
            If automation were active, verivo would take the following steps to
            resolve this issue.
          </p>
        </Section>

        {/* VENDOR */}
        <Section title="Vendor notification (preview)">
          <PreviewCard>
            <div style={emailMeta}>
              <strong>To:</strong> {vendor.name}
            </div>
            <div style={emailMeta}>
              <strong>Subject:</strong> Updated Certificate of Insurance Required
            </div>
            <div style={emailBody}>
              Hello {vendor.name},
              <br />
              <br />
              Our records show a compliance issue with your insurance documents.
              Please upload an updated COI using the secure link below.
              <br />
              <br />
              Thank you,
              <br />
              verivo Compliance Team
            </div>
            <div style={emailTiming}>Sent immediately</div>
          </PreviewCard>
        </Section>

        {/* BROKER */}
        {vendor.broker && (
          <Section title="Broker escalation (if needed)">
            <PreviewCard>
              <div style={emailMeta}>
                <strong>Broker:</strong> {vendor.broker.name}
              </div>
              <div style={emailMeta}>
                <strong>Email:</strong> {vendor.broker.email}
              </div>
              <div style={emailTiming}>
                Sent if no response after 7 days
              </div>
            </PreviewCard>
          </Section>
        )}

        {/* OUTCOME */}
        <Section title="Once resolved">
          <ul style={outcomeList}>
            <li>✔ Vendor marked compliant</li>
            <li>✔ Removed from owner audit risk</li>
            <li>✔ Compliance score improves</li>
            <li>✔ Logged in audit trail</li>
          </ul>
        </Section>
      </div>

      {/* FOOTER */}
      <div
        style={{
          padding: 16,
          borderTop: "1px solid rgba(51,65,85,0.8)",
        }}
      >
        <button
          disabled
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: 999,
            background: "rgba(51,65,85,0.8)",
            border: "1px solid rgba(148,163,184,0.4)",
            color: "#9ca3af",
            fontWeight: 600,
            cursor: "not-allowed",
            marginBottom: 10,
          }}
        >
          Activate Automation
        </button>
        <button
          onClick={onClose}
          style={{
            width: "100%",
            background: "transparent",
            border: "none",
            color: "#9ca3af",
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          Close preview
        </button>
      </div>
    </div>
  );
}

/* =========================
   Helper Components
========================= */

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 26 }}>
      <div
        style={{
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: "0.14em",
          color: "#9ca3af",
          marginBottom: 10,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function PreviewCard({ children }) {
  return (
    <div
      style={{
        borderRadius: 14,
        padding: 14,
        border: "1px solid rgba(51,65,85,0.9)",
        background: "rgba(15,23,42,0.95)",
        fontSize: 13,
        color: "#cbd5f5",
      }}
    >
      {children}
    </div>
  );
}

/* =========================
   Styles
========================= */

const bodyText = {
  fontSize: 14,
  color: "#cbd5f5",
  lineHeight: 1.5,
};

const emailMeta = {
  fontSize: 12,
  color: "#9ca3af",
  marginBottom: 6,
};

const emailBody = {
  fontSize: 13,
  color: "#e5e7eb",
  lineHeight: 1.5,
  marginTop: 10,
};

const emailTiming = {
  fontSize: 11,
  color: "#9ca3af",
  marginTop: 12,
};

const outcomeList = {
  paddingLeft: 18,
  margin: 0,
  fontSize: 13,
  color: "#cbd5f5",
  lineHeight: 1.6,
};
