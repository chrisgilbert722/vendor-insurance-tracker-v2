// components/modals/ModalV3.js
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function ModalV3({
  open,
  onClose,
  title,
  children,
  maxWidth = "1200px",
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    function onKey(e) {
      if (e.key === "Escape" && open) {
        onClose?.();
      }
    }

    if (open) {
      document.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  const overlayStyle = {
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 24px",
    background:
      "radial-gradient(circle at top, rgba(56,189,248,0.16), transparent 55%) , radial-gradient(circle at bottom, rgba(168,85,247,0.16), rgba(15,23,42,0.96))",
    backdropFilter: "blur(22px)",
  };

  const panelStyle = {
    position: "relative",
    width: "100%",
    maxWidth,
    maxHeight: "100%",
    borderRadius: "32px",
    padding: "20px 24px 24px 24px",
    background:
      "radial-gradient(circle at top left, rgba(59,130,246,0.22), transparent 55%), radial-gradient(circle at bottom right, rgba(236,72,153,0.22), #020617)",
    boxShadow:
      "0 32px 120px rgba(15,23,42,0.95), 0 0 0 1px rgba(148,163,184,0.32)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  };

  const headerStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingBottom: 10,
    borderBottom: "1px solid rgba(148,163,184,0.35)",
  };

  const titleStyle = {
    fontSize: 16,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#e5e7eb",
  };

  const closeButtonStyle = {
    border: "none",
    borderRadius: "999px",
    padding: "6px 12px",
    fontSize: 13,
    cursor: "pointer",
    background:
      "radial-gradient(circle at top left, rgba(248,250,252,0.16), rgba(30,64,175,0.82))",
    color: "#e5e7eb",
    display: "flex",
    alignItems: "center",
    gap: 6,
  };

  const bodyStyle = {
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
  };

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) {
      onClose?.();
    }
  }

  return createPortal(
    <div style={overlayStyle} onClick={handleOverlayClick}>
      <div style={panelStyle}>
        <div style={headerStyle}>
          <div style={titleStyle}>{title}</div>
          <button type="button" style={closeButtonStyle} onClick={onClose}>
            ✕ Close
          </button>
        </div>
        <div style={bodyStyle}>{children}</div>
      </div>
    </div>,
    document.body
  );
}
