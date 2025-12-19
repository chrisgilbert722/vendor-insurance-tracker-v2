// components/Sidebar.js
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useOrg } from "../context/OrgContext";

export default function Sidebar({ pathname }) {
  const { activeOrgId, loading } = useOrg();

  // 👇 show disabled shell while org loads
  const disabled = loading || !activeOrgId;

  return (
    <div style={rail(disabled)}>
      <div style={logo}>⚡</div>

      <RailLink href="/dashboard" label="Dashboard" icon="📊" disabled={disabled} />
      <RailLink href="/vendors" label="Vendors" icon="👥" disabled={disabled} />
      <RailLink href="/documents" label="Docs" icon="🗂️" disabled={disabled} />
      <RailLink href="/upload-coi" label="Upload" icon="📄" disabled={disabled} />

      <RailLink href="/admin/alerts" label="Alerts" icon="🔔" disabled={disabled} />
      <RailLink href="/admin/audit-log" label="Audit" icon="🧾" disabled={disabled} />
      <RailLink href="/admin/organization" label="Roles" icon="👤" disabled={disabled} />
      <RailLink href="/admin/requirements-v5" label="Rules" icon="🧠" disabled={disabled} />
      <RailLink href="/admin/renewals" label="Exec AI" icon="🏆" disabled={disabled} />
      <RailLink href="/admin/security/sso" label="SSO" icon="🔐" disabled={disabled} />

      <div style={{ marginTop: "auto" }}>
        <RailLink href="/auth/login" label="Logout" icon="🚪" />
      </div>
    </div>
  );
}

function RailLink({ href, label, icon, disabled }) {
  return (
    <Link href={disabled ? "#" : href}>
      <a
        style={{
          padding: "14px 0",
          textAlign: "center",
          color: disabled ? "#334155" : "#e5e7eb",
          pointerEvents: disabled ? "none" : "auto",
          opacity: disabled ? 0.4 : 1,
          textDecoration: "none",
          fontSize: 11,
        }}
      >
        <div style={{ fontSize: 20 }}>{icon}</div>
        {label}
      </a>
    </Link>
  );
}

const rail = (disabled) => ({
  width: 82,
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  background: "rgba(15,23,42,0.98)",
  borderRight: "1px solid rgba(56,189,248,0.25)",
  opacity: disabled ? 0.85 : 1,
});

const logo = {
  marginBottom: 24,
  fontSize: 26,
  color: "#38bdf8",
};
