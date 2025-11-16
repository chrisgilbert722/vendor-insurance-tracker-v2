// components/Header.js
import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { CaretDown } from "@phosphor-icons/react";
import { useOrg } from "../context/OrgContext";

export default function Header() {
  const [open, setOpen] = useState(false);
  const { orgs, activeOrgId, switchOrg, loadingOrgs } = useOrg();

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/auth/login";
  }

  const activeOrg = orgs.find((o) => o.id == activeOrgId);

  return (
    <div
      style={{
        width: "100%",
        padding: "12px 24px",
        borderBottom: "1px solid #ddd",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "#fff",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      {/* ORG SWITCHER */}
      <div style={{ position: "relative" }}>
        <button
          onClick={() => setOpen(!open)}
          style={{
            padding: "8px 14px",
            background: "#0f172a",
            color: "#e5e7eb",
            borderRadius: "8px",
            border: "1px solid #1e293b",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          {loadingOrgs
            ? "Loading..."
            : activeOrg?.name || "Select Organization"}
          <CaretDown size={14} />
        </button>

        {open && (
          <div
            style={{
              position: "absolute",
              top: "44px",
              left: 0,
              width: "220px",
              background: "#0f172a",
              border: "1px solid #1e293b",
              borderRadius: "8px",
              padding: "8px",
              zIndex: 9999,
              boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
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
                  color: "#e5e7eb",
                  background:
                    o.id == activeOrgId ? "#1e293b" : "transparent",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "14px",
                  marginBottom: "4px",
                }}
              >
                {o.name}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SIGN OUT */}
      <button
        onClick={handleLogout}
        style={{
          padding: "8px 16px",
          background: "#222",
          color: "#fff",
          borderRadius: "4px",
          border: "none",
          cursor: "pointer",
          fontSize: "14px",
          fontWeight: 500,
        }}
      >
        Sign Out
      </button>
    </div>
  );
}
