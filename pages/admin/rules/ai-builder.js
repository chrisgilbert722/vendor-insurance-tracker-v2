// pages/admin/rules/ai-builder.js
// AI Rule Lab — Rule Builder V6

import { useOrg } from "../../../context/OrgContext";
import AiRuleBuilderPanel from "../../../components/rules/AiRuleBuilderPanel";

export default function AiRuleBuilderPage() {
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
      {/* Aura */}
      <div
        style={{
          position: "absolute",
          top: -260,
          left: "50%",
          transform: "translateX(-50%)",
          width: 1100,
          height: 1100,
          background:
            "radial-gradient(circle, rgba(56,189,248,0.35), transparent 60%)",
          filter: "blur(120px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Shell */}
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
        <div style={{ marginBottom: 18 }}>
          <div
            style={{
              display: "inline-flex",
              gap: 8,
              padding: "4px 10px",
              borderRadius: 999,
              border: "1px solid rgba(148,163,184,0.4)",
              background:
                "linear-gradient(120deg,rgba(15,23,42,0.94),rgba(15,23,42,0.7))",
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
              AI Rule Builder
            </span>
            <span
              style={{
                fontSize: 10,
                color: "#38bdf8",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Rule Engine V6 Lab
            </span>
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 600,
            }}
          >
            Build{" "}
            <span
              style={{
                background:
                  "linear-gradient(90deg,#38bdf8,#a855f7,#f97316)",
                WebkitBackgroundClip: "text",
                color: "transparent",
              }}
            >
              complex insurance rules
            </span>{" "}
            with one prompt.
          </h1>

          <p
            style={{
              marginTop: 6,
              fontSize: 13,
              color: "#9ca3af",
              maxWidth: 640,
            }}
          >
            Describe your GL, Auto, WC, Umbrella, and endorsement requirements in
            natural language. The AI will generate full rule groups and rule
            definitions and save them automatically for this organization.
          </p>
        </div>

        {/* AI Rule Builder Panel */}
        <AiRuleBuilderPanel orgId={activeOrgId} />
      </div>
    </div>
  );
}
