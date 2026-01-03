import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const OrgContext = createContext(null);

export function OrgProvider({ children }) {
  const [orgs, setOrgs] = useState([]);
  const [activeOrgId, setActiveOrgId] = useState(null); // internal INT
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadOrgs() {
      try {
        setLoading(true);

        // 🔑 ALWAYS read the Supabase session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        // Not logged in
        if (!session?.access_token) {
          if (!cancelled) {
            setOrgs([]);
            setActiveOrgId(null);
            setLoading(false);
          }
          return;
        }

        // 🔐 AUTH HEADER — REQUIRED
        const res = await fetch("/api/orgs/for-user", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!res.ok) {
          console.warn("[OrgContext] org fetch failed:", res.status);
          if (!cancelled) {
            setOrgs([]);
            setActiveOrgId(null);
            setLoading(false);
          }
          return;
        }

        const json = await res.json();
        if (!json.ok) {
          if (!cancelled) {
            setOrgs([]);
            setActiveOrgId(null);
            setLoading(false);
          }
          return;
        }

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

  // Canonical active org object
  const activeOrg = useMemo(
    () => orgs.find((o) => o.id === activeOrgId) || null,
    [orgs, activeOrgId]
  );

  return (
    <OrgContext.Provider
      value={{
        // collections
        orgs,

        // active org
        activeOrg,
        activeOrgId, // internal INT

        // 🔑 PUBLIC UUID — SAFE AGAINST NAMING MISMATCHES
        activeOrgUuid:
          activeOrg?.external_uuid ||
          activeOrg?.externalUuid ||
          activeOrg?.uuid ||
          null,

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
