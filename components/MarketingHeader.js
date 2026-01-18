// components/MarketingHeader.js
// ============================================================
// MARKETING HEADER — Single auth control for marketing pages
// Shows: Logo + Pricing + Login (logged out) OR Sign Out (logged in)
// Reacts to Supabase session state in real-time
// ============================================================

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

export default function MarketingHeader() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Subscribe to auth state changes
  useEffect(() => {
    // Check initial session
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      setLoading(false);
    }
    checkSession();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();

    // Clear local storage
    try {
      localStorage.removeItem("supabase_token");
      localStorage.removeItem("verivo:activeOrgId");
      localStorage.removeItem("verivo:activeOrgUuid");
      localStorage.removeItem("onboarding_vendors_csv");
      localStorage.removeItem("onboarding_vendors_csv_snapshot");
    } catch {}

    // Redirect to landing page
    window.location.href = "/";
  }

  function handleLogin() {
    router.push("/auth/login");
  }

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
      {/* Logo */}
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

      {/* Nav actions */}
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
          <span style={{ fontSize: 13, color: "#9ca3af" }}>...</span>
        ) : user ? (
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
        ) : (
          <button
            onClick={handleLogin}
            style={{
              fontSize: 14,
              borderRadius: 999,
              padding: "7px 14px",
              border: "1px solid rgba(56,189,248,0.7)",
              background: "rgba(56,189,248,0.15)",
              color: "#7dd3fc",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            Login
          </button>
        )}
      </div>
    </header>
  );
}
