// components/MarketingHeader.js
// ============================================================
// MARKETING HEADER — Single auth control for marketing pages
// CTA STATES:
// 1) Logged out, no trial → Start Free Trial
// 2) Logged out, trial exists → Login
// 3) Logged in → Sign Out
// ============================================================

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

export default function MarketingHeader() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasTrial, setHasTrial] = useState(false);

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
  // SHARED CTA STYLE (MATCHES HERO)
  // ----------------------------
  const primaryCtaStyle = {
    borderRadius: 999,
    padding: "10px 18px",
    border: "1px solid rgba(59,130,246,0.9)",
    background:
      "radial-gradient(circle at top left,#3b82f6,#1d4ed8,#0f172a)",
    color: "#e0f2fe",
    fontSize: 15,
    fontWeight: 500,
    cursor: "pointer",
  };

  return (
    <header
      style={{
        maxWidth: 1180,
        margin: "0 auto 40px auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "relative",
        zIndex: 2,
      }}
    >
      {/* LOGO */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          cursor: "pointer",
        }}
        onClick={() => router.push("/")}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "999px",
            background:
              "radial-gradient(circle at 30% 0,#38bdf8,#6366f1,#0f172a)",
            boxShadow: "0 0 30px rgba(56,189,248,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ fontSize: 18 }}>⚡</span>
        </div>
        <span
          style={{
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: 0.4,
          }}
        >
          verivo
        </span>
      </div>

      {/* NAV */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <button
          onClick={() => router.push("/pricing")}
          style={{
            fontSize: 14,
            border: "none",
            background: "transparent",
            color: "#cbd5f5",
            cursor: "pointer",
          }}
        >
          Pricing
        </button>

        {loading ? (
          <span style={{ fontSize: 13, color: "#9ca3af" }}>…</span>
        ) : user ? (
          // LOGGED IN → SIGN OUT
          <button
            onClick={handleLogout}
            style={{
              fontSize: 14,
              borderRadius: 999,
              padding: "7px 14px",
              border: "1px solid rgba(239,68,68,0.5)",
              background: "rgba(239,68,68,0.15)",
              color: "#fca5a5",
              cursor: "pointer",
              fontWeight: 500,
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
