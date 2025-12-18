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

        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;
        if (!user) return;

        // ✅ FIX: correct relation name = organizations
        const { data, error } = await supabase
          .from("org_members")
          .select(
            `
            org_id,
            organizations:org_id (
              id,
              name,
              external_uuid
            )
          `
          )
          .eq("user_id", user.id);

        if (error) throw error;

        const uniqueOrgs = (data || [])
          .map((r) => r.organizations)
          .filter(Boolean);

        if (!cancelled) {
          setOrgs(uniqueOrgs);

          if (!activeOrgId && uniqueOrgs.length > 0) {
            setActiveOrgId(uniqueOrgs[0].id);
          }
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
    return () => (cancelled = true);
  }, []);

  const activeOrg = useMemo(() => {
    return orgs.find((o) => o.id === activeOrgId) || null;
  }, [orgs, activeOrgId]);

  const value = {
    orgs,
    activeOrg,
    activeOrgId,
    setActiveOrgId,
    loading,
    onboardingComplete: true,
  };

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrg() {
  return useContext(OrgContext);
}
