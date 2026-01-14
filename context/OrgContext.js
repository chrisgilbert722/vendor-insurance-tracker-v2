import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const OrgContext = createContext(null);

const ACTIVE_ORG_KEY = "verivo:activeOrgUuid";

function pickUuid(org) {
  return org?.external_uuid || org?.externalUuid || org?.uuid || null;
}

export function OrgProvider({ children }) {
  const [orgs, setOrgs] = useState([]);
  const [activeOrgId, _setActiveOrgId] = useState(null);
  const [loading, setLoading] = useState(true);

  /* -------------------------------------------------
     SINGLE SOURCE OF TRUTH SETTER (CRITICAL)
  -------------------------------------------------- */
  function setActiveOrgId(uuid) {
    _setActiveOrgId(uuid);

    try {
      if (uuid) {
        localStorage.setItem(ACTIVE_ORG_KEY, uuid);
      } else {
        localStorage.removeItem(ACTIVE_ORG_KEY);
      }
    } catch {}
  }

  /* -------------------------------------------------
     LOAD ORGS (AUTHORITATIVE)
  -------------------------------------------------- */
  useEffect(() => {
    let cancelled = false;

    async function loadOrgs() {
      try {
        setLoading(true);

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          if (!cancelled) setLoading(false);
          return;
        }

        const res = await fetch("/api/orgs/for-user", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!res.ok) {
          console.warn("[OrgContext] org fetch failed:", res.status);
          if (!cancelled) setLoading(false);
          return;
        }

        const json = await res.json();
        if (!json?.ok) {
          if (!cancelled) setLoading(false);
          return;
        }

        if (cancelled) return;

        const loadedOrgs = Array.isArray(json.orgs) ? json.orgs : [];
        setOrgs(loadedOrgs);

        let resolvedOrgId = null;

        let saved = null;
        try {
          saved = localStorage.getItem(ACTIVE_ORG_KEY);
        } catch {}

        const hasUuid = (uuid) =>
          Boolean(uuid) && loadedOrgs.some((o) => pickUuid(o) === uuid);

        if (loadedOrgs.length === 1) {
          resolvedOrgId = pickUuid(loadedOrgs[0]);
        } else if (hasUuid(saved)) {
          resolvedOrgId = saved;
        } else if (loadedOrgs.length > 0) {
          resolvedOrgId = pickUuid(loadedOrgs[0]);
        }

        setActiveOrgId(resolvedOrgId);
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

  /* -------------------------------------------------
     DERIVED ACTIVE ORG (SAFE)
  -------------------------------------------------- */
  const activeOrg = useMemo(() => {
    if (!activeOrgId || !orgs.length) return null;
    return orgs.find((o) => pickUuid(o) === activeOrgId) || null;
  }, [orgs, activeOrgId]);

  return (
    <OrgContext.Provider
      value={{
        orgs,

        activeOrg,
        activeOrgId,
        activeOrgUuid: activeOrgId,

        setActiveOrgId,
        loading,
      }}
    >
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrg must be used within OrgProvider");
  return ctx;
}
