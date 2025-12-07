// components/CockpitWizardLayout.js
// ===========================================================
// COCKPIT V9 WEAPONIZED LAYOUT — GLOBAL WIZARD SHELL
// Used by Step1 → Step2 → Step3 → Step4 → Step5
// ===========================================================

export default function CockpitWizardLayout({ children }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        position: "relative",
        overflowX: "hidden",
        overflowY: "visible",
        background:
          "radial-gradient(ellipse at top, #020617 0%, #000 65%)",
        padding: "40px",
        color: "#e5e7eb",
      }}
    >
      {/* AURAS */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(circle at 10% 0%, rgba(56,189,248,0.23), transparent 55%)," +
            "radial-gradient(circle at 90% 10%, rgba(139,92,246,0.22), transparent 55%)," +
            "radial-gradient(circle at 50% 100%, rgba(16,185,129,0.15), transparent 60%)",
          zIndex: 0,
          mixBlendMode: "screen",
        }}
      />

      {/* SCANLINES */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "100% 3px",
          opacity: 0.18,
          zIndex: 1,
        }}
      />

      {/* PARALLAX GRID */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)," +
            "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "50px 50px",
          zIndex: 1,
          opacity: 0.06,
          pointerEvents: "none",
        }}
      />

      {/* MAIN CONTENT WRAPPER */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          backdropFilter: "blur(8px)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
