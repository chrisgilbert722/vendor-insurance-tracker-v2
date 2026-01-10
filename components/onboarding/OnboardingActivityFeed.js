// components/onboarding/OnboardingActivityFeed.js
// ============================================================
// SYSTEM PREVIEW FEED (LOCKED)
// - Reflects PREVIEW completeness, not automation execution
// - Stops intentionally at Step 4
// - Disappears after activation (handled elsewhere)
// ============================================================

import { useEffect, useState } from "react";

const PREVIEW_MESSAGES = {
  vendors_created: "Vendor data prepared for analysis.",
  vendors_analyzed: "Vendor risk analysis complete.",
  contracts_extracted: "Contract requirements identified.",
  requirements_assigned: "Insurance requirements previewed.",
  rules_generated: "Automation rules previewed.",
  preview_complete: "Preview complete.",
};

export default function OnboardingActivityFeed() {
  const [message, setMessage] = useState(
    "Upload a file to preview automation."
  );
  const [progress, setProgress] = useState(0);
  const [industries, setIndustries] = useState([]);

  useEffect(() => {
    let mounted = true;

    async function poll() {
      try {
        const res = await fetch("/api/onboarding/status");
        const json = await res.json();
        if (!mounted || !json?.ok) return;

        /**
         * PREVIEW MODE LOGIC
         * ------------------
         * We intentionally cap progress at 100% (preview complete)
         * and never imply automation is running.
         */

        if (json.onboardingComplete || json.previewComplete) {
          setProgress(100);
          setMessage("Preview complete. Activate automation to proceed.");
        } else if (json.progress >= 75) {
          setProgress(100);
          setMessage("Preview complete. Activate automation to proceed.");
        } else if (json.currentStep) {
          setProgress(Math.min(json.progress || 75, 100));
          setMessage(
            PREVIEW_MESSAGES[json.currentStep] ||
              "Previewing automation outputs…"
          );
        } else {
          setProgress(0);
          setMessage("Upload a file to preview automation.");
        }

        if (Array.isArray(json.detectedIndustries)) {
          setIndustries(json.detectedIndustries);
        }
      } catch {
        // Silent fail — preview feed is non-blocking
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
        padding: "20px 22px",
        borderRadius: 22,
        background:
          "linear-gradient(180deg, rgba(2,6,23,0.85), rgba(2,6,23,0.98))",
        border: "1px solid rgba(56,189,248,0.35)",
        boxShadow:
          "0 0 0 1px rgba(255,255,255,0.02), 0 20px 60px rgba(0,0,0,0.6)",
      }}
    >
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
            background: "#38bdf8",
            boxShadow: "0 0 10px rgba(56,189,248,0.6)",
          }}
        />
        <span style={{ fontSize: 13, fontWeight: 700, color: "#e5e7eb" }}>
          System Preview
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
              "linear-gradient(90deg,#38bdf8,#60a5fa,#a855f7)",
            transition: "width 500ms ease",
            boxShadow: "0 0 14px rgba(56,189,248,0.6)",
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
