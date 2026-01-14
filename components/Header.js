// components/Header.js — HUD Strip V5 (Verivo Branded)
import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { CaretDown } from "@phosphor-icons/react";
import { useOrg } from "../context/OrgContext";
import { useRole } from "../lib/useRole";

export default function Header() {
  const [open, setOpen] = useState(false);

  // ✅ FIX: use setActiveOrg, NOT switchOrg
  const { orgs, activeOrgId, activeOrg, setActiveOrg, loading } = useOrg();
  const { isLoadingRole } = useRole();

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/auth/login";
  }

  const isLoading = loading || isLoadingRole;

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
        boxShadow: `
          0 2px 22px rgba(0,0,0,0.7),
          0 0 24px rgba(56,189,248,0.25)
        `,
      }}
    >
      {/* LEFT — LOGO + ORG SWITCHER */}
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        {/* Verivo Logo */}
        <img
          src="/brand/verivo-light.png"
          alt="verivo"
          style={{
            height: 38,
            width: "auto",
            display: "block",
            marginTop: 1,
          }}
        />

        {/* Org Switcher */}
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
              boxShadow: open
                ? "0 0 14px rgba(56,189,248,0.4)"
                : "0 0 0 rgba(0,0,0,0)",
              transition: "0.16s ease",
            }}
          >
            {isLoading ? "Loading…" : activeOrg?.name || "Select Organization"}
            <CaretDown size={14} />
          </button>

          {open && !isLoading && (
            <div
              style={{
                position: "absolute",
                top: "44px",
                left: 0,
                width: 240,
                background:
                  "radial-gradient(circle at top, rgba(15,23,42,0.98), rgba(15,23,42,0.94))",
                border: "1px solid rgba(51,65,85,0.95)",
                borderRadius: 10,
                padding: 10,
                boxShadow: `
                  0 12px 30px rgba(0,0,0,0.65),
                  0 0 24px rgba(56,189,248,0.3)
                `,
                zIndex: 9999,
              }}
            >
              {orgs.length === 0 && (
                <div
                  style={{
                    padding: 8,
                    color: "#94a3b8",
                    fontSize: 13,
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
                    // ✅ FIX: pass full org object
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
                    marginBottom: 6,
                    transition: "0.16s ease",
                  }}
                >
                  {o.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT — AI STATUS + SIGN OUT */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {/* AI Status */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "4px 10px",
            borderRadius: 999,
            border: "1px solid rgba(34,197,94,0.5)",
            background:
              "radial-gradient(circle at 0% 0%, rgba(34,197,94,0.4), rgba(15,23,42,0.9))",
            fontSize: 11,
            color: "#bbf7d0",
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "999px",
              background:
                "radial-gradient(circle at 50% 50%, #4ade80, #22c55e, #15803d)",
              boxShadow: "0 0 12px rgba(34,197,94,0.8)",
            }}
          />
          <span style={{ textTransform: "uppercase", letterSpacing: "0.1em" }}>
            AI Online
          </span>
        </div>

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
            transition: "0.16s ease",
          }}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
