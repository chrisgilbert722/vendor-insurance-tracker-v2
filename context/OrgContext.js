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

        const orgList = (data || [])
          .map((r) => r.organizations)
          .filter(Boolean);

        if (!cancelled) {
          setOrgs(orgList);

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

    loadOrgs();
    return () => (cancelled = true);
  }, []);

  return (
    <OrgContext.Provider
      value={{
        orgs,
        activeOrg,
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
