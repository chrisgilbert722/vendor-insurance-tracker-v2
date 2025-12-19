// components/Sidebar.js — Tactical Neon Rail V16 (ROLE-SAFE)

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useOrg } from "../context/OrgContext";
import { supabase } from "../lib/supabaseClient";

export default function Sidebar({ pathname }) {
  const { activeOrgId } = useOrg();

  const [role, setRole] = useState(null);
  const [onboardingComplete, setOnboardingComplete] = useState(true);
  const [wizardProgress, setWizardProgress] = useState(0);

  const isAdmin = role === "owner" || role === "admin";
  const isManager = role === "manager";

  // =====================================
  // LOAD USER ROLE FOR ACTIVE ORG
  // =====================================
  useEffect(() => {
    async function loadRole() {
      if (!activeOrgId) return;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) return;

      const { data } = await supabase
        .from("organization_members")
        .select("role")
        .eq("org_id", activeOrgId)
        .eq("user_id", session.user.id)
        .maybeSingle();

      setRole(data?.role || null);
    }

    loadRole();
  }, [activeOrgId]);

  // =====================================
  // LOAD ONBOARDING STATUS
  // =====================================
  useEffect(() => {
    async function fetchStatus() {
      if (!activeOrgId) return;

      try {
        const res = await fetch(
          `/api/onboarding/status?orgId=${activeOrgId}`
        );
        const json = await res.json();

        if (json.ok) {
          setOnboardingComplete(!!json.onboardingComplete);
          setWizardProgress(json.progressPercent || 0);
        }
      } catch (err) {
        console.error("[Sidebar] onboarding status error:", err);
      }
    }

    fetchStatus();
  }, [activeOrgId]);

  const onboardingActive = pathname.startsWith("/onboarding");

  return (
    <div style={railStyle}>
      {/* LOGO */}
      <div style={{ marginBottom: 34, fontSize: 26, color: "#38bdf8" }}>⚡</div>

      <RailLink href="/dashboard" label="Dashboard" icon="📊" active={pathname === "/dashboard"} />
      <RailLink href="/vendors" label="Vendors" icon="👥" active={pathname === "/vendors"} />
      <RailLink href="/documents" label="Docs" icon="🗂️" active={pathname.startsWith("/documents")} />

      {(isAdmin || isManager) && (
        <RailLink href="/upload-coi" label="Upload" icon="📄" active={pathname === "/upload-coi"} />
      )}

      {isAdmin && (
        <>
          <RailLink href="/admin/alerts" label="Alerts" icon="🔔" active={pathname.startsWith("/admin/alerts")} />
          <RailLink href="/admin/audit-log" label="Audit" icon="🧾" active={pathname.startsWith("/admin/audit-log")} />
          <RailLink href="/admin/organization" label="Roles" icon="👤" active={pathname.startsWith("/admin/organization")} />
          <RailLink href="/admin/requirements-v5" label="Rules" icon="🧠" active={pathname.startsWith("/admin/requirements-v5")} />
          <RailLink href="/admin/renewals" label="Exec AI" icon="🏆" active={pathname.startsWith("/admin/renewals")} />
          <RailLink href="/admin/ai-setup-center" label="AI Setup" icon="✨" active={pathname.startsWith("/admin/ai-setup-center")} />
          <RailLink href="/onboarding/ai-wizard" label="Onboard" icon="🧭" active={onboardingActive} />
        </>
      )}

      <RailLink href="/dashboard?tutorial=1" label="Tutorial" icon="🎯" active={false} />

      <div style={{ marginTop: "auto" }}>
        <RailLink href="/auth/login" label="Logout" icon="🔐" active={false} />
      </div>
    </div>
  );
}

function RailLink({ href, label, icon, active }) {
  return (
    <Link href={href} legacyBehavior>
      <a style={{
        width: "100%",
        padding: "14px 0",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        marginBottom: 8,
        background: active ? "rgba(56,189,248,0.14)" : "transparent",
        borderLeft: active ? "4px solid #38bdf8" : "4px solid transparent",
        color: active ? "#e5e7eb" : "#64748b",
        fontSize: 11,
        textTransform: "uppercase",
        textDecoration: "none",
      }}>
        <div style={{ fontSize: 20 }}>{icon}</div>
        <span>{label}</span>
      </a>
    </Link>
  );
}

const railStyle = {
  width: 82,
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "24px 0",
  background: "radial-gradient(circle at top, rgba(15,23,42,0.97), rgba(15,23,42,0.95))",
  borderRight: "1px solid rgba(56,189,248,0.22)",
};
