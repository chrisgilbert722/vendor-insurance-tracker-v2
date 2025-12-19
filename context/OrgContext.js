// context/OrgContext.js — FINAL STABLE VERSION (SINGLE useOrg)

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
        setLoading(true);

        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;
        if (!user) return;

        const { data, error } = await supabase
          .from("organization_members")
          .select("orgs:org_id (id, name, external_uuid)")
          .eq("user_id", user.id);

        if (error) throw error;

        const list = (data || [])
          .map((r) => r.orgs)
          .filter(Boolean);

        if (!cancelled) {
          setOrgs(list);
          if (!activeOrg && list.length > 0) {
            setActiveOrg(list[0]); // auto-select first org
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
