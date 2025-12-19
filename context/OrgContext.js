// context/OrgContext.js
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const OrgContext = createContext(null);

export function OrgProvider({ children }) {
  const [orgs, setOrgs] = useState([]);
  const [activeOrgId, setActiveOrgId] = useState(null);
  const [activeOrg, setActiveOrg] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadOrgs() {
      try {
        setLoading(true);

        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;
        if (!user) return;

        // 🔑 Load org membership + org metadata
        const { data, error } = await supabase
          .from("organization_members")
          .select(`
            org_id,
            organizations:org_id (
              id,
              name,
              external_uuid
            )
          `)
          .eq("user_id", user.id);

        if (error) throw error;

        const resolvedOrgs = (data || [])
          .map((r) => r.organizations)
          .filter(Boolean);

        if (cancelled) return;

        setOrgs(resolvedOrgs);

        // Auto-select first org if none selected
        if (!activeOrgId && resolvedOrgs.length > 0) {
          setActiveOrgId(resolvedOrgs[0].id);
          setActiveOrg(resolvedOrgs[0]);
        }
      } catch (err) {
        console.error("[OrgContext] load error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadOrgs();
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep activeOrg in sync
  useEffect(() => {
    if (!activeOrgId) {
      setActiveOrg(null);
      return;
    }

    const found = orgs.find((o) => o.id === activeOrgId);
    setActiveOrg(found || null);
  }, [activeOrgId, orgs]);

  return (
    <OrgContext.Provider
      value={{
        orgs,
        activeOrgId,
        activeOrg,        // ✅ THIS FIXES EVERYTHING
        setActiveOrgId,
        loadingOrgs: loading,
      }}
    >
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  return useContext(OrgContext);
}
