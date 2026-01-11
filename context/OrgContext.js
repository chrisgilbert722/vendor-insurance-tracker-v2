import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const OrgContext = createContext(null);

export function OrgProvider({ children }) {
  const [orgs, setOrgs] = useState([]);
  const [activeOrgId, setActiveOrgId] = useState(null); // external_uuid (STRING)
  const [loading, setLoading] = useState(true);

  /* -------------------------------------------------
     LOAD ORGS FOR USER
  -------------------------------------------------- */
  useEffect(() => {
    let cancelled = false;

    async function loadOrgs() {
      try {
        setLoading(true);

        // 🔑 ALWAYS read Supabase session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          if (!cancelled) {
            setOrgs([]);
            setActiveOrgId(null);
            setLoading(false);
          }
          return;
        }

        const res = await fetch("/api/orgs/for-user", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!res.ok) {
          console.warn("[OrgContext] org fetch failed:", res.status);
          if (!cancelled) {
            setOrgs([]);
            setActiveOrgId(null);
            setLoading(false);
          }
          return;
        }

        const json = await res.json();
        if (!json?.ok) {
          if (!cancelled) {
            setOrgs([]);
            setActiveOrgId(null);
            setLoading(false);
          }
          return;
        }

        if (cancelled) return;

        const loadedOrgs = json.orgs || [];
        setOrgs(loadedOrgs);

        // 🔒 AUTO-SELECT IF ONLY ONE ORG
        if (loadedOrgs.length === 1) {
          const onlyOrg =
            loadedOrgs[0].external_uuid ||
            loadedOrgs[0].externalUuid ||
            loadedOrgs[0].uuid ||
            null;

          setActiveOrgId(onlyOrg);
        }
      } catch (err) {
        console.error("[OrgContext] load error:", err);
        if (!cancelled) {
          setOrgs([]);
          setActiveOrgId(null);
        }
      } finally {
        if (!cancelled) {
          // ⚠️ IMPORTANT:
          // Only stop loading AFTER org auto-selection logic has run
          setLoading(false);
        }
      }
    }

    loadOrgs();
    return () => {
      cancelled = true;
    };
  }, []);

  /* -------------------------------------------------
     DERIVED ACTIVE ORG (UUID SAFE)
  -------------------------------------------------- */
  const activeOrg = useMemo(() => {
    if (!activeOrgId) return null;
    return (
      orgs.find(
        (o) =>
          o.external_uuid === activeOrgId ||
          o.externalUuid === activeOrgId ||
          o.uuid === activeOrgId
      ) || null
    );
  }, [orgs, activeOrgId]);

  return (
    <OrgContext.Provider
      value={{
        // collections
        orgs,

        // active org
        activeOrg,
        activeOrgId, // external_uuid

        // canonical UUID alias (used by ai-wizard)
        activeOrgUuid: activeOrgId,

        // setters
        setActiveOrgId,

        // state
        loading,
      }}
    >
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) {
    throw new Error("useOrg must be used within OrgProvider");
  }
  return ctx;
}
