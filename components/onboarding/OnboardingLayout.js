// components/onboarding/OnboardingLayout.js
import { useRouter } from "next/router";
import OnboardingProgress, {
  ONBOARDING_STEPS,
} from "./OnboardingProgress";

export default function OnboardingLayout({
  currentKey,
  title,
  subtitle,
  children,
}) {
  const router = useRouter();

  const currentIndex = ONBOARDING_STEPS.findIndex(
    (step) => step.key === currentKey
  );

  const isStartStep = currentKey === "start";

  const goNext = () => {
    if (currentIndex < ONBOARDING_STEPS.length - 1) {
      router.push(ONBOARDING_STEPS[currentIndex + 1].href);
    }
  };

  const goBack = () => {
    if (currentIndex > 0) {
      router.push(ONBOARDING_STEPS[currentIndex - 1].href);
    }
  };

  const canGoBack = currentIndex > 0;
  const canGoNext = currentIndex < ONBOARDING_STEPS.length - 1;

  return (
    <div
      style={{
        width: "100%",
        minHeight: "calc(100vh - 90px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "26px 18px 40px",
        position: "relative",
        color: "#e5e7eb",
      }}
    >
      {/* Glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: `
            radial-gradient(circle at 20% 0%, rgba(56,189,248,0.22), transparent 55%),
            radial-gradient(circle at 80% 0%, rgba(168,85,247,0.18), transparent 55%),
            radial-gradient(circle at 50% 100%, rgba(34,197,94,0.12), transparent 55%)
          `,
          opacity: 0.75,
          zIndex: 0,
        }}
      />

      <div style={{ position: "relative", zIndex: 1, width: "100%" }}>
        <OnboardingProgress currentKey={currentKey} />

        {/* Header */}
        <div
          style={{
            maxWidth: 900,
            margin: "0 auto 22px auto",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: 30,
              fontWeight: 600,
              background:
                "linear-gradient(90deg,#e5e7eb,#38bdf8,#a855f7,#e5e7eb)",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            {title}
          </h1>

          {subtitle && (
            <p
              style={{
                margin: 0,
                fontSize: 14,
                color: "#9ca3af",
                maxWidth: 620,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>

        {/* Main Card */}
        <div
          style={{
            maxWidth: 900,
            margin: "0 auto",
            padding: 24,
            borderRadius: 22,
            background:
              "radial-gradient(circle at top, rgba(15,23,42,0.98), rgba(15,23,42,0.96))",
            border: "1px solid rgba(148,163,184,0.55)",
            boxShadow:
              "0 26px 60px rgba(15,23,42,0.98), 0 0 50px rgba(56,189,248,0.30)",
          }}
        >
          {children}

          {/* Actions — DISABLED FOR AUTOPILOT START */}
          {!isStartStep && (
            <div
              style={{
                marginTop: 22,
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <button
                type="button"
                onClick={goBack}
                disabled={!canGoBack}
                style={{
                  padding: "9px 16px",
                  borderRadius: 999,
                  border: "1px solid rgba(148,163,184,0.6)",
                  background: "rgba(15,23,42,0.96)",
                  color: canGoBack ? "#e5e7eb" : "#6b7280",
                  fontSize: 13,
                  cursor: canGoBack ? "pointer" : "not-allowed",
                  opacity: canGoBack ? 1 : 0.5,
                }}
              >
                ← Back
              </button>

              {canGoNext && (
                <button
                  type="button"
                  onClick={goNext}
                  style={{
                    padding: "9px 20px",
                    borderRadius: 999,
                    border: "1px solid rgba(56,189,248,0.9)",
                    background:
                      "linear-gradient(90deg,#38bdf8,#1d4ed8,#0f172a)",
                    color: "#e5f2ff",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                    boxShadow:
                      "0 0 22px rgba(56,189,248,0.75), 0 0 40px rgba(56,189,248,0.35)",
                  }}
                >
                  Next →
                </button>
              )}

              {!canGoNext && (
                <div
                  style={{
                    fontSize: 13,
                    color: "#22c55e",
                    marginLeft: "auto",
                  }}
                >
                  All steps complete 🎉
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
