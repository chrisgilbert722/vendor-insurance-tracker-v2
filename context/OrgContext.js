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
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;
        if (!user) return;

        const { data, error } = await supabase
          .from("organization_members")
          .select("org_id, organizations:org_id (*)")
          .eq("user_id", user.id);

        if (error) throw error;

        const loadedOrgs = (data || [])
          .map((r) => r.organizations)
          .filter(Boolean);

        if (cancelled) return;

        setOrgs(loadedOrgs);

        if (!activeOrgId && loadedOrgs.length > 0) {
          setActiveOrgId(loadedOrgs[0].id);
          setActiveOrg(loadedOrgs[0]);
        }
      } catch (err) {
        console.error("[OrgContext] load error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadOrgs();
    return () => (cancelled = true);
  }, []);

  // 🔁 Keep activeOrg in sync with activeOrgId
  useEffect(() => {
    if (!activeOrgId || orgs.length === 0) return;
    const found = orgs.find((o) => o.id === activeOrgId);
    if (found) setActiveOrg(found);
  }, [activeOrgId, orgs]);

  return (
    <OrgContext.Provider
      value={{
        orgs,
        activeOrgId,
        activeOrg,
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
