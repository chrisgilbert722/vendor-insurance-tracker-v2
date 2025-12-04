// pages/admin/org-brain.js
// ORG BRAIN V1 — AI System Designer (Dashboard Cockpit Style)

import { useOrg } from "../../context/OrgContext";
import AiSystemDesignerPanel from "../../components/org/AiSystemDesignerPanel";

export default function OrgBrainPage() {
  const { activeOrgId } = useOrg() || {};

  return (
    <div
      style={{
        minHeight: "100vh",
        position: "relative",
        padding: "32px 40px 40px",
        color: "#e5e7eb",
        background:
          "radial-gradient(circle at top left,#020617 0,#020617 45%,#000 100%)",
      }}
    >
      {/* Aura Glow */}
      <div
        style={{
          position: "absolute",
          top: -260,
          left: "50%",
          transform: "translateX(-50%)",
          width: 1200,
          height: 1200,
          background:
            "radial-gradient(circle, rgba(56,189,248,0.30), transparent 60%)",
          filter: "blur(140px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Shell Container (Neon Glass Core) */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          borderRadius: 32,
          padding: 22,
          background:
            "radial-gradient(circle at top left,rgba(15,23,42,0.98),rgba(15,23,42,0.95))",
          border: "1px solid rgba(148,163,184,0.45)",
          boxShadow: `
            0 0 60px rgba(15,23,42,0.95),
            0 0 80px rgba(15,23,42,0.9),
            inset 0 0 22px rgba(15,23,42,0.9)
          `,
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: 22 }}>
          <div
            style={{
              display: "inline-flex",
              gap: 8,
              padding: "4px 10px",
              borderRadius: 999,
              border: "1px solid rgba(148,163,184,0.4)",
              background:
                "linear-gradient(120deg,rgba(15,23,42,0.94),rgba(15,23,42,0.75))",
              marginBottom: 6,
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
              AI System Designer
            </span>
            <span
              style={{
                fontSize: 10,
                color: "#38bdf8",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Org Brain V1
            </span>
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 26,
              fontWeight: 600,
            }}
          >
            Design your{" "}
            <span
              style={{
                background:
                  "linear-gradient(90deg,#38bdf8,#a855f7,#f97316)",
                WebkitBackgroundClip: "text",
                color: "transparent",
              }}
            >
              entire compliance system
            </span>{" "}
            with AI.
          </h1>

          <p
            style={{
              marginTop: 6,
              fontSize: 13,
              color: "#9ca3af",
              maxWidth: 680,
              lineHeight: 1.5,
            }}
          >
            Tell the Org Brain how your company operates, your industry, your
            insurance philosophy, or your risk appetite. The AI will build or
            optimize all coverage requirements, rule groups, renewal workflows,
            risk scoring logic, escalation sequences, and communication
            templates — automatically.
          </p>

          <div
            style={{
              marginTop: 10,
              padding: "6px 12px",
              borderRadius: 999,
              fontSize: 12,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              border: "1px solid rgba(55,65,81,0.9)",
              background:
                "linear-gradient(90deg,rgba(15,23,42,0.98),rgba(15,23,42,0.9))",
              color: "#9ca3af",
            }}
          >
            <span>🧠</span>
            <span>
              Org ID:{" "}
              <strong style={{ color: "#38bdf8" }}>
                {activeOrgId || "—"}
              </strong>
            </span>
          </div>
        </div>

        {/* AI System Designer Panel */}
        <AiSystemDesignerPanel orgId={activeOrgId} />
      </div>
    </div>
  );
}
