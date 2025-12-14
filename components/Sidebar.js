// components/Sidebar.js — Tactical Neon Rail V13 (Documents Hub + Audit Log)
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useOrg } from "../context/OrgContext";

export default function Sidebar({ pathname, isAdmin, isManager, isViewer }) {
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

  const pulseStyle = onboardingActive
    ? {
        boxShadow:
          "0 0 18px rgba(56,189,248,0.75), 0 0 28px rgba(56,189,248,0.55)",
        background: "rgba(56,189,248,0.14)",
      }
    : {};

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
          style={{
            filter: "drop-shadow(0 0 6px rgba(56,189,248,0.9))",
            transition: "stroke-dashoffset 0.35s ease",
          }}
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
      {/* TOP LOGO */}
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

      {/* MAIN NAVIGATION */}
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

      <RailLink
        href="/documents"
        label="Documents"
        icon="🗂️"
        active={pathname.startsWith("/documents")}
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
          href="/admin/alerts"
          label="Alerts"
          icon="🔔"
          active={pathname === "/admin/alerts"}
        />
      )}

      {isAdmin && (
        <RailLink
          href="/admin/audit-log"
          label="Audit"
          icon="🧾"
          active={pathname === "/admin/audit-log"}
        />
      )}

      {!onboardingComplete && isAdmin && (
        <RailLink
          href="/onboarding/ai-wizard"
          label="Onboard"
          icon={<ProgressRing percent={wizardProgress} />}
          active={onboardingActive}
          extraStyle={pulseStyle}
        />
      )}

      {isAdmin && (
        <RailLink
          href="/admin/requirements-v5"
          label="Rules"
          icon="🧠"
          active={pathname === "/admin/requirements-v5"}
        />
      )}

      {onboardingComplete && isAdmin && (
        <RailLink
          href="/admin/ai-setup-center"
          label="AI Setup"
          icon="🧠"
          extraBadge="✓"
          active={pathname === "/admin/ai-setup-center"}
        />
      )}

      {isAdmin && (
        <RailLink
          href="/admin/renewals"
          label="Exec AI"
          icon="🏆"
          active={pathname === "/admin/renewals"}
        />
      )}

      {/* LOGOUT */}
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

/* ===============================================================
   RailLink Component (FIXED — Next.js Routing Safe)
=============================================================== */
function RailLink({ href, label, icon, active, extraStyle = {}, extraBadge }) {
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
          cursor: "pointer",
          marginBottom: 8,
          background: active ? "rgba(56,189,248,0.14)" : "transparent",
          borderLeft: active ? "4px solid #38bdf8" : "4px solid transparent",
          boxShadow: active ? "0 0 14px rgba(56,189,248,0.55)" : "none",
          transition: "all 0.18s ease",
          ...extraStyle,
        }}
      >
        <div style={{ position: "relative" }}>
          <span
            style={{
              fontSize: typeof icon === "string" ? 20 : 0,
              marginBottom: 6,
              color: active ? "#38bdf8" : "#94a3af",
              textShadow: active ? "0 0 12px rgba(56,189,248,0.9)" : "none",
            }}
          >
            {icon}
          </span>

          {extraBadge && (
            <span
              style={{
                position: "absolute",
                top: -4,
                right: -10,
                fontSize: 12,
                background: "rgba(34,197,94,0.95)",
                padding: "1px 5px",
                borderRadius: 999,
                color: "#ecfdf5",
              }}
            >
              {extraBadge}
            </span>
          )}
        </div>

        <span
          style={{
            fontSize: 11,
            color: active ? "#e5e7eb" : "#64748b",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            opacity: active ? 1 : 0.6,
          }}
        >
          {label}
        </span>
      </a>
    </Link>
  );
}
