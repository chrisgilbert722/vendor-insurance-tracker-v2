// --- EliteStatusPill ---
// Place at: /components/elite/EliteStatusPill.js

import React from "react";

export default function EliteStatusPill({ status }) {
  if (!status) return null;

  let bg = "#e5f9e7";
  let color = "#177245";
  let label = "PASS";

  if (status === "warn") {
    bg = "#fff8e1";
    color = "#b68b00";
    label = "WARN";
  } else if (status === "fail") {
    bg = "#ffe5e5";
    color = "#b00020";
    label = "FAIL";
  }

  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        background: bg,
        color,
      }}
    >
      Elite: {label}
    </span>
  );
}
