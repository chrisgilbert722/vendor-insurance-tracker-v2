// pages/admin/ai-setup-center.js
// Placeholder page until we wire full AI Setup Center

export default function AiSetupCenterPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left,#020617 0,#020617 45%,#000)",
        padding: "32px 40px",
        color: "#e5e7eb",
      }}
    >
      <h1
        style={{
          fontSize: 26,
          fontWeight: 600,
          marginBottom: 12,
          background: "linear-gradient(90deg,#38bdf8,#a855f7,#f97316)",
          WebkitBackgroundClip: "text",
          color: "transparent",
        }}
      >
        AI Setup Center
      </h1>

      <p style={{ fontSize: 14, color: "#9ca3af", maxWidth: 600 }}>
        This is your central hub for AI-driven configuration: rule tuning,
        Org Brain redesign, wizard history, and intelligent system checks.
        Full UI coming soon.
      </p>
    </div>
  );
}
