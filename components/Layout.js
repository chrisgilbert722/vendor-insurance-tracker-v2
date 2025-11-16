// components/Layout.js
import { useRouter } from "next/router";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useRole } from "../lib/useRole";
import { useOrg } from "../context/OrgContext";

export default function Layout({ children }) {
  const router = useRouter();
  const pathname = router.pathname;

  // Global role system
  const { isAdmin, isManager, isViewer } = useRole();

  // Organization context
  const { orgId } = useOrg();

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#F7F9FC",
        overflow: "hidden",
      }}
    >
      {/* GLOBAL SIDEBAR */}
      <Sidebar
        pathname={pathname}
        isAdmin={isAdmin}
        isManager={isManager}
        isViewer={isViewer}
      />

      {/* MAIN PANEL */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* GLOBAL HEADER */}
        <Header />

        {/* PAGE CONTENT */}
        <main style={{ padding: "30px 40px" }}>{children}</main>
      </div>
    </div>
  );
}
