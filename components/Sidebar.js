// components/Sidebar.js — Tactical Neon Rail V5
import React from "react";

export default function Sidebar({ pathname, isAdmin, isManager, isViewer }) {
  return (
    <div
      style={{
        width: 82, // slim rail
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "24px 0",
        position: "relative",
        zIndex: 50,

        background:
          "radial-gradient(circle at top, rgba(15,23,42,0.97), rgba(15,23,42,0.95))",
        borderRight: "1px solid rgba(56,189,248,0.22)",
        boxShadow: `
          inset -1px 0 10px rgba(56,189,248,0.28),
          0 0 20px rgba(0,0,0,0.75)
        `,
      }}
    >
      {/* TOP LOGO / GLYPH */}
      <div
        style={{
          marginBottom: 34,
          fontSize: 26,
          color: "#38bdf8",
          fontWeight: 700,
          textShadow: "0 0 14px rgba(56,189,248,0.5)",
        }}
      >
        ⚡
      </div>

      {/* MAIN NAV */}
      <RailLink
        href="/dashboard"
        label="Dashboard"
        icon="📊"
        active={pathname === "/dashboard"}
      />
      <RailLink
        href="/vendors"
        label="Vendors"
        icon="👥"
        active={pathname === "/vendors"}
      />

      {(isAdmin || isManager) && (
        <RailLink
          href="/upload-coi"
          label="Upload"
          icon="📄"
          active={pathname === "/upload-coi"}
        />
      )}

      {isAdmin && (
        <RailLink
          href="/organization"
          label="Org"
          icon="🏢"
          active={pathname === "/organization"}
        />
      )}

      {isAdmin && (
        <RailLink
          href="/alerts"
          label="Alerts"
          icon="🔔"
          active={pathname === "/alerts"}
        />
      )}

      {/* BOTTOM — LOGIN/LOGOUT */}
      <div style={{ marginTop: "auto" }}>
        <RailLink
          href="/auth/login"
          label="Logout"
          icon="🔐"
          active={pathname === "/auth/login"}
        />
      </div>
    </div>
  );
}

/* ===========================================
   V5 Rail Link Component
=========================================== */
function RailLink({ href, label, icon, active }) {
  return (
    <a
      href={href}
      style={{
        width: "100%",
        padding: "14px 0",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textDecoration: "none",
        cursor: "pointer",
        marginBottom: 8,

        background: active
          ? "rgba(56,189,248,0.14)"
          : "transparent",
        borderLeft: active
          ? "4px solid #38bdf8"
          : "4px solid transparent",
        boxShadow: active ? "0 0 14px rgba(56,189,248,0.55)" : "none",

        transition: "all 0.18s ease",
      }}
    >
      <span
        style={{
          fontSize: 20,
          marginBottom: 6,
          color: active ? "#38bdf8" : "#94a3af",
          textShadow: active ? "0 0 12px rgba(56,189,248,0.9)" : "none",
          transition: "0.2s",
        }}
      >
        {icon}
      </span>
      <span
        style={{
          fontSize: 11,
          color: active ? "#e5e7eb" : "#64748b",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          opacity: active ? 1 : 0.6,
          transition: "0.2s",
        }}
      >
        {label}
      </span>
    </a>
  );
}
