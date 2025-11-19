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

  // THIS LINE WAS WRONG AND BREAKING EVERYTHING:
  // const { orgId } = useOrg();

  // FIX:
  const { activeOrgId } = useOrg(); 
  // (or delete this entirely if unused)

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#F7F9FC",
        overflow: "hidden",
      }}
    >
      <Sidebar
        pathname={pathname}
        isAdmin={isAdmin}
        isManager={isManager}
        isViewer={isViewer}
      />

      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <Header />
        <main style={{ padding: "30px 40px" }}>{children}</main>
      </div>
    </div>
  );
}
