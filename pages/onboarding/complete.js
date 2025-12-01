// pages/onboarding/complete.js
import OnboardingLayout from "../../components/onboarding/OnboardingLayout";

export default function OnboardingComplete() {
  return (
    <OnboardingLayout
      currentKey="complete"
      title="Onboarding Complete"
      subtitle="Your environment is configured. You can start uploading COIs, inviting vendors, and tightening your compliance rules."
    >
      <div
        style={{
          textAlign: "center",
          padding: "30px 10px",
        }}
      >
        <div style={{ fontSize: 46, marginBottom: 10 }}>🎉</div>
        <h2
          style={{
            marginTop: 0,
            marginBottom: 10,
            fontSize: 22,
            color: "#e5e7eb",
          }}
        >
          You’re ready to go.
        </h2>
        <p
          style={{
            marginTop: 0,
            marginBottom: 16,
            fontSize: 14,
            color: "#9ca3af",
          }}
        >
          Your base rules, coverages, and workflows are in place. You can refine
          everything from the dashboard at any time.
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
          <a
            href="/dashboard"
            style={{
              padding: "9px 18px",
              borderRadius: 999,
              border: "1px solid rgba(56,189,248,0.9)",
              background:
                "linear-gradient(90deg,#38bdf8,#1d4ed8,#0f172a)",
              color: "#e5f2ff",
              fontSize: 13,
              fontWeight: 500,
              textDecoration: "none",
              boxShadow:
                "0 0 22px rgba(56,189,248,0.75),0 0 40px rgba(56,189,248,0.4)",
            }}
          >
            Go to Dashboard →
          </a>
          <a
            href="/vendors"
            style={{
              padding: "9px 18px",
              borderRadius: 999,
              border: "1px solid rgba(148,163,184,0.7)",
              background: "rgba(15,23,42,0.96)",
              color: "#e5e7eb",
              fontSize: 13,
              textDecoration: "none",
            }}
          >
            Open Vendors →
          </a>
        </div>
      </div>
    </OnboardingLayout>
  );
}
