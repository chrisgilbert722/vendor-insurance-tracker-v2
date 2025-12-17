// pages/admin/ai-setup-center.js
// ==========================================================
// AI SETUP CENTER — EXEC V5 (IRON MAN / JARVIS COMMAND CORE)
// Central control deck for all AI intelligence systems
// ==========================================================

import { useEffect, useState } from "react";
import { useOrg } from "../../context/OrgContext";

const GP = {
  bg: "#020617",
  text: "#e5e7eb",
  soft: "#9ca3af",
  muted: "#6b7280",
  border: "rgba(51,65,85,0.7)",
  panel: "rgba(15,23,42,0.94)",
  glowBlue: "rgba(56,189,248,0.45)",
  glowPurple: "rgba(168,85,247,0.35)",
  glowGreen: "rgba(34,197,94,0.35)",
  blue: "#38bdf8",
  green: "#22c55e",
  yellow: "#facc15",
  red: "#fb7185",
  purple: "#a855f7",
};

function StatusDot({ status }) {
  const color =
    status === "ONLINE"
      ? GP.green
      : status === "DEGRADED"
      ? GP.yellow
      : GP.red;

  return (
    <span
      style={{
        width: 8,
        height: 8,
        borderRadius: 999,
        background: color,
        boxShadow: `0 0 14px ${color}`,
        display: "inline-block",
      }}
    />
  );
}

function ModuleCard({ title, status, description, actions = [], glow }) {
  const glowColor =
    glow === "blue"
      ? GP.glowBlue
      : glow === "purple"
      ? GP.glowPurple
      : GP.glowGreen;

  return (
    <div
      style={{
        borderRadius: 26,
        padding: 18,
        border: `1px solid ${GP.border}`,
        background:
          "radial-gradient(circle at 20% 0%, rgba(56,189,248,0.10), transparent 45%), rgba(15,23,42,0.9)",
        boxShadow: `
          0 0 40px ${glowColor},
          inset 0 0 28px rgba(0,0,0,0.55)
        `,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <div
            style={{
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: "0.16em",
              color: GP.soft,
            }}
          >
            {title}
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              color: GP.text,
              lineHeight: 1.5,
            }}
          >
            {description}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 11,
            color: GP.soft,
          }}
        >
          <StatusDot status={status} />
          {status}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {actions.map((a) => (
          <button
            key={a.label}
            onClick={a.onClick}
            style={{
              padding: "8px 14px",
              borderRadius: 999,
              border: `1px solid ${a.color}`,
              background: "transparent",
              color: a.color,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function AiSetupCenterPage() {
  const { activeOrgId: orgId } = useOrg();

  const [systemStatus] = useState({
    rules: "ONLINE",
    documents: "ONLINE",
    conflicts: "ONLINE",
    alerts: "ONLINE",
    renewals: "ONLINE",
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 20% 0%, rgba(56,189,248,0.12), transparent 35%), radial-gradient(circle at 85% 10%, rgba(168,85,247,0.10), transparent 35%), radial-gradient(circle at 50% 120%, rgba(34,197,94,0.06), transparent 45%), #020617",
        padding: "34px 42px 60px",
        color: GP.text,
        overflowX: "hidden",
      }}
    >
      {/* Scanlines */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px)",
          backgroundSize: "100% 3px",
          opacity: 0.18,
          mixBlendMode: "screen",
        }}
      />

      {/* AURA */}
      <div
        style={{
          position: "absolute",
          top: -380,
          left: "50%",
          transform: "translateX(-50%)",
          width: 1400,
          height: 1400,
          background:
            "radial-gradient(circle, rgba(56,189,248,0.24), transparent 60%)",
          filter: "blur(160px)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          borderRadius: 34,
          padding: 26,
          border: "1px solid rgba(148,163,184,0.35)",
          background:
            "radial-gradient(circle at 20% 0%, rgba(15,23,42,0.95), rgba(15,23,42,0.86))",
          boxShadow: `
            0 0 70px rgba(0,0,0,0.8),
            0 0 80px ${GP.glowBlue},
            0 0 60px ${GP.glowPurple},
            inset 0 0 24px rgba(0,0,0,0.65)
          `,
        }}
      >
        {/* HEADER */}
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              display: "inline-flex",
              gap: 10,
              alignItems: "center",
              padding: "6px 12px",
              borderRadius: 999,
              border: "1px solid rgba(148,163,184,0.35)",
              background:
                "linear-gradient(120deg, rgba(2,6,23,0.8), rgba(15,23,42,0.7))",
              boxShadow: "0 0 18px rgba(56,189,248,0.18)",
              marginBottom: 10,
            }}
          >
            <span
              style={{
                fontSize: 10,
                letterSpacing: "0.18em",
                color: GP.soft,
                textTransform: "uppercase",
              }}
            >
              EXEC AI • SYSTEM CORE
            </span>
            <span
              style={{
                fontSize: 10,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: GP.green,
              }}
            >
              ONLINE
            </span>
            <StatusDot status="ONLINE" />
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: 0.2,
            }}
          >
            AI Setup{" "}
            <span
              style={{
                background:
                  "linear-gradient(90deg,#38bdf8,#a855f7,#22c55e,#fbbf24)",
                WebkitBackgroundClip: "text",
                color: "transparent",
              }}
            >
              Command Center
            </span>
          </h1>

          <div
            style={{
              marginTop: 8,
              fontSize: 13,
              color: GP.soft,
              maxWidth: 760,
              lineHeight: 1.6,
            }}
          >
            This is the control core for your organization’s AI brain — rules,
            documents, alerts, conflicts, and renewal prediction engines
            operate and coordinate from here.
          </div>

          <div style={{ marginTop: 10, fontSize: 12, color: GP.soft }}>
            Org: <strong style={{ color: GP.text }}>{orgId || "—"}</strong>
          </div>
        </div>

        {/* MODULE GRID */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 18,
          }}
        >
          <ModuleCard
            title="Rules Intelligence"
            status={systemStatus.rules}
            glow="blue"
            description="Define, explain, and enforce coverage requirements with AI-powered logic."
            actions={[
              { label: "Open Rules Engine", color: GP.blue, onClick: () => (window.location.href = "/admin/requirements-v5") },
            ]}
          />

          <ModuleCard
            title="Document Intelligence"
            status={systemStatus.documents}
            glow="green"
            description="Extract, normalize, and audit insurance documents and endorsements."
            actions={[
              { label: "Open Documents", color: GP.green, onClick: () => (window.location.href = "/admin/documents") },
            ]}
          />

          <ModuleCard
            title="Conflict Intelligence"
            status={systemStatus.conflicts}
            glow="purple"
            description="Detect contradictory rules, impossible ranges, and policy logic conflicts."
            actions={[
              { label: "Run Conflict Scan", color: GP.purple, onClick: () => (window.location.href = "/admin/requirements-v5") },
            ]}
          />

          <ModuleCard
            title="Alert Intelligence"
            status={systemStatus.alerts}
            glow="blue"
            description="Real-time compliance incidents, SLA tracking, and automated escalation."
            actions={[
              { label: "Open Incident Command", color: GP.blue, onClick: () => (window.location.href = "/admin/alerts") },
            ]}
          />

          <ModuleCard
            title="Renewal Intelligence"
            status={systemStatus.renewals}
            glow="green"
            description="Predict renewal risk, late behavior, and failure likelihood before it happens."
            actions={[
              { label: "Open Renewal Command", color: GP.green, onClick: () => (window.location.href = "/admin/renewals") },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
