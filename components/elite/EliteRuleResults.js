// --- EliteRuleResults ---
// Place at: /components/elite/EliteRuleResults.js

import React from "react";

export default function EliteRuleResults({ rules }) {
  if (!rules || !rules.length) return null;

  return (
    <div
      style={{
        marginTop: 10,
        background: "#F7F9FC",
        borderRadius: 10,
        padding: 10,
      }}
    >
      {rules.map((r) => {
        let color = "#177245";
        let icon = "●";

        if (r.result === "warn") {
          color = "#b68b00";
          icon = "●";
        } else if (r.result === "fail") {
          color = "#b00020";
          icon = "●";
        }

        return (
          <div
            key={r.ruleId}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              marginBottom: 4,
            }}
          >
            <span style={{ color }}>{icon}</span>
            <span style={{ fontWeight: 600 }}>{r.ruleName}</span>
            <span style={{ opacity: 0.7 }}>— {r.label}</span>
          </div>
        );
      })}
    </div>
  );
}
