// context/OrgContext.js
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const OrgContext = createContext(null);

export function OrgProvider({ children }) {
  const [orgs, setOrgs] = useState([]);
  const [activeOrgId, setActiveOrgId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load orgs for logged-in user
  useEffect(() => {
    let cancelled = false;

    async function loadOrgs() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;
        if (!user) return;

        const { data, error } = await supabase
          .from("org_members")
          .select("org_id, orgs:org_id (id, name)")
          .eq("user_id", user.id);

        if (error) throw error;

        const uniqueOrgs = (data || [])
          .map((r) => r.orgs)
          .filter(Boolean);

        if (!cancelled) {
          setOrgs(uniqueOrgs);

          // ✅ CRITICAL: auto-select first org if none selected
          if (!activeOrgId && uniqueOrgs.length > 0) {
            setActiveOrgId(uniqueOrgs[0].id);
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

  const value = {
    orgs,
    activeOrgId,
    setActiveOrgId,
    loading,
    onboardingComplete: true, // you’re past onboarding now
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
