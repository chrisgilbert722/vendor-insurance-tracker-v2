// context/OrgContext.js
import { createContext, useContext, useEffect, useState } from "react";
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
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;
        if (!user) return;

        const { data, error } = await supabase
          .from("organization_members")
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

        const cleanOrgs = (data || [])
          .map((r) => r.organizations)
          .filter(Boolean);

        if (!cancelled) {
          setOrgs(cleanOrgs);

          // Auto-select first org if none selected
          if (!activeOrgId && cleanOrgs.length > 0) {
            setActiveOrgId(cleanOrgs[0].id);
          }
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
    activeOrgId,
    setActiveOrgId,
    loading,
  };

  return (
    <OrgContext.Provider value={value}>
      {children}
    </OrgContext.Provider>
  );
}

/**
 * ✅ SINGLE export — THIS WAS THE BUG
 */
export function useOrg() {
  return useContext(OrgContext);
}
