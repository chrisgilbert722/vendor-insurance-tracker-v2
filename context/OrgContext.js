// context/OrgContext.js
import { createContext, useContext, useEffect, useState, useMemo } from "react";
import { supabase } from "../lib/supabaseClient";

const OrgContext = createContext(null);

export function OrgProvider({ children }) {
  const [orgs, setOrgs] = useState([]);
  const [activeOrgId, setActiveOrgId] = useState(null); // INT (internal)
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadOrgs() {
      try {
        setLoading(true);

        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData?.session;

        if (!session) {
          if (!cancelled) {
            setOrgs([]);
            setActiveOrgId(null);
            setLoading(false);
          }
          return;
        }

        const res = await fetch("/api/orgs/for-user", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        const json = await res.json();
        if (!json.ok) throw new Error(json.error || "Failed to load orgs");

        if (cancelled) return;

        const loadedOrgs = json.orgs || [];
        setOrgs(loadedOrgs);

        // Default org selection (INT)
        if (!activeOrgId && loadedOrgs.length > 0) {
          setActiveOrgId(loadedOrgs[0].id);
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

  // 🔑 Canonical UUID (PUBLIC ID)
  const activeOrgUuid = activeOrg?.external_uuid || null;

  return (
    <OrgContext.Provider
      value={{
        // collections
        orgs,

        // active org
        activeOrg,          // full object
        activeOrgId,        // INT (internal)
        activeOrgUuid,      // UUID (public / canonical)

        // setters
        setActiveOrgId,

        // state
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
