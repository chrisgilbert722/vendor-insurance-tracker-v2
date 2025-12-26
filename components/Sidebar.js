// components/Sidebar.js — Tactical Neon Rail V17 (CLEANED + SEO SAFE)

import React from "react";
import Link from "next/link";

export default function Sidebar({ pathname }) {
  return (
    <div
      style={{
        width: 88,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "22px 0",
        background:
          "linear-gradient(180deg, rgba(15,23,42,0.98), rgba(2,6,23,0.98))",
        borderRight: "1px solid rgba(56,189,248,0.25)",
      }}
    >
      {/* LOGO */}
      <div style={{ marginBottom: 26, fontSize: 28 }}>⚡</div>

      {/* CORE WORKFLOW */}
      <RailLink href="/dashboard" label="Dashboard" icon="📊" />
      <RailLink href="/vendors" label="Vendors" icon="👥" />
      <RailLink href="/property-management" label="Properties" icon="🏬" />
      <RailLink href="/documents" label="Docs" icon="🗂️" />
      <RailLink href="/upload-coi" label="Upload" icon="📄" />

      {/* ADMIN */}
      <RailLink href="/admin/alerts" label="Alerts" icon="🔔" />
      <RailLink href="/admin/audit-log" label="Audit" icon="🧾" />
      <RailLink href="/admin/organization" label="Roles" icon="👤" />
      <RailLink href="/admin/requirements-v5" label="Rules" icon="🧠" />
      <RailLink href="/admin/renewals" label="Exec AI" icon="🏆" />
      <RailLink href="/admin/security/sso" label="SSO" icon="🔐" />

      {/* ONBOARDING */}
      <RailLink href="/onboarding/ai-wizard" label="Onboard" icon="🧭" />

      {/* TUTORIAL */}
      <RailLink href="/dashboard?tutorial=1" label="Tutorial" icon="🎯" />

      {/* LOGOUT */}
      <div style={{ marginTop: "auto" }}>
        <RailLink href="/auth/login" label="Logout" icon="🚪" />
      </div>
    </div>
  );
}

/* ======================================================
   RailLink — NEXT SAFE (NO WRAP, NO CRASH)
====================================================== */
function RailLink({ href, label, icon }) {
  return (
    <Link href={href} legacyBehavior>
      <a
        style={{
          width: "100%",
          padding: "14px 0",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textDecoration: "none",
          marginBottom: 6,
          color: "#cbd5f5",
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          whiteSpace: "nowrap",
          transition: "background 0.15s ease",
        }}
      >
        <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
        <span>{label}</span>
      </a>
    </Link>
  );
}
