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
        setLoading(true);

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session?.user) {
          if (!cancelled) setLoading(false);
          return;
        }

        const userId = session.user.id;

        const { data, error } = await supabase
          .from("organization_members")
          .select(
            `
            org_id,
            role,
            organizations:org_id (
              id,
              name,
              external_uuid
            )
          `
          )
          .eq("user_id", userId);

        if (error) throw error;

        const normalized = (data || [])
          .map((r) => r.organizations)
          .filter(Boolean);

        if (cancelled) return;

        setOrgs(normalized);

        // ✅ Always auto-select first org if none selected
        if (!activeOrgId && normalized.length > 0) {
          setActiveOrgId(normalized[0].id);
          setActiveOrg(normalized[0]);
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

  // 🔁 Keep activeOrg in sync with activeOrgId
  useEffect(() => {
    if (!activeOrgId || orgs.length === 0) {
      setActiveOrg(null);
      return;
    }

    const found = orgs.find((o) => o.id === activeOrgId) || null;
    setActiveOrg(found);
  }, [activeOrgId, orgs]);

  const value = {
    orgs,
    activeOrgId,
    setActiveOrgId,
    activeOrg,
    loading,
  };

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) {
    throw new Error("useOrg must be used within OrgProvider");
  }
  return ctx;
}
