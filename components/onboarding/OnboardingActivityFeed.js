// components/onboarding/OnboardingActivityFeed.js
// ============================================================
// SYSTEM PREVIEW FEED (LOCKED — CONVERSION MODE)
// - Shows readiness, not execution
// - Turns GREEN + pulses faster at Step 4
// - Progress caps at ~90%
// ============================================================

import { useEffect, useState } from "react";

const PREVIEW_MESSAGES = {
  vendors_created: "Vendor data prepared.",
  vendors_analyzed: "Vendor risk analysis complete.",
  contracts_extracted: "Contract requirements identified.",
  requirements_assigned: "Insurance requirements previewed.",
  rules_generated: "Automation rules previewed.",
  preview_complete: "System ready for automation.",
};

export default function OnboardingActivityFeed() {
  const [message, setMessage] = useState(
    "Upload a file to preview automation."
  );
  const [progress, setProgress] = useState(0);
  const [industries, setIndustries] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function poll() {
      try {
        const res = await fetch("/api/onboarding/status");
        const json = await res.json();
        if (!mounted || !json?.ok) return;

        /**
         * PREVIEW / READINESS LOGIC
         * -------------------------
         * We stop at readiness.
         * No automation implied.
         */

        const isComplete =
          json.previewComplete ||
          json.onboardingComplete ||
          json.progress >= 75;

        if (isComplete) {
          setReady(true);
          setProgress(90);
          setMessage("System ready for automation.");
        } else if (json.currentStep) {
          setReady(false);
          setProgress(Math.min(json.progress || 50, 75));
          setMessage(
            PREVIEW_MESSAGES[json.currentStep] ||
              "Preparing automation preview…"
          );
        } else {
          setReady(false);
          setProgress(0);
          setMessage("Upload a file to preview automation.");
        }

        if (Array.isArray(json.detectedIndustries)) {
          setIndustries(json.detectedIndustries);
        }
      } catch {
        // Silent fail — feed is non-blocking
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
        marginTop: 32,
        padding: "22px 24px",
        borderRadius: 22,
        background:
          "linear-gradient(180deg, rgba(2,6,23,0.85), rgba(2,6,23,0.98))",
        border: "1px solid rgba(56,189,248,0.35)",
        boxShadow:
          ready
            ? "0 0 0 1px rgba(34,197,94,0.4), 0 0 45px rgba(34,197,94,0.45)"
            : "0 0 0 1px rgba(255,255,255,0.02), 0 20px 60px rgba(0,0,0,0.6)",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: ready ? "#22c55e" : "#38bdf8",
            boxShadow: ready
              ? "0 0 14px rgba(34,197,94,0.9)"
              : "0 0 10px rgba(56,189,248,0.6)",
            animation: ready
              ? "pulseFast 1s ease-in-out infinite"
              : "pulseSlow 3s ease-in-out infinite",
          }}
        />
        <span style={{ fontSize: 13, fontWeight: 700, color: "#e5e7eb" }}>
          {ready ? "System Ready" : "System Preview"}
        </span>
      </div>

      {/* MESSAGE */}
      <div style={{ fontSize: 14, color: "#9ca3af", marginBottom: 14 }}>
        {message}
      </div>

      {/* PROGRESS BAR */}
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
            background: ready
              ? "linear-gradient(90deg,#22c55e,#4ade80)"
              : "linear-gradient(90deg,#38bdf8,#60a5fa,#a855f7)",
            transition: "width 600ms ease",
            boxShadow: ready
              ? "0 0 18px rgba(34,197,94,0.7)"
              : "0 0 14px rgba(56,189,248,0.6)",
          }}
        />
      </div>

      {/* INDUSTRIES */}
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

      {/* ANIMATIONS */}
      <style>{`
        @keyframes pulseSlow {
          0% { opacity: 0.5; }
          50% { opacity: 1; }
          100% { opacity: 0.5; }
        }
        @keyframes pulseFast {
          0% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.35); opacity: 1; }
          100% { transform: scale(1); opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
