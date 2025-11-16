// components/Sidebar.js

export default function Sidebar({ pathname, isAdmin, isManager, isViewer }) {
  return (
    <div
      style={{
        width: "220px",
        background: "#0f172a",
        color: "#e5e7eb",
        padding: "24px 18px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        borderRight: "1px solid #1e293b",
        minHeight: "100vh",
      }}
    >
      {/* Logo + Title */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{ fontSize: "18px", fontWeight: "700" }}>G-Track</div>
        <div style={{ fontSize: "11px", opacity: 0.7 }}>
          Vendor COI Automation
        </div>
      </div>

      {/* Dashboard */}
      <SidebarLink
        href="/dashboard"
        label="Dashboard"
        icon="📊"
        active={pathname === "/dashboard"}
      />

      {/* Vendors */}
      <SidebarLink
        href="/vendors"
        label="Vendors"
        icon="👥"
        active={pathname === "/vendors"}
      />

      {/* Upload COI — Only Admin/Manager */}
      {(isAdmin || isManager) && (
        <SidebarLink
          href="/upload-coi"
          label="Upload COI"
          icon="📄"
          active={pathname === "/upload-coi"}
        />
      )}

      {/* Organization Settings — Only Admin */}
      {isAdmin && (
        <SidebarLink
          href="/organization"
          label="Organization"
          icon="🏢"
          active={pathname === "/organization"}
        />
      )}

      {/* Alerts */}
      {isAdmin && (
        <SidebarLink
          href="/alerts"
          label="Alerts"
          icon="🔔"
          active={pathname === "/alerts"}
        />
      )}

      {/* Logout */}
      <SidebarLink
        href="/auth/login"
        label="Logout / Login"
        icon="🔐"
        active={pathname === "/auth/login"}
      />
    </div>
  );
}

/* ----------------------------------------------
   SidebarLink Component
---------------------------------------------- */
function SidebarLink({ href, label, icon, active }) {
  return (
    <a
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "10px 12px",
        borderRadius: "8px",
        color: active ? "#ffffff" : "#e5e7eb",
        background: active ? "#1e293b" : "transparent",
        textDecoration: "none",
        fontSize: "14px",
        fontWeight: active ? "600" : "400",
        cursor: "pointer",
        transition: "0.15s ease",
      }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </a>
  );
}
