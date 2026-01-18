// components/Header.js — HUD Strip V5 (Verivo Branded)
// SINGLE SOURCE OF TRUTH FOR AUTH CTA (3-STATE)

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { CaretDown } from "@phosphor-icons/react";
import { useOrg } from "../context/OrgContext";
import { useRole } from "../lib/useRole";

export default function Header() {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [hasStartedTrial, setHasStartedTrial] = useState(false);

  const { orgs, activeOrgId, activeOrg, setActiveOrg, loading } = useOrg();
  const { isLoadingRole } = useRole();

  /* ---------------------------
     SESSION + TRIAL DETECTION
  ----------------------------*/
  useEffect(() => {
    let mounted = true;

    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      setSession(session);
      setLoadingSession(false);

      // If NOT logged in, check if trial already exists
      if (!session) {
        try {
          const res = await fetch("/api/billing/trial-status");
          const json = await res.json();
          if (json?.hasStartedTrial) {
            setHasStartedTrial(true);
          }
        } catch {
          // silent fail — default to Start Free Trial
        }
      }
    }

    init();

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  /* ---------------------------
     ACTION HANDLERS
  ----------------------------*/
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
    window.location.href = "/auth/signup";
  }

  function goToLogin() {
    window.location.href = "/auth/login";
  }

  const isLoading = loading || isLoadingRole || loadingSession;
  const isLoggedIn = !!session?.user;

  /* ---------------------------
     RENDER
  ----------------------------*/
  return (
    <div
      style={{
        width: "100%",
        padding: "10px 24px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background:
          "linear-gradient(90deg, rgba(15,23,42,0.94), rgba(15,23,42,0.88), rgba(15,23,42,0.96))",
        borderBottom: "1px solid rgba(56,189,248,0.18)",
        backdropFilter: "blur(10px)",
        position: "sticky",
        top: 0,
        zIndex: 200,
      }}
    >
      {/* LEFT — LOGO + ORG SWITCHER (LOGGED IN ONLY) */}
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <img src="/brand/verivo-light.png" alt="verivo" style={{ height: 38 }} />

        {isLoggedIn && (
          <div style={{ position: "relative" }}>
            <button
              onClick={() => {
                if (!isLoading) setOpen((s) => !s);
              }}
              style={{
                padding: "8px 14px",
                background: "rgba(15,23,42,0.85)",
                color: "#e5e7eb",
                borderRadius: "8px",
                border: "1px solid rgba(51,65,85,0.9)",
                display: "flex",
                alignItems: "center",
                gap: 6,
                cursor: isLoading ? "default" : "pointer",
                fontSize: 13,
                opacity: isLoading ? 0.6 : 1,
              }}
            >
              {isLoading
                ? "Loading…"
                : activeOrg?.name || "Select Organization"}
              <CaretDown size={14} />
            </button>

            {open && !isLoading && (
              <div
                style={{
                  position: "absolute",
                  top: 44,
                  left: 0,
                  width: 240,
                  background: "rgba(15,23,42,0.98)",
                  border: "1px solid rgba(51,65,85,0.95)",
                  borderRadius: 10,
                  padding: 10,
                  zIndex: 9999,
                }}
              >
                {orgs.map((o) => (
                  <div
                    key={o.id}
                    onClick={() => {
                      setActiveOrg(o);
                      setOpen(false);
                    }}
                    style={{
                      padding: 10,
                      borderRadius: 6,
                      cursor: "pointer",
                      background:
                        o.id === activeOrgId
                          ? "rgba(56,189,248,0.15)"
                          : "transparent",
                      color:
                        o.id === activeOrgId ? "#38bdf8" : "#e5e7eb",
                    }}
                  >
                    {o.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* RIGHT — AUTH CTA */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {!loadingSession && (
          <>
            {isLoggedIn ? (
              <button
                onClick={handleLogout}
                style={{
                  padding: "7px 16px",
                  background:
                    "radial-gradient(circle at top left, rgba(56,189,248,0.18), rgba(15,23,42,0.95))",
                  borderRadius: 8,
                  border: "1px solid rgba(51,65,85,0.9)",
                  color: "#e5e7eb",
                  fontSize: 13,
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                Sign Out
              </button>
            ) : hasStartedTrial ? (
              <button
                onClick={goToLogin}
                style={{
                  padding: "7px 16px",
                  background: "linear-gradient(90deg, #2563eb, #38bdf8)",
                  borderRadius: 999,
                  border: "none",
                  color: "#fff",
                  fontSize: 13,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Login →
              </button>
            ) : (
              <button
                onClick={goToSignup}
                style={{
                  padding: "7px 16px",
                  background: "linear-gradient(90deg, #2563eb, #38bdf8)",
                  borderRadius: 999,
                  border: "none",
                  color: "#fff",
                  fontSize: 13,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Start Free Trial →
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
