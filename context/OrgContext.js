import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const OrgContext = createContext(null);

export function OrgProvider({ children }) {
  const [orgs, setOrgs] = useState([]);
  const [activeOrg, setActiveOrg] = useState(null);
  const [activeOrgId, setActiveOrgId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadOrgs() {
      try {
        setLoading(true);

        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;
        if (!user) {
          setLoading(false);
          return;
        }

        // 🔑 CRITICAL JOIN (THIS WAS MISSING / BROKEN BEFORE)
        const { data, error } = await supabase
          .from("organization_members")
          .select(`
            role,
            orgs:org_id (
              id,
              name,
              external_uuid
            )
          `)
          .eq("user_id", user.id);

        if (error) throw error;

        const cleaned = (data || [])
          .map((r) => r.orgs)
          .filter(Boolean);

        if (cancelled) return;

        setOrgs(cleaned);

        // 🔑 AUTO-SELECT FIRST ORG (SIDEBAR DEPENDS ON THIS)
        if (cleaned.length > 0) {
          setActiveOrg(cleaned[0]);
          setActiveOrgId(cleaned[0].id);
        } else {
          setActiveOrg(null);
          setActiveOrgId(null);
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

  const value = {
    orgs,
    activeOrg,
    activeOrgId,
    setActiveOrg,
    setActiveOrgId,
    loading,
  };

  return (
    <OrgContext.Provider value={value}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  return useContext(OrgContext);
}
