// context/OrgContext.js
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const OrgContext = createContext(null);

export function OrgProvider({ children }) {
  const [orgs, setOrgs] = useState([]);
  const [activeOrgId, setActiveOrgId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrgs() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setLoading(false);
        return;
      }

      // ✅ Fetch orgs user belongs to
      const { data, error } = await supabase
        .from("org_members")
        .select("org_id, orgs(name)")
        .eq("user_id", session.user.id);

      if (error) {
        console.error("[OrgContext] Failed to load orgs", error);
        setLoading(false);
        return;
      }

      const mapped = data.map((row) => ({
        id: row.org_id,
        name: row.orgs?.name || "Organization",
      }));

      setOrgs(mapped);

      // ✅ AUTO-SELECT FIRST ORG (CRITICAL FIX)
      if (mapped.length > 0) {
        setActiveOrgId(mapped[0].id);
      }

      setLoading(false);
    }

    loadOrgs();
  }, []);

  return (
    <OrgContext.Provider
      value={{
        orgs,
        activeOrgId,
        setActiveOrgId,
        loading,
        onboardingComplete: true,
      }}
    >
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  return useContext(OrgContext);
}
