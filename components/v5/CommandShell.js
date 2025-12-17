// components/v5/CommandShell.js
import { V5 } from "./v5Theme";

export default function CommandShell({
  tag,
  title,
  subtitle,
  status,
  statusColor,
  actions,
  children,
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 20% 0%, rgba(56,189,248,0.12), transparent 35%), radial-gradient(circle at 85% 10%, rgba(168,85,247,0.10), transparent 35%), radial-gradient(circle at 50% 120%, rgba(34,197,94,0.06), transparent 45%), #020617",
        padding: "34px 42px 60px",
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

      {/* Aura */}
      <div
        style={{
          position: "absolute",
          top: -380,
          left: "50%",
          transform: "translateX(-50%)",
          width: 1400,
          height: 1400,
          background:
            "radial-gradient(circle, rgba(56,189,248,0.24), transparent 60%)",
          filter: "blur(160px)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          borderRadius: 34,
          padding: 26,
          border: `1px solid ${V5.border}`,
          background:
            "radial-gradient(circle at 20% 0%, rgba(15,23,42,0.95), rgba(15,23,42,0.86))",
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
                border: `1px solid ${V5.border}`,
                background:
                  "linear-gradient(120deg, rgba(2,6,23,0.8), rgba(15,23,42,0.7))",
                boxShadow: `0 0 18px ${V5.glowBlue}`,
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
              <span
                style={{
                  fontSize: 10,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: statusColor,
                }}
              >
                {status}
              </span>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: statusColor,
                  boxShadow: `0 0 14px ${statusColor}`,
                }}
              />
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
                  lineHeight: 1.6,
                }}
              >
                {subtitle}
              </div>
            )}
          </div>

          {actions && (
            <div style={{ display: "flex", gap: 10 }}>{actions}</div>
          )}
        </div>

        {children}
      </div>
    </div>
  );
}
