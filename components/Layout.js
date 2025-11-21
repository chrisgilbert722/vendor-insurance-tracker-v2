// components/Layout.js
import { useRouter } from "next/router";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useRole } from "../lib/useRole";
import { useOrg } from "../context/OrgContext";

export default function Layout({ children }) {
  const router = useRouter();
  const pathname = router.pathname;

  const { isAdmin, isManager, isViewer } = useRole();
  useOrg(); // ensure org context mounts

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        width: "100vw",
        overflow: "hidden",

        // 🔥 FULLSCREEN COCKPIT BACKGROUND
        background: `
          radial-gradient(circle at 20% 0%, rgba(56,189,248,0.12), transparent 40%),
          radial-gradient(circle at 80% 0%, rgba(168,85,247,0.10), transparent 35%),
          radial-gradient(circle at 50% 90%, rgba(34,197,94,0.08), transparent 50%),
          linear-gradient(180deg, #020617 0%, #000000 100%)
        `,
        position: "relative",
      }}
    >
      {/* 🔥 AMBIENT LIGHTING OVERLAY */}
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

      {/* 🔥 LEFT SIDEBAR — ULTRA THIN TACTICAL RAIL */}
      <Sidebar
        pathname={pathname}
        isAdmin={isAdmin}
        isManager={isManager}
        isViewer={isViewer}
      />

      {/* 🔥 MAIN AREA */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          position: "relative",
          zIndex: 2,
        }}
      >
        {/* 🔥 HUD HEADER BAR */}
        <Header />

        {/* 🔥 MAIN DASHBOARD CONTENT */}
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
    </div>
  );
}
