// components/AuthHeader.js
// ============================================================
// GLOBAL AUTH HEADER — Single source of truth for auth actions
// Renders on ALL pages (including onboarding)
// Shows: Logo + Login (logged out) OR Logo + Logout (logged in)
// ============================================================

import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import { useUser } from "../context/UserContext";

export default function AuthHeader({ minimal = false }) {
  const router = useRouter();
  const { user, initializing } = useUser();

  async function handleLogout() {
    // Clear Supabase auth
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

  if (initializing) {
    return (
      <div style={headerStyle}>
        <Logo />
        <div style={{ color: "#9ca3af", fontSize: 13 }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={headerStyle}>
      <Logo />

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {user ? (
          <>
            {!minimal && (
              <span style={{ fontSize: 12, color: "#9ca3af" }}>
                {user.email}
              </span>
            )}
            <button onClick={handleLogout} style={logoutButtonStyle}>
              Logout
            </button>
          </>
        ) : (
          <button onClick={handleLogin} style={loginButtonStyle}>
            Login
          </button>
        )}
      </div>
    </div>
  );
}

function Logo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <img
        src="/brand/verivo-light.png"
        alt="verivo"
        style={{ height: 32, width: "auto" }}
      />
    </div>
  );
}

const headerStyle = {
  width: "100%",
  padding: "12px 24px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  background: "rgba(15,23,42,0.95)",
  borderBottom: "1px solid rgba(56,189,248,0.2)",
  position: "sticky",
  top: 0,
  zIndex: 100,
};

const logoutButtonStyle = {
  padding: "8px 16px",
  background: "rgba(239,68,68,0.15)",
  border: "1px solid rgba(239,68,68,0.5)",
  borderRadius: 8,
  color: "#fca5a5",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
};

const loginButtonStyle = {
  padding: "8px 16px",
  background: "rgba(56,189,248,0.15)",
  border: "1px solid rgba(56,189,248,0.5)",
  borderRadius: 8,
  color: "#7dd3fc",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
};
