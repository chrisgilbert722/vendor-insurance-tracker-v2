// pages/onboarding/complete.js
import { useEffect } from "react";
import OnboardingLayout from "../../components/onboarding/OnboardingLayout";

export default function OnboardingComplete() {
  // Dispatch event to trigger dashboard refetch when user navigates there
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("onboarding:complete"));
      window.dispatchEvent(new CustomEvent("policies:changed"));
      try {
        localStorage.setItem("policies:changed", String(Date.now()));
      } catch {}
    }
  }, []);

  return (
    <OnboardingLayout
      currentKey="complete"
      title="Onboarding Complete"
      subtitle="Your compliance environment is fully configured. You can now manage vendors, upload COIs, create rules, and monitor compliance in real time."
    >
      <div
        style={{
          textAlign: "center",
          padding: "40px 10px",
        }}
      >
        <div style={{ fontSize: 52, marginBottom: 14 }}>🎉</div>

        <h2
          style={{
            margin: 0,
            marginBottom: 10,
            fontSize: 26,
            color: "#e5e7eb",
            background:
              "linear-gradient(90deg,#38bdf8,#a855f7,#e5e7eb)",
            WebkitBackgroundClip: "text",
            color: "transparent",
          }}
        >
          You're Ready to Go!
        </h2>

        <p
          style={{
            marginTop: 0,
            marginBottom: 28,
            fontSize: 15,
            color: "#9ca3af",
            maxWidth: 560,
            marginLeft: "auto",
            marginRight: "auto",
            lineHeight: 1.6,
          }}
        >
          Your base rules, coverages, team settings, and first vendor have been
          configured. You're now fully equipped to begin monitoring vendor 
          compliance, tracking renewals, and managing your insurance lifecycle 
          in a single intelligent dashboard.
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 14,
          }}
        >
          <a
            href="/dashboard"
            style={{
              padding: "10px 22px",
              borderRadius: 999,
              border: "1px solid rgba(56,189,248,0.9)",
              background:
                "linear-gradient(90deg,#38bdf8,#1d4ed8,#0f172a)",
              color: "#e5f2ff",
              fontSize: 15,
              fontWeight: 600,
              textDecoration: "none",
              boxShadow:
                "0 0 22px rgba(56,189,248,0.75),0 0 40px rgba(56,189,248,0.40)",
            }}
          >
            Go to Dashboard →
          </a>

          <a
            href="/vendors"
            style={{
              padding: "10px 22px",
              borderRadius: 999,
              border: "1px solid rgba(148,163,184,0.7)",
              background: "rgba(15,23,42,0.96)",
              color: "#e5e7eb",
              fontSize: 15,
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            Open Vendors →
          </a>
        </div>

        <div
          style={{
            marginTop: 28,
            fontSize: 13,
            color: "#a5b4fc",
          }}
        >
          Need more setup help? Visit
          <span style={{ color: "#38bdf8" }}> Settings → Organization</span>
          for advanced configuration.
        </div>
      </div>
    </OnboardingLayout>
  );
}
