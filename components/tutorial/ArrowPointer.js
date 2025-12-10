// components/tutorial/ArrowPointer.js
// Neon arrow pointing toward the highlighted area

import React from "react";

export default function ArrowPointer({ rect }) {
  if (!rect) return null;

  // Decide whether to place arrow above or below the rect
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800;
  const isHighOnScreen = rect.top < viewportHeight / 2;

  const arrowSize = 18;
  const top = isHighOnScreen
    ? rect.top + rect.height + 14 // arrow below
    : rect.top - arrowSize - 14; // arrow above

  const style = {
    position: "fixed",
    left: rect.left + rect.width / 2 - arrowSize / 2,
    top,
    width: 0,
    height: 0,
    borderLeft: `${arrowSize / 2}px solid transparent`,
    borderRight: `${arrowSize / 2}px solid transparent`,
    borderTop: isHighOnScreen ? `${arrowSize}px solid rgba(56,189,248,0.95)` : "none",
    borderBottom: !isHighOnScreen ? `${arrowSize}px solid rgba(56,189,248,0.95)` : "none",
    filter: "drop-shadow(0 0 10px rgba(56,189,248,0.9))",
    zIndex: 99998,
    transition: "all 300ms ease-out",
  };

  return <div style={style} />;
}
