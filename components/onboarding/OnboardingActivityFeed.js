// components/onboarding/OnboardingActivityFeed.js
import { useEffect, useState } from "react";

const STEP_MESSAGES = {
  starting: "Initializing onboarding…",
  vendors_created: "Creating vendors…",
  vendors_analyzed: "Analyzing vendor risk…",
  contracts_extracted: "Extracting contract requirements…",
  requirements_assigned: "Assigning insurance requirements…",
  rules_generated: "Generating compliance rules with AI…",
  rules_applied: "Applying rules to the engine…",
  launch_system: "Launching compliance system…",
  complete: "Onboarding complete 🎉",
};

export default function OnboardingActivityFeed() {
  const [message, setMessage] = useState("Preparing onboarding…");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function poll() {
      try {
        const res = await fetch("/api/onboarding/status");
        const json = await res.json();

        if (!mounted || !json?.ok) return;

        const stepKey = json.currentStep;
        const text =
          STEP_MESSAGES[stepKey] ||
          (json.onboardingComplete
            ? "Onboarding complete 🎉"
            : "Working…");

        setMessage(text);
        setProgress(typeof json.progress === "number" ? json.progress : 0);
      } catch {
        // silent
      }
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
        marginTop: 16,
        padding: "14px 16px",
        borderRadius: 14,
        background: "rgba(2,6,23,0.6)",
        border: "1px solid rgba(56,189,248,0.4)",
        boxShadow: "0 0 22px rgba(56,189,248,0.25)",
      }}
    >
      <div
        style={{
          fontSize: 13,
          color: "#e5e7eb",
          fontWeight: 500,
          marginBottom: 8,
        }}
      >
        🤖 AI Activity
      </div>

      <div
        style={{
          fontSize: 13,
          color: "#9ca3af",
          marginBottom: 8,
        }}
      >
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
            width: `${Math.min(100, Math.max(0, progress))}%`,
            height: "100%",
            background:
              "linear-gradient(90deg,#22c55e,#38bdf8,#a855f7)",
            transition: "width 400ms ease",
          }}
        />
      </div>
    </div>
  );
}
