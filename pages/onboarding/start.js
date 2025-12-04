// pages/onboarding/start.js
import OnboardingLayout from "../../components/onboarding/OnboardingLayout";

export default function OnboardingStart() {
  return (
    <OnboardingLayout
      currentKey="start"
      title="Welcome to Elite Compliance Onboarding"
      subtitle="We’ll configure your organization, coverage rules, and vendor workflow so your team can hit the ground running."
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,2fr) minmax(0,1.2fr)",
          gap: 18,
          alignItems: "flex-start",
        }}
      >
        <div>
          <h2
            style={{
              marginTop: 0,
              marginBottom: 10,
              fontSize: 18,
              color: "#e5e7eb",
            }}
          >
            What we’ll do in this wizard:
          </h2>
          <ul
            style={{
              margin: 0,
              paddingLeft: 18,
              fontSize: 14,
              color: "#cbd5f5",
              lineHeight: 1.6,
            }}
          >
            <li>Capture your company profile and core settings.</li>
            <li>Select your required insurance coverages and limits.</li>
            <li>Upload a sample COI for AI analysis and rule calibration.</li>
            <li>Wire in your AI rules engine defaults.</li>
            <li>Invite your internal team and your first vendor.</li>
          </ul>
        </div>

        <div
          style={{
            borderRadius: 18,
            padding: 14,
            border: "1px solid rgba(56,189,248,0.5)",
            background:
              "radial-gradient(circle at top,rgba(15,23,42,0.98),rgba(15,23,42,0.96))",
            boxShadow:
              "0 0 26px rgba(56,189,248,0.4),0 0 50px rgba(15,23,42,1)",
          }}
        >
          <div
            style={{
              fontSize: 13,
              color: "#a5b4fc",
              marginBottom: 6,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
            }}
          >
            Estimated time
          </div>
          <div style={{ fontSize: 22, marginBottom: 12 }}>≈ 5–8 minutes</div>
          <div style={{ fontSize: 13, color: "#9ca3af" }}>
            You can safely stop at any point. Your progress is saved as you go.
          </div>
        </div>
      </div>
    </OnboardingLayout>
  );
}
