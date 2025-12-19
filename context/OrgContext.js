// context/OrgContext.js — SINGLE SOURCE OF TRUTH

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
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;
        if (!user) return;

        const { data, error } = await supabase
          .from("organization_members")
          .select("org_id, organizations:org_id (id, name)")
          .eq("user_id", user.id);

        if (error) throw error;

        const list = (data || [])
          .map((r) => r.organizations)
          .filter(Boolean);

        if (!cancelled) {
          setOrgs(list);
          if (!activeOrgId && list.length > 0) {
            setActiveOrgId(list[0].id);
          }
        }
      } catch (e) {
        console.error("[OrgContext] load error", e);
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


export function useOrg() {
  return useContext(OrgContext);
}
