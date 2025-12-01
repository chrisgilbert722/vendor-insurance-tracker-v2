// pages/onboarding/insurance.js
import { useState } from "react";
import OnboardingLayout from "../../components/onboarding/OnboardingLayout";

const COVERAGES = [
  "General Liability",
  "Auto Liability",
  "Workers' Compensation",
  "Umbrella / Excess Liability",
  "Professional / E&O",
  "Pollution / Environmental",
  "Cyber Liability",
];

export default function OnboardingInsurance() {
  const [selected, setSelected] = useState(["General Liability", "Workers' Compensation"]);

  function toggleCoverage(name) {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]
    );
  }

  return (
    <OnboardingLayout
      currentKey="insurance"
      title="Required Insurance Coverages"
      subtitle="Pick the coverage lines you typically require from vendors. You can refine limits and endorsements later."
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1.5fr) minmax(0,1.2fr)",
          gap: 20,
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {COVERAGES.map((c) => {
            const active = selected.includes(c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggleCoverage(c)}
                style={{
                  borderRadius: 999,
                  padding: "7px 14px",
                  border: active
                    ? "1px solid rgba(56,189,248,0.9)"
                    : "1px solid rgba(75,85,99,0.9)",
                  background: active
                    ? "radial-gradient(circle at top,#0f172a,#1e3a8a)"
                    : "rgba(15,23,42,0.96)",
                  color: active ? "#e5f2ff" : "#e5e7eb",
                  fontSize: 13,
                  cursor: "pointer",
                  boxShadow: active
                    ? "0 0 18px rgba(56,189,248,0.75)"
                    : "none",
                }}
              >
                {c}
              </button>
            );
          })}
        </div>

        <div
          style={{
            borderRadius: 18,
            padding: 16,
            border: "1px solid rgba(148,163,184,0.55)",
            background:
              "radial-gradient(circle at top,rgba(15,23,42,0.98),rgba(15,23,42,0.96))",
            fontSize: 13,
            color: "#9ca3af",
          }}
        >
          <h3
            style={{
              marginTop: 0,
              marginBottom: 8,
              fontSize: 15,
              color: "#e5e7eb",
            }}
          >
            You can change this later
          </h3>
          <p style={{ marginTop: 0 }}>
            These selections prime your AI rules engine and your default templates.
            You’ll still be able to adjust coverages and limits on a per-vendor basis.
          </p>
        </div>
      </div>
    </OnboardingLayout>
  );
}
