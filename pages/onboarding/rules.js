// pages/onboarding/rules.js
import { useState } from "react";
import OnboardingLayout from "../../components/onboarding/OnboardingLayout";

export default function OnboardingRules() {
  const [strictness, setStrictness] = useState("balanced");

  return (
    <OnboardingLayout
      currentKey="rules"
      title="AI Rules Engine Defaults"
      subtitle="Set the default posture for your AI-powered compliance rules. You can always refine individual rules later."
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1.6fr) minmax(0,1.1fr)",
          gap: 20,
        }}
      >
        <div>
          <label style={labelStyle}>Default Rule Strictness</label>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {[
              { key: "lenient", label: "Lenient" },
              { key: "balanced", label: "Balanced" },
              { key: "strict", label: "Strict" },
            ].map((opt) => {
              const active = strictness === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setStrictness(opt.key)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 999,
                    border: active
                      ? "1px solid rgba(56,189,248,0.9)"
                      : "1px solid rgba(75,85,99,0.9)",
                    background: active
                      ? "radial-gradient(circle at top,#0f172a,#1d4ed8)"
                      : "rgba(15,23,42,0.96)",
                    color: active ? "#e5f2ff" : "#e5e7eb",
                    fontSize: 13,
                    cursor: "pointer",
                    boxShadow: active
                      ? "0 0 18px rgba(56,189,248,0.75)"
                      : "none",
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <label style={labelStyle}>Default COI Expiration Warning Window</label>
          <input
            style={inputStyle}
            placeholder="e.g. 30 days before expiration"
          />

          <label style={labelStyle}>Default Severity for Missing Coverage</label>
          <select style={inputStyle}>
            <option>High (block work)</option>
            <option>Medium (require manual review)</option>
            <option>Low (allow but flag)</option>
          </select>
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
            How this is used
          </h3>
          <p style={{ marginTop: 0 }}>
            These defaults are applied when vendors are onboarded and when COIs are
            renewed. Your team can override rules per-vendor or per-project without
            changing the global posture.
          </p>
        </div>
      </div>
    </OnboardingLayout>
  );
}

const labelStyle = {
  display: "block",
  fontSize: 11,
  color: "#9ca3af",
  marginBottom: 4,
  marginTop: 12,
};

const inputStyle = {
  width: "100%",
  borderRadius: 999,
  padding: "8px 12px",
  border: "1px solid rgba(51,65,85,0.9)",
  background: "rgba(15,23,42,0.96)",
  color: "#e5e7eb",
  fontSize: 13,
  outline: "none",
};
