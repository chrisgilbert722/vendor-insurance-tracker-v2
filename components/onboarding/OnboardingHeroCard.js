// components/onboarding/OnboardingHeroCard.js
// Cinematic Iron-Man Style Onboarding Hero Card

import React from "react";

export default function OnboardingHeroCard({ onStart }) {
  return (
    <div
      style={{
        borderRadius: 28,
        padding: 18,
        marginBottom: 24,
        border: "1px solid rgba(148,163,184,0.45)",
        background:
          "radial-gradient(circle at top left,rgba(15,23,42,0.98),rgba(15,23,42,0.92))",
        boxShadow:
          "0 0 45px rgba(15,23,42,0.9),0 0 85px rgba(56,189,248,0.28),inset 0 0 25px rgba(0,0,0,0.8)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Hologram strip */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: -40,
          width: 160,
          height: 2,
          background:
            "linear-gradient(90deg,transparent,rgba(56,189,248,0.8),transparent)",
          opacity: 0.7,
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 16,
        }}
      >
        {/* Icon bubble */}
        <div
          style={{
            padding: 10,
            borderRadius: 999,
            background:
              "radial-gradient(circle at 20% 0,#38bdf8,#6366f1,#0f172a)",
            boxShadow: "0 0 38px rgba(56,189,248,0.7)",
          }}
        >
          <span style={{ fontSize: 22 }}>🧠</span>
        </div>

        <div style={{ flex: 1 }}>
          {/* Tag */}
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
              Getting Started
            </span>
            <span
              style={{
                fontSize: 10,
                color: "#38bdf8",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              10-Minute AI Setup
            </span>
          </div>

          {/* Title */}
          <h2
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 600,
            }}
          >
            Let AI configure{" "}
            <span
              style={{
                background:
                  "linear-gradient(90deg,#38bdf8,#a855f7,#f97316)",
                WebkitBackgroundClip: "text",
                color: "transparent",
              }}
            >
              your entire compliance system
            </span>{" "}
            in minutes.
          </h2>

          <p
            style={{
              marginTop: 6,
              fontSize: 13,
              color: "#9ca3af",
              maxWidth: 650,
              lineHeight: 1.6,
            }}
          >
            The AI Onboarding Wizard will scan your vendors, detect your
            industry, build rule groups, create communication templates, and set
            up renewals — automatically. No manual config, no spreadsheets.
          </p>

          {/* Action row */}
          <div
            style={{
              marginTop: 10,
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={onStart}
              style={{
                padding: "8px 16px",
                borderRadius: 999,
                border: "none",
                background:
                  "radial-gradient(circle at top left,#38bdf8,#1d4ed8,#020617)",
                color: "#e0f2fe",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                boxShadow:
                  "0 0 18px rgba(56,189,248,0.35),0 0 32px rgba(30,64,175,0.25)",
              }}
            >
              ✨ Start AI Onboarding Wizard
            </button>

            <span
              style={{
                fontSize: 11,
                color: "#64748b",
              }}
            >
              ~10 minutes • No spreadsheets required
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
