// components/ToastV2.js — Cinematic Neon Toast V2

import { useEffect } from "react";

export default function ToastV2({ open, message, onClose, type = "success" }) {
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(onClose, 2600);
    return () => clearTimeout(t);
  }, [open]);

  if (!open) return null;

  const colors = {
    success: {
      glow: "rgba(34,197,94,0.45)",
      bg: "linear-gradient(120deg,#22c55e,#16a34a,#0f172a)",
    },
    error: {
      glow: "rgba(248,113,113,0.45)",
      bg: "linear-gradient(120deg,#dc2626,#7f1d1d,#0f172a)",
    },
  }[type];

  return (
    <div
      style={{
        position: "fixed",
        bottom: 28,
        right: 28,
        zIndex: 9999,
        padding: "14px 22px",
        borderRadius: 18,
        color: "white",
        fontSize: 14,
        fontWeight: 600,
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(255,255,255,0.15)",
        background: colors.bg,
        boxShadow: `0 0 45px ${colors.glow}`,
        display: "flex",
        alignItems: "center",
        gap: 10,
        animation: "slideUp 0.25s ease-out",
      }}
    >
      <span style={{ fontSize: 18 }}>⚡</span>
      <span>{message}</span>

      <style>{`
        @keyframes slideUp {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
