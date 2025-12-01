// pages/onboarding/index.js — Onboarding Entry Screen (Neon Wizard Start)

export default function OnboardingHome() {
  return (
    <div
      style={{
        width: "100%",
        minHeight: "calc(100vh - 90px)", // inside layout (minus header)
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        color: "#e5e7eb",
        position: "relative",
        padding: "40px 20px",
      }}
    >
      {/* HOLOGRAPHIC AURA */}
      <div
        style={{
          position: "absolute",
          top: "10%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "80%",
          height: 300,
          background:
            "radial-gradient(circle, rgba(56,189,248,0.18), transparent 70%)",
          filter: "blur(80px)",
          zIndex: -1,
        }}
      />

      {/* TITLE */}
      <h1
        style={{
          fontSize: 48,
          margin: 0,
          marginBottom: 10,
          textAlign: "center",
          fontWeight: 700,
          background: "linear-gradient(90deg, #38bdf8, #a78bfa, #f0f9ff)",
          WebkitBackgroundClip: "text",
          color: "transparent",
          textShadow: "0 0 18px rgba(56,189,248,0.55)",
        }}
      >
        Onboarding Wizard
      </h1>

      {/* SUBTEXT */}
      <p
        style={{
          fontSize: 18,
          color: "#94a3b8",
          marginTop: 0,
          marginBottom: 34,
          textAlign: "center",
          maxWidth: 600,
          lineHeight: 1.6,
        }}
      >
        Let’s walk through your setup. This will only take a few minutes.
      </p>

      {/* BUTTON */}
      <a
        href="/onboarding/start"
        style={{
          padding: "14px 34px",
          borderRadius: 999,
          background:
            "linear-gradient(90deg, rgba(56,189,248,0.9), rgba(168,85,247,0.85))",
          border: "1px solid rgba(56,189,248,0.9)",
          color: "#f0f9ff",
          fontSize: 16,
          fontWeight: 600,
          letterSpacing: 0.4,
          textDecoration: "none",
          boxShadow:
            "0 0 25px rgba(56,189,248,0.35), 0 0 40px rgba(168,85,247,0.25)",
          transition: "all 0.2s ease",
        }}
        onMouseOver={(e) => (e.currentTarget.style.opacity = 0.85)}
        onMouseOut={(e) => (e.currentTarget.style.opacity = 1)}
      >
        Begin Onboarding →
      </a>
    </div>
  );
}
