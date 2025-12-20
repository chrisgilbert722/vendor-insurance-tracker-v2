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

  useEffect(() => {
    let mounted = true;

    async function poll() {
      try {
        const res = await fetch("/api/onboarding/status");
        const json = await res.json();
        if (!mounted || !json?.ok) return;

        const stepKey = json.currentStep;
        setMessage(
          STEP_MESSAGES[stepKey] ||
          (json.onboardingComplete ? "Onboarding complete" : "Standing by…")
        );
        setProgress(json.progress || 0);
      } catch {}
    }

    poll();
    const t = setInterval(poll, 1500);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, []);

  return (
    <div
      style={{
        marginTop: 28,
        padding: "18px 20px",
        borderRadius: 20,
        background:
          "linear-gradient(180deg, rgba(2,6,23,0.85), rgba(2,6,23,0.98))",
        border: "1px solid rgba(34,197,94,0.35)",
        boxShadow:
          "0 0 0 1px rgba(255,255,255,0.02), 0 20px 60px rgba(0,0,0,0.6)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 10,
        }}
      >
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: "#22c55e",
            boxShadow: "0 0 12px rgba(34,197,94,0.9)",
          }}
        />
        <span style={{ fontSize: 13, fontWeight: 600, color: "#e5e7eb" }}>
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
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: "100%",
            background:
              "linear-gradient(90deg,#22c55e,#38bdf8,#a855f7)",
            transition: "width 500ms ease",
            boxShadow: "0 0 16px rgba(56,189,248,0.7)",
          }}
        />
      </div>
    </div>
  );
}
