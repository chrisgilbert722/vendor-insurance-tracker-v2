// components/Layout.js — ONBOARDING-SAFE
// ✅ Sidebar & Header NEVER render during onboarding
// ✅ AppGuard remains simple
// ✅ Prevents hydration + redirect loops
// ✅ FINAL hardened version (path-safe)

import { useRouter } from "next/router";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useRole } from "../lib/useRole";
import { useOrg } from "../context/OrgContext";
import SupportChatPanel from "./chat/SupportChatPanel";

/* Extract vendorId from URL */
function extractVendorId(path) {
  const match = path.match(/\/vendor\/(\d+)/);
  return match ? match[1] : null;
}

export default function Layout({ children }) {
  const router = useRouter();

  // 🔒 Normalize path ONCE (handles asPath, querystrings, hydration)
  const rawPath = router.asPath || router.pathname || "";
  const pathname = rawPath.split("?")[0];

  /* ------------------------------------------------------------
     🔒 HARD BYPASS — ONBOARDING MUST NEVER USE LAYOUT
  ------------------------------------------------------------ */
  if (pathname.startsWith("/onboarding")) {
    return <>{children}</>;
  }

  const { activeOrg, activeOrgId } = useOrg() || {};

  // Onboarding completion (single source of truth)
  const onboardingComplete = !!activeOrg?.onboarding_completed;

  // Roles (do NOT block render)
  const roleState = useRole() || {};
  const isAdmin = !!roleState.isAdmin;
  const isManager = !!roleState.isManager;
  const isViewer = !!roleState.isViewer;
  const loadingRole = !!roleState.loading;

  const safeIsAdmin = loadingRole ? false : isAdmin;
  const safeIsManager = loadingRole ? false : isManager;
  const safeIsViewer = loadingRole ? true : isViewer;

  const vendorId = extractVendorId(pathname);

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        width: "100vw",
        overflow: "hidden",
        background: `
          radial-gradient(circle at 20% 0%, rgba(56,189,248,0.12), transparent 40%),
          radial-gradient(circle at 80% 0%, rgba(168,85,247,0.10), transparent 35%),
          radial-gradient(circle at 50% 90%, rgba(34,197,94,0.08), transparent 50%),
          linear-gradient(180deg, #020617 0%, #000000 100%)
        `,
        position: "relative",
      }}
    >
      {/* Ambient lighting */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: `
            radial-gradient(circle at 60% 20%, rgba(255,255,255,0.04), transparent 60%),
            radial-gradient(circle at 10% 80%, rgba(56,189,248,0.05), transparent 70%),
            radial-gradient(circle at 90% 60%, rgba(168,85,247,0.04), transparent 70%)
          `,
          mixBlendMode: "screen",
          zIndex: 0,
        }}
      />

      <div className="cockpit-particles" />

      {/* Sidebar (locked until onboarding complete) */}
      <Sidebar
        pathname={pathname}
        isAdmin={safeIsAdmin}
        isManager={safeIsManager}
        isViewer={safeIsViewer}
        onboardingComplete={onboardingComplete}
      />

      {/* Main panel */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          zIndex: 2,
          position: "relative",
        }}
      >
        <Header />

        {loadingRole && (
          <div
            style={{
              position: "sticky",
              top: 0,
              zIndex: 5,
              padding: "6px 12px",
              fontSize: 11,
              color: "rgba(148,163,184,0.85)",
              background: "rgba(2,6,23,0.55)",
              borderBottom: "1px solid rgba(148,163,184,0.15)",
              backdropFilter: "blur(10px)",
            }}
          >
            Loading permissions…
          </div>
        )}

        <main
          style={{
            padding: "30px 40px",
            width: "100%",
            height: "100%",
            position: "relative",
          }}
        >
          {children}
        </main>
      </div>

      {/* Explain Page */}
      <button
        onClick={() => window.dispatchEvent(new CustomEvent("explain_page"))}
        style={{
          position: "fixed",
          right: 24,
          bottom: 90,
          zIndex: 50,
          width: 44,
          height: 44,
          borderRadius: "999px",
          border: "1px solid rgba(250,204,21,0.9)",
          background:
            "radial-gradient(circle at top left,#facc15,#eab308,#854d0e)",
          color: "#1e1e1e",
          fontSize: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 0 25px rgba(250,204,21,0.7)",
          cursor: "pointer",
        }}
      >
        ❓
      </button>

      {/* Global Chat */}
      <SupportChatPanel
        orgId={activeOrgId || null}
        vendorId={vendorId}
        pathname={pathname}
        onboardingComplete={onboardingComplete}
      />
    </div>
  );
}
