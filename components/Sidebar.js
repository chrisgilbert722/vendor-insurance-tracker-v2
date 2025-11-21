// components/Sidebar.js — Tactical Neon Rail V4

import React from "react";

export default function Sidebar({ pathname, isAdmin, isManager, isViewer }) {
  // Neon accent for active links
  const activeGlow = "0 0 12px rgba(56,189,248,0.65)";

  return (
    <div
      style={{
        width: "82px", // 🔥 Slim tactical rail
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "24px 0",
        position: "relative",
        zIndex: 50,

        // 🔥 Dark glass rail background
        background:
          "radial-gradient(circle at top, rgba(15,23,42,0.97), rgba(15,23,42,0.95))",
        borderRight: "1px solid rgba(56,189,248,0.18)",
        boxShadow: `
          inset -1px 0 8px rgba(56,189,248,0.2),
          0 0 18px rgba(0,0,0,0.6)
        `,
      }}
    >
      {/* TOP LOGO ICON */}
      <div
        style={{
          marginBottom: 34,
          fontSize: 26,
          color: "#38bdf8",
          fontWeight: 700,
          textShadow: "0 0 12px rgba(56,189,248,0.4)",
        }}
      >
        ⚡
      </div>

      {/* MAIN NAV ITEMS */}
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

      {/* BOTTOM SECTION */}
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
   V4 Rail Link Component
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

        // Glow if active
        background: active
          ? "rgba(56,189,248,0.12)"
          : "transparent",
        borderLeft: active
          ? "4px solid #38bdf8"
          : "4px solid transparent",
        boxShadow: active ? "0 0 12px rgba(56,189,248,0.4)" : "none",

        transition: "all 0.18s ease",
      }}
    >
      <span
        style={{
          fontSize: 20,
          marginBottom: 6,
          color: active ? "#38bdf8" : "#94a3b8",
          textShadow: active ? "0 0 10px rgba(56,189,248,0.7)" : "none",
          transition: "0.2s",
        }}
      >
        {icon}
      </span>

      {/* Label that fades in on hover */}
      <span
        style={{
          fontSize: 11,
          color: active ? "#e5e7eb" : "#64748b",
          letterSpacing: "0.04em",
          opacity: active ? 1 : 0.55,
          transition: "0.2s",
        }}
      >
        {label}
      </span>
    </a>
  );
}
