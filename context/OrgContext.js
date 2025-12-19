import { createContext, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const OrgContext = createContext(null);

export function OrgProvider({ children }) {
  const [orgs, setOrgs] = useState([]);
  const [activeOrg, setActiveOrg] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🔒 prevents re-running + wiping state
  const loadedOnce = useRef(false);

  useEffect(() => {
    if (loadedOnce.current) return;
    loadedOnce.current = true;

    async function loadOrgs() {
      try {
        const { data: sessionData, error: sessionErr } =
          await supabase.auth.getSession();

        if (sessionErr) throw sessionErr;

        const user = sessionData?.session?.user;
        if (!user) return;

        const { data, error } = await supabase
          .from("organization_members")
          .select(`
            role,
            organizations (
              id,
              name,
              external_uuid
            )
          `)
          .eq("user_id", user.id);

        if (error) throw error;

        const mapped = (data || [])
          .filter(r => r.organizations)
          .map(r => ({
            ...r.organizations,
            role: r.role,
          }));

        setOrgs(mapped);

        // ✅ FORCE an active org if missing
        if (!activeOrg && mapped.length > 0) {
          setActiveOrg(mapped[0]);
        }
      } catch (err) {
        console.error("[OrgContext] FAILED:", err);
      } finally {
        setLoading(false);
      }
    }

    loadOrgs();
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
