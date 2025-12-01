// components/onboarding/OnboardingProgress.js
export const ONBOARDING_STEPS = [
  { key: "start", label: "Start", href: "/onboarding/start" },
  { key: "company", label: "Company", href: "/onboarding/company" },
  { key: "insurance", label: "Insurance", href: "/onboarding/insurance" },
  { key: "sample-coi", label: "Sample COI", href: "/onboarding/sample-coi" },
  { key: "rules", label: "AI Rules", href: "/onboarding/rules" },
  { key: "team", label: "Team", href: "/onboarding/team" },
  { key: "vendors", label: "Vendors", href: "/onboarding/vendors" },
  { key: "complete", label: "Complete", href: "/onboarding/complete" },
];

export default function OnboardingProgress({ currentKey }) {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: 900,
        margin: "0 auto 32px auto",
        padding: "12px 18px",
        borderRadius: 999,
        background:
          "linear-gradient(120deg, rgba(15,23,42,0.95), rgba(15,23,42,0.98))",
        border: "1px solid rgba(148,163,184,0.5)",
        display: "flex",
        alignItems: "center",
        gap: 10,
        boxShadow:
          "0 18px 40px rgba(15,23,42,0.8), 0 0 40px rgba(56,189,248,0.18)",
      }}
    >
      {ONBOARDING_STEPS.map((step, index) => {
        const isActive = step.key === currentKey;
        const isCompleted =
          ONBOARDING_STEPS.findIndex((s) => s.key === currentKey) > index;

        return (
          <div
            key={step.key}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              gap: 6,
              opacity: isActive || isCompleted ? 1 : 0.5,
            }}
          >
            {/* Dot */}
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: 999,
                border: "1px solid rgba(148,163,184,0.7)",
                background: isCompleted
                  ? "radial-gradient(circle,#22c55e,#16a34a,#064e3b)"
                  : isActive
                  ? "radial-gradient(circle,#38bdf8,#1d4ed8,#0f172a)"
                  : "radial-gradient(circle,#020617,#020617,#020617)",
                boxShadow: isActive
                  ? "0 0 16px rgba(56,189,248,0.8)"
                  : isCompleted
                  ? "0 0 14px rgba(34,197,94,0.8)"
                  : "none",
              }}
            />

            {/* Label */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: isActive || isCompleted ? "#e5e7eb" : "#6b7280",
              }}
            >
              <span>
                {index + 1}. {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
