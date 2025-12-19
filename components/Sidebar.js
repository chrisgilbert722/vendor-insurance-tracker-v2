// components/Sidebar.js
import React from "react";
import Link from "next/link";
import { useOrg } from "../context/OrgContext";

export default function Sidebar({ pathname }) {
  const { activeOrgId } = useOrg();

  if (!activeOrgId) {
    return null; // ⛔ DO NOT RENDER SIDEBAR UNTIL ORG EXISTS
  }

  return (
    <div style={rail}>
      <div style={logo}>⚡</div>

      <RailLink href="/dashboard" label="Dashboard" icon="📊" active={pathname === "/dashboard"} />
      <RailLink href="/vendors" label="Vendors" icon="👥" active={pathname.startsWith("/vendors")} />
      <RailLink href="/documents" label="Docs" icon="🗂️" active={pathname.startsWith("/documents")} />
      <RailLink href="/upload-coi" label="Upload" icon="📄" active={pathname === "/upload-coi"} />

      <RailLink href="/admin/alerts" label="Alerts" icon="🔔" />
      <RailLink href="/admin/audit-log" label="Audit" icon="🧾" />
      <RailLink href="/admin/organization" label="Roles" icon="👤" />
      <RailLink href="/admin/requirements-v5" label="Rules" icon="🧠" />
      <RailLink href="/admin/renewals" label="Exec AI" icon="🏆" />
      <RailLink href="/admin/security/sso" label="SSO" icon="🔐" />

      <div style={{ marginTop: "auto" }}>
        <RailLink href="/auth/login" label="Logout" icon="🚪" />
      </div>
    </div>
  );
}

function RailLink({ href, label, icon, active }) {
  return (
    <Link href={href}>
      <a style={{
        padding: "14px 0",
        textAlign: "center",
        color: active ? "#e5e7eb" : "#64748b",
        background: active ? "rgba(56,189,248,0.15)" : "transparent",
        borderLeft: active ? "4px solid #38bdf8" : "4px solid transparent",
        textDecoration: "none",
        fontSize: 11,
      }}>
        <div style={{ fontSize: 20 }}>{icon}</div>
        {label}
      </a>
    </Link>
  );
}

const rail = {
  width: 82,
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  background: "rgba(15,23,42,0.98)",
  borderRight: "1px solid rgba(56,189,248,0.25)",
};

const logo = {
  marginBottom: 24,
  fontSize: 26,
  color: "#38bdf8",
};
