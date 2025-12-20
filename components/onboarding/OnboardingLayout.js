// components/onboarding/OnboardingLayout.js
import OnboardingProgress, {
  ONBOARDING_STEPS,
} from "./OnboardingProgress";

export default function OnboardingLayout({
  currentKey,
  title,
  subtitle,
  children,
}) {
  // We still compute index for display/progress only
  const currentIndex = ONBOARDING_STEPS.findIndex(
    (step) => step.key === currentKey
  );

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
        {/* Progress (display-only, backend-driven) */}
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

          {/* Actions — HARD DISABLED (Observable Autopilot controls progression) */}
          {false && (
            <div
              style={{
                marginTop: 22,
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
