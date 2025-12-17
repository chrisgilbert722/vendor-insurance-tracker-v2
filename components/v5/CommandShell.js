// components/v5/CommandShell.js
// ==========================================================
// COMMAND SHELL — V5 EXEC LAYOUT
// Iron-Man / JARVIS cockpit wrapper for all admin pages
// ==========================================================

import { V5 } from "./v5Theme";

export default function CommandShell({
  tag,
  title,
  subtitle,
  status,
  statusColor,
  actions = [],
  children,
}) {
  const color = statusColor || V5.status[status] || V5.blue;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `
          radial-gradient(circle at 20% 0%, ${V5.glowBlue}, transparent 35%),
          radial-gradient(circle at 85% 10%, ${V5.glowPurple}, transparent 35%),
          radial-gradient(circle at 50% 120%, ${V5.glowGreen}, transparent 45%),
          ${V5.bg}
        `,
        padding: "34px 42px 48px",
        color: V5.text,
        overflowX: "hidden",
      }}
    >
      {/* Scanlines */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px)",
          backgroundSize: "100% 3px",
          opacity: 0.18,
          mixBlendMode: "screen",
        }}
      />

      {/* Shell */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          borderRadius: 34,
          padding: 22,
          border: `1px solid ${V5.borderSoft}`,
          background: `
            radial-gradient(circle at 20% 0%, rgba(15,23,42,0.95), rgba(15,23,42,0.86))
          `,
          boxShadow: `
            0 0 70px rgba(0,0,0,0.8),
            0 0 80px ${V5.glowBlue},
            0 0 60px ${V5.glowPurple},
            inset 0 0 24px rgba(0,0,0,0.65)
          `,
        }}
      >
        {/* HEADER */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 18,
            flexWrap: "wrap",
            marginBottom: 22,
          }}
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                gap: 10,
                alignItems: "center",
                padding: "6px 12px",
                borderRadius: 999,
                border: `1px solid ${V5.borderSoft}`,
                background: "rgba(2,6,23,0.7)",
                boxShadow: `0 0 18px ${color}33`,
                marginBottom: 10,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  letterSpacing: "0.18em",
                  color: V5.soft,
                  textTransform: "uppercase",
                }}
              >
                {tag}
              </span>

              {status && (
                <>
                  <span
                    style={{
                      fontSize: 10,
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                      color,
                    }}
                  >
                    {status}
                  </span>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: color,
                      boxShadow: `0 0 14px ${color}`,
                    }}
                  />
                </>
              )}
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: 30,
                fontWeight: 700,
                letterSpacing: 0.2,
              }}
            >
              {title}
            </h1>

            {subtitle && (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 13,
                  color: V5.soft,
                  maxWidth: 760,
                  lineHeight: 1.55,
                }}
              >
                {subtitle}
              </div>
            )}
          </div>

          {/* ACTIONS */}
          {actions.length > 0 && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {actions.map((a, i) => (
                <div key={i}>{a}</div>
              ))}
            </div>
          )}
        </div>

        {/* CONTENT */}
        {children}
      </div>
    </div>
  );
}
