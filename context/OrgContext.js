// context/OrgContext.js
import { createContext, useContext, useEffect, useState, useMemo } from "react";
import { supabase } from "../lib/supabaseClient";

const OrgContext = createContext(null);

export function OrgProvider({ children }) {
  const [orgs, setOrgs] = useState([]);
  const [activeOrgId, setActiveOrgId] = useState(null); // INT
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadOrgs() {
      try {
        setLoading(true);

        // 🔐 Cookie-based session (single source of truth)
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          if (!cancelled) {
            setOrgs([]);
            setActiveOrgId(null);
          }
          return;
        }

        // ✅ COOKIE AUTH — NO AUTH HEADER
        const res = await fetch("/api/orgs/for-user", {
          credentials: "include",
        });

        if (!res.ok) {
          console.warn("[OrgContext] org fetch failed:", res.status);
          if (!cancelled) {
            setOrgs([]);
            setActiveOrgId(null);
          }
          return;
        }

        const json = await res.json();
        if (!json?.ok) {
          if (!cancelled) {
            setOrgs([]);
            setActiveOrgId(null);
          }
          return;
        }

        if (cancelled) return;

        const loaded = json.orgs || [];
        setOrgs(loaded);

        // ✅ Default org selection (INT only)
        if (!activeOrgId && loaded.length > 0) {
          setActiveOrgId(loaded[0].id);
        }
      } catch (err) {
        console.error("[OrgContext] load error:", err);
        if (!cancelled) {
          setOrgs([]);
          setActiveOrgId(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadOrgs();
    return () => {
      cancelled = true;
    };
  }, []);

  // 🔑 Canonical active org object
  const activeOrg = useMemo(
    () => orgs.find((o) => o.id === activeOrgId) || null,
    [orgs, activeOrgId]
  );

  // 🔑 Canonical UUID (PUBLIC)
  const activeOrgUuid = activeOrg?.external_uuid || null;

  return (
    <OrgContext.Provider
      value={{
        orgs,
        activeOrg,
        activeOrgId,
        activeOrgUuid,
        setActiveOrgId,
        loading,
      }}
    >
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) {
    throw new Error("useOrg must be used within OrgProvider");
  }
  return ctx;
}
