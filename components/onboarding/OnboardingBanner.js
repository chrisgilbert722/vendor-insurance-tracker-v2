// components/onboarding/OnboardingBanner.js
// Persistent banner with dismiss (X)

import React from "react";

export default function OnboardingBanner({ onStart, onDismiss }) {
  return (
    <div
      style={{
        marginBottom: 16,
        padding: "6px 12px",
        borderRadius: 999,
        border: "1px solid rgba(250,204,21,0.8)",
        background:
          "linear-gradient(90deg,rgba(23,23,23,0.96),rgba(113,63,18,0.85))",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        fontSize: 12,
        position: "relative",
      }}
    >
      {/* LEFT: Message */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: "#fef9c3",
          flex: 1,
        }}
      >
        <span>⚠️</span>
        <span>
          Setup incomplete — finish AI onboarding to unlock the full
          intelligence dashboard.
        </span>
      </div>

      {/* BUTTON: Finish Setup */}
      <button
        onClick={onStart}
        style={{
          padding: "4px 10px",
          borderRadius: 999,
          border: "1px solid rgba(250,250,250,0.9)",
          background:
            "radial-gradient(circle at top left,#facc15,#f97316,#7c2d12)",
          color: "#1f2937",
          fontSize: 11,
          fontWeight: 600,
          cursor: "pointer",
          whiteSpace: "nowrap",
          marginRight: 8,
        }}
      >
        Finish Setup
      </button>

      {/* X BUTTON (dismiss) */}
      <button
        onClick={onDismiss}
        style={{
          background: "transparent",
          border: "none",
          color: "#fef3c7",
          fontSize: 16,
          fontWeight: 700,
          cursor: "pointer",
          padding: "2px 6px",
          lineHeight: 1,
        }}
        title="Dismiss"
      >
        ✖
      </button>
    </div>
  );
}
