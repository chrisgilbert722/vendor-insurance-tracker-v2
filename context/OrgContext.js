// context/OrgContext.js
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const OrgContext = createContext(null);

export function OrgProvider({ children }) {
  const [orgs, setOrgs] = useState([]);
  const [activeOrgId, setActiveOrgId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadOrgs() {
      try {
        setLoading(true);

        const { data } = await supabase.auth.getSession();
        if (!data?.session) {
          setOrgs([]);
          setActiveOrgId(null);
          setLoading(false);
          return;
        }

        // 🔑 COOKIE AUTH — NO AUTH HEADER
        const res = await fetch("/api/orgs/for-user", {
          credentials: "include",
        });

        if (!res.ok) {
          console.warn("[OrgContext] org fetch failed", res.status);
          setOrgs([]);
          setActiveOrgId(null);
          setLoading(false);
          return;
        }

        const json = await res.json();
        if (!json.ok) {
          setOrgs([]);
          setActiveOrgId(null);
          setLoading(false);
          return;
        }

        if (cancelled) return;

        setOrgs(json.orgs || []);

        if (!activeOrgId && json.orgs?.length) {
          setActiveOrgId(json.orgs[0].id);
        }
      } catch (err) {
        console.error("[OrgContext] load error", err);
        setOrgs([]);
        setActiveOrgId(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadOrgs();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeOrg = useMemo(
    () => orgs.find((o) => o.id === activeOrgId) || null,
    [orgs, activeOrgId]
  );

  return (
    <OrgContext.Provider
      value={{
        orgs,
        activeOrg,
        activeOrgId,
        activeOrgUuid: activeOrg?.external_uuid || null,
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
  if (!ctx) throw new Error("useOrg must be used within OrgProvider");
  return ctx;
}
