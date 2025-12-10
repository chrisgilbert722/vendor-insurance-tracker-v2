// components/tutorial/SpotlightLayer.js
// Neon spotlight highlight around the current dashboard focus area

import React from "react";

export default function SpotlightLayer({ rect }) {
  if (!rect) return null;

  const padding = 10;

  const style = {
    position: "fixed",
    top: rect.top - padding,
    left: rect.left - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
    borderRadius: 20,
    border: "2px solid rgba(56,189,248,0.95)",
    boxShadow:
      "0 0 30px rgba(56,189,248,0.85), 0 0 60px rgba(59,130,246,0.7)",
    pointerEvents: "none",
    // fade + smooth move
    opacity: 1,
    transition: "all 300ms ease-out",
    zIndex: 99998,
  };

  return <div style={style} />;
}
