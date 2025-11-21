// components/Header.js — HUD Strip V4
import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { CaretDown } from "@phosphor-icons/react";
import { useOrg } from "../context/OrgContext";
import { useRole } from "../lib/useRole";

export default function Header() {
  const [open, setOpen] = useState(false);
  const { orgs, activeOrgId, switchOrg, loadingOrgs } = useOrg();
  const { isLoadingRole } = useRole();

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/auth/login";
  }

  const activeOrg = orgs.find((o) => o.id == activeOrgId);
  const loading = loadingOrgs || isLoadingRole;

  return (
    <div
      style={{
        width: "100%",
        padding: "10px 24px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",

        // 🔥 CINEMATIC HUD STRIP BACKGROUND
        background:
          "linear-gradient(90deg, rgba(15,23,42,0.94), rgba(15,23,42,0.85), rgba(30,41,59,0.9))",
        borderBottom: "1px solid rgba(56,189,248,0.15)",
        backdropFilter: "blur(10px)",
        position: "sticky",
        top: 0,
        zIndex: 200,

        // Glow ring along the bottom edge
        boxShadow: `
          0 2px 20px rgba(0,0,0,0.6),
          0 0 22px rgba(56,189,248,0.22)
        `,
      }}
    >
      {/* LEFT — ORG SWITCHER */}
      <div style={{ position: "relative" }}>
        <button
          onClick={() => {
            if (!loading) setOpen(!open);
          }}
          style={{
            padding: "8px 14px",
            background: "rgba(15,23,42,0.7)",
            color: "#e5e7eb",
            borderRadius: "8px",
            border: "1px solid rgba(51,65,85,0.8)",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            cursor: loading ? "default" : "pointer",
            fontSize: "13px",
            opacity: loading ? 0.6 : 1,

            // Neon glow when open
            boxShadow: open
              ? "0 0 14px rgba(56,189,248,0.35)"
              : "none",
            transition: "0.15s ease",
          }}
        >
          {loading
            ? "Loading..."
            : activeOrg?.name || "Select Organization"}
          <CaretDown size={14} />
        </button>

        {/* DROPDOWN */}
        {open && !loading && (
          <div
            style={{
              position: "absolute",
              top: "44px",
              left: 0,
              width: "240px",

              // 🔥 Dark glass dropdown
              background:
                "radial-gradient(circle at top, rgba(15,23,42,0.98), rgba(15,23,42,0.92))",
              border: "1px solid rgba(51,65,85,0.8)",
              borderRadius: "10px",
              padding: "10px",
              boxShadow: `
                0 12px 30px rgba(0,0,0,0.55),
                0 0 24px rgba(56,189,248,0.25)
              `,
              zIndex: 9999,
            }}
          >
            {orgs.length === 0 && (
              <div
                style={{
                  padding: "8px",
                  color: "#94a3b8",
                  fontSize: "13px",
                  textAlign: "center",
                }}
              >
                No organizations found
              </div>
            )}

            {orgs.map((o) => (
              <div
                key={o.id}
                onClick={() => {
                  switchOrg(o.id);
                  setOpen(false);
                }}
                style={{
                  padding: "10px",
                  borderRadius: "6px",
                  cursor: "pointer",

                  background:
                    o.id == activeOrgId
                      ? "rgba(56,189,248,0.15)"
                      : "transparent",
                  color:
                    o.id == activeOrgId
                      ? "#38bdf8"
                      : "#e5e7eb",
                  marginBottom: "6px",

                  transition: "0.15s ease",
                }}
              >
                {o.name}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RIGHT — SIGN OUT */}
      <button
        onClick={handleLogout}
        style={{
          padding: "7px 16px",
          background:
            "radial-gradient(circle at top left, rgba(56,189,248,0.18), rgba(15,23,42,0.9))",
          borderRadius: "8px",
          border: "1px solid rgba(51,65,85,0.8)",
          color: "#e5e7eb",
          fontSize: "13px",
          cursor: "pointer",
          fontWeight: 500,
          transition: "0.15s ease",
        }}
      >
        Sign Out
      </button>
    </div>
  );
}
