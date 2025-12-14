// components/Sidebar.js — Tactical Neon Rail V15 (Roles Fixed)
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useOrg } from "../context/OrgContext";

export default function Sidebar({ pathname, isAdmin, isManager }) {
  const { activeOrgId } = useOrg() || {};

  const [onboardingComplete, setOnboardingComplete] = useState(true);
  const [wizardProgress, setWizardProgress] = useState(0);

  // ================================================================
  // FETCH ONBOARDING STATUS + PROGRESS
  // ================================================================
  useEffect(() => {
    async function fetchStatus() {
      if (!activeOrgId) return;

      try {
        const res = await fetch(
          `/api/onboarding/status?orgId=${encodeURIComponent(activeOrgId)}`
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

  const onboardingActive =
    pathname.startsWith("/onboarding") && !onboardingComplete;

  function ProgressRing({ percent }) {
    const size = 26;
    const stroke = 4;
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference - (percent / 100) * circumference;

    return (
      <svg width={size} height={size} style={{ marginBottom: 6 }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(100,116,139,0.35)"
          strokeWidth={stroke}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#38bdf8"
          strokeWidth={stroke}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <div
      style={{
        width: 82,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "24px 0",
        background:
          "radial-gradient(circle at top, rgba(15,23,42,0.97), rgba(15,23,42,0.95))",
        borderRight: "1px solid rgba(56,189,248,0.22)",
      }}
    >
      {/* LOGO */}
      <div style={{ marginBottom: 34, fontSize: 26, color: "#38bdf8" }}>⚡</div>

      {/* CORE */}
      <RailLink href="/dashboard" label="Dashboard" icon="📊" active={pathname === "/dashboard"} />
      <RailLink href="/vendors" label="Vendors" icon="👥" active={pathname === "/vendors"} />
      <RailLink href="/documents" label="Docs" icon="🗂️" active={pathname.startsWith("/documents")} />

      {(isAdmin || isManager) && (
        <RailLink href="/upload-coi" label="Upload" icon="📄" active={pathname === "/upload-coi"} />
      )}

      {/* ADMIN */}
      {isAdmin && (
        <>
          <RailLink
            href="/admin/alerts"
            label="Alerts"
            icon="🔔"
            active={pathname.startsWith("/admin/alerts")}
          />

          <RailLink
            href="/admin/audit-log"
            label="Audit"
            icon="🧾"
            active={pathname.startsWith("/admin/audit-log")}
          />

          {/* ✅ ROLES → ORGANIZATION */}
          <RailLink
            href="/admin/organization"
            label="Roles"
            icon="👤"
            active={pathname.startsWith("/admin/organization")}
          />

          <RailLink
            href="/admin/requirements-v5"
            label="Rules"
            icon="🧠"
            active={pathname.startsWith("/admin/requirements-v5")}
          />

          <RailLink
            href="/admin/renewals"
            label="Exec AI"
            icon="🏆"
            active={pathname.startsWith("/admin/renewals")}
          />

          <RailLink
            href="/admin/ai-setup-center"
            label="AI Setup"
            icon="✨"
            active={pathname.startsWith("/admin/ai-setup-center")}
          />
        </>
      )}

      {/* ONBOARDING */}
      {!onboardingComplete && isAdmin && (
        <RailLink
          href="/onboarding/ai-wizard"
          label="Onboard"
          icon={<ProgressRing percent={wizardProgress} />}
          active={onboardingActive}
        />
      )}

      {/* TUTORIAL */}
      <RailLink
        href="/dashboard?tutorial=1"
        label="Tutorial"
        icon="🎯"
        active={false}
      />

      {/* LOGOUT */}
      <div style={{ marginTop: "auto" }}>
        <RailLink href="/auth/login" label="Logout" icon="🔐" active={false} />
      </div>
    </div>
  );
}

/* ===============================================================
   RailLink — Next.js SAFE
=============================================================== */
function RailLink({ href, label, icon, active }) {
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
          marginBottom: 8,
          background: active ? "rgba(56,189,248,0.14)" : "transparent",
          borderLeft: active ? "4px solid #38bdf8" : "4px solid transparent",
          color: active ? "#e5e7eb" : "#64748b",
          fontSize: 11,
          textTransform: "uppercase",
        }}
      >
        <div style={{ fontSize: typeof icon === "string" ? 20 : 0 }}>{icon}</div>
        <span>{label}</span>
      </a>
    </Link>
  );
}
