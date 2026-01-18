// components/MarketingHeader.js
// ============================================================
// MARKETING HEADER — Single auth control for marketing pages
// CTA STATES:
// 1) Logged out, no trial → Start Free Trial
// 2) Logged out, trial exists → Login
// 3) Logged in → Sign Out
// RESPONSIVE: Mobile-first design
// ============================================================

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

export default function MarketingHeader() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasTrial, setHasTrial] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Track screen size for responsive layout
  useEffect(() => {
    function checkMobile() {
      setIsMobile(window.innerWidth < 640);
    }
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // ----------------------------
  // AUTH + TRIAL STATE
  // ----------------------------
  useEffect(() => {
    async function init() {
      // 1. Check session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setUser(session?.user || null);

      // 2. If logged out, check if trial exists
      if (!session?.user) {
        try {
          const res = await fetch("/api/billing/trial-status");
          const json = await res.json();
          setHasTrial(!!json?.trial_started_at);
        } catch {
          setHasTrial(false);
        }
      }

      setLoading(false);
    }

    init();

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ----------------------------
  // ACTIONS
  // ----------------------------
  async function handleLogout() {
    await supabase.auth.signOut();

    try {
      localStorage.removeItem("supabase_token");
      localStorage.removeItem("verivo:activeOrgId");
      localStorage.removeItem("verivo:activeOrgUuid");
      localStorage.removeItem("onboarding_vendors_csv");
      localStorage.removeItem("onboarding_vendors_csv_snapshot");
    } catch {}

    window.location.href = "/";
  }

  function goToSignup() {
    router.push("/auth/signup");
  }

  function goToLogin() {
    router.push("/auth/login");
  }

  // ----------------------------
  // SHARED CTA STYLE (MATCHES HERO) - responsive
  // ----------------------------
  const primaryCtaStyle = {
    borderRadius: 999,
    padding: isMobile ? "8px 14px" : "10px 18px",
    border: "1px solid rgba(59,130,246,0.9)",
    background:
      "radial-gradient(circle at top left,#3b82f6,#1d4ed8,#0f172a)",
    color: "#e0f2fe",
    fontSize: isMobile ? 13 : 15,
    fontWeight: 500,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };

  return (
    <header
      style={{
        maxWidth: 1180,
        margin: "0 auto 24px auto",
        padding: isMobile ? "0 16px" : "0",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "relative",
        zIndex: 2,
        gap: 12,
      }}
    >
      {/* LOGO */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          cursor: "pointer",
          flexShrink: 0,
        }}
        onClick={() => router.push("/")}
      >
        <div
          style={{
            width: isMobile ? 28 : 32,
            height: isMobile ? 28 : 32,
            borderRadius: "999px",
            background:
              "radial-gradient(circle at 30% 0,#38bdf8,#6366f1,#0f172a)",
            boxShadow: "0 0 30px rgba(56,189,248,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ fontSize: isMobile ? 14 : 18 }}>⚡</span>
        </div>
        <span
          style={{
            fontSize: isMobile ? 16 : 18,
            fontWeight: 600,
            letterSpacing: 0.4,
          }}
        >
          verivo
        </span>
      </div>

      {/* NAV */}
      <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 14 }}>
        <button
          onClick={() => router.push("/pricing")}
          style={{
            fontSize: isMobile ? 12 : 14,
            border: "none",
            background: "transparent",
            color: "#cbd5f5",
            cursor: "pointer",
            padding: isMobile ? "4px 6px" : "4px 8px",
          }}
        >
          Pricing
        </button>

        {loading ? (
          <span style={{ fontSize: 13, color: "#9ca3af" }}>...</span>
        ) : user ? (
          // LOGGED IN → SIGN OUT
          <button
            onClick={handleLogout}
            style={{
              fontSize: isMobile ? 12 : 14,
              borderRadius: 999,
              padding: isMobile ? "6px 10px" : "7px 14px",
              border: "1px solid rgba(239,68,68,0.5)",
              background: "rgba(239,68,68,0.15)",
              color: "#fca5a5",
              cursor: "pointer",
              fontWeight: 500,
              whiteSpace: "nowrap",
            }}
          >
            Sign Out
          </button>
        ) : hasTrial ? (
          // LOGGED OUT + TRIAL EXISTS → LOGIN
          <button onClick={goToLogin} style={primaryCtaStyle}>
            Login →
          </button>
        ) : (
          // LOGGED OUT + NO TRIAL → START FREE TRIAL
          <button onClick={goToSignup} style={primaryCtaStyle}>
            Start Free Trial →
          </button>
        )}
      </div>
    </header>
  );
}
