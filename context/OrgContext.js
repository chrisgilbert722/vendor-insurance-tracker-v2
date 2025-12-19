// context/OrgContext.js
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const OrgContext = createContext(null);

export function OrgProvider({ children }) {
  const [orgs, setOrgs] = useState([]);
  const [activeOrg, setActiveOrg] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;
        if (!user) return;

        const { data, error } = await supabase
          .from("organization_members")
          .select("org:org_id (id, name, external_uuid)")
          .eq("user_id", user.id);

        if (error) throw error;

        const orgList = (data || [])
          .map((r) => r.org)
          .filter(Boolean);

        if (!cancelled) {
          setOrgs(orgList);

          // 🔑 AUTO-SELECT FIRST ORG
          if (!activeOrg && orgList.length > 0) {
            setActiveOrg(orgList[0]);
          }
        }
      } catch (err) {
        console.error("[OrgContext] load error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => (cancelled = true);
  }, []);

  return (
    <OrgContext.Provider
      value={{
        orgs,
        activeOrg,
        activeOrgId: activeOrg?.id || null,
        setActiveOrg,
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
