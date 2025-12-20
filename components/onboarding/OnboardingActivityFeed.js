// components/onboarding/OnboardingActivityFeed.js
import { useEffect, useState } from "react";

const STEP_MESSAGES = {
  vendors_created: "Preparing vendor records",
  vendors_analyzed: "Analyzing vendor risk profiles",
  contracts_extracted: "Extracting contract requirements",
  requirements_assigned: "Assigning insurance requirements",
  rules_generated: "Generating compliance rules with AI",
  rules_applied: "Applying rules to your system",
  launch_system: "Launching compliance engine",
  complete: "Onboarding complete",
};

export default function OnboardingActivityFeed() {
  const [message, setMessage] = useState("Waiting for input…");
  const [progress, setProgress] = useState(0);
  const [industries, setIndustries] = useState([]);
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    let mounted = true;

    async function poll() {
      try {
        const res = await fetch("/api/onboarding/status");
        const json = await res.json();
        if (!mounted || !json?.ok) return;

        setStatus(json.status || "idle");
        setProgress(json.progress || 0);

        const stepKey = json.currentStep;
        setMessage(
          STEP_MESSAGES[stepKey] ||
          (json.onboardingComplete ? "Onboarding complete" : "Standing by…")
        );

        // 🔥 Show detected industries once rules are generated
        if (json.detectedIndustries && Array.isArray(json.detectedIndustries)) {
          setIndustries(json.detectedIndustries);
        }
      } catch {}
    }

    poll();
    const t = setInterval(poll, 1500);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, []);

  const isActive = status === "running";

  return (
    <div
      style={{
        marginTop: 32,
        padding: "20px 22px",
        borderRadius: 22,
        background:
          "linear-gradient(180deg, rgba(2,6,23,0.85), rgba(2,6,23,0.98))",
        border: "1px solid rgba(34,197,94,0.35)",
        boxShadow: isActive
          ? "0 0 0 1px rgba(34,197,94,0.3), 0 0 40px rgba(34,197,94,0.45)"
          : "0 0 0 1px rgba(255,255,255,0.02), 0 20px 60px rgba(0,0,0,0.6)",
        animation: isActive ? "pulse 3s ease-in-out infinite" : "none",
      }}
    >
      <style>
        {`
          @keyframes pulse {
            0% { box-shadow: 0 0 0 1px rgba(34,197,94,0.3), 0 0 30px rgba(34,197,94,0.3); }
            50% { box-shadow: 0 0 0 1px rgba(34,197,94,0.6), 0 0 60px rgba(34,197,94,0.7); }
            100% { box-shadow: 0 0 0 1px rgba(34,197,94,0.3), 0 0 30px rgba(34,197,94,0.3); }
          }
        `}
      </style>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: isActive ? "#22c55e" : "#64748b",
            boxShadow: isActive ? "0 0 12px rgba(34,197,94,0.9)" : "none",
          }}
        />
        <span style={{ fontSize: 13, fontWeight: 700, color: "#e5e7eb" }}>
          AI System Activity
        </span>
      </div>

      <div style={{ fontSize: 14, color: "#9ca3af", marginBottom: 12 }}>
        {message}
      </div>

      <div
        style={{
          height: 6,
          borderRadius: 999,
          background: "rgba(15,23,42,0.9)",
          overflow: "hidden",
          marginBottom: industries.length ? 16 : 0,
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: "100%",
            background:
              "linear-gradient(90deg,#22c55e,#38bdf8,#a855f7)",
            transition: "width 500ms ease",
            boxShadow: "0 0 18px rgba(56,189,248,0.7)",
          }}
        />
      </div>

      {industries.length > 0 && (
        <div>
          <div
            style={{
              fontSize: 12,
              color: "#9ca3af",
              marginBottom: 8,
            }}
          >
            Detected Industries
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {industries.map((i) => (
              <span
                key={i}
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  background: "rgba(56,189,248,0.15)",
                  border: "1px solid rgba(56,189,248,0.35)",
                  color: "#7dd3fc",
                  fontSize: 12,
                }}
              >
                {i}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
