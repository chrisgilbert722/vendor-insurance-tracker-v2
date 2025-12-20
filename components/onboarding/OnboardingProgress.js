// components/onboarding/OnboardingProgress.js
import { useEffect, useState } from "react";

export const ONBOARDING_STEPS = [
  { key: "start", label: "Start" },
  { key: "vendors-created", label: "Vendors" },
  { key: "vendors-map", label: "Map Columns" },
  { key: "vendors-analyze", label: "Analyze" },
  { key: "rules-generated", label: "Rules" },
  { key: "launch", label: "Launch" },
];

export default function OnboardingProgress({ currentKey }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function poll() {
      try {
        const res = await fetch("/api/onboarding/status");
        const json = await res.json();

        if (mounted && json?.ok && typeof json.progress === "number") {
          setProgress(json.progress);
        }
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
        maxWidth: 900,
        margin: "0 auto 16px auto",
      }}
    >
      <div
        style={{
          height: 6,
          borderRadius: 999,
          background: "rgba(2,6,23,0.9)",
          overflow: "hidden",
          border: "1px solid rgba(148,163,184,0.25)",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${Math.min(100, Math.max(0, progress))}%`,
            background:
              "linear-gradient(90deg,#22c55e,#38bdf8,#a855f7)",
            transition: "width 400ms ease",
            boxShadow:
              "0 0 18px rgba(56,189,248,0.6)",
          }}
        />
      </div>

      <div
        style={{
          marginTop: 6,
          fontSize: 12,
          color: "#9ca3af",
          textAlign: "right",
        }}
      >
        {progress}% complete
      </div>
    </div>
  );
}
