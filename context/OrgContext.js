import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const OrgContext = createContext(null);

export function OrgProvider({ children }) {
  const [orgs, setOrgs] = useState([]);
  const [activeOrgId, setActiveOrgId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { data: session } = await supabase.auth.getSession();
        const user = session?.session?.user;
        if (!user) return;

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

        const cleaned = (data || [])
          .map(r => r.organizations)
          .filter(Boolean);

        if (!cancelled) {
          setOrgs(cleaned);
          if (!activeOrgId && cleaned.length > 0) {
            setActiveOrgId(cleaned[0].id);
          }
        }
      } catch (e) {
        console.error("[OrgContext] load error:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <OrgContext.Provider
      value={{
        orgs,
        activeOrgId,
        setActiveOrgId,
        loading,
      }}
    >
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  return useContext(OrgContext);
}
