import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const OrgContext = createContext(null);

const ACTIVE_ORG_KEY = "verivo:activeOrgUuid";

function pickUuid(org) {
  return (
    org?.external_uuid ||
    org?.externalUuid ||
    org?.uuid ||
    null
  );
}

export function OrgProvider({ children }) {
  const [orgs, setOrgs] = useState([]);
  const [activeOrgId, setActiveOrgId] = useState(null); // external_uuid (STRING)
  const [loading, setLoading] = useState(true);

  /* -------------------------------------------------
     RESTORE ACTIVE ORG FROM STORAGE (ONCE)
  -------------------------------------------------- */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(ACTIVE_ORG_KEY);
      if (saved) setActiveOrgId(saved);
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -------------------------------------------------
     PERSIST ACTIVE ORG TO STORAGE
  -------------------------------------------------- */
  useEffect(() => {
    try {
      if (activeOrgId) localStorage.setItem(ACTIVE_ORG_KEY, activeOrgId);
    } catch {
      // ignore
    }
  }, [activeOrgId]);

  /* -------------------------------------------------
     LOAD ORGS FOR USER (SAFE, NEVER BRICKS UI)
  -------------------------------------------------- */
  useEffect(() => {
    let cancelled = false;

    async function loadOrgs() {
      try {
        setLoading(true);

        const {
          data: { session },
        } = await supabase.auth.getSession();

        // If session not ready, fail-open: keep previous org state, just stop loading
        if (!session?.access_token) {
          if (!cancelled) setLoading(false);
          return;
        }

        const res = await fetch("/api/orgs/for-user", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        // If fetch fails, fail-open: keep previous org state
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

        // --- Resolve active org deterministically ---
        const saved = (() => {
          try {
            return localStorage.getItem(ACTIVE_ORG_KEY);
          } catch {
            return null;
          }
        })();

        // helper: is a uuid present in org list
        const hasUuid = (uuid) =>
          Boolean(uuid) &&
          loadedOrgs.some((o) => pickUuid(o) === uuid);

        // 1) Keep current if still valid
        if (hasUuid(activeOrgId)) {
          // keep it
        }
        // 2) Use saved if valid
        else if (hasUuid(saved)) {
          setActiveOrgId(saved);
        }
        // 3) Only one org? auto-select it
        else if (loadedOrgs.length === 1) {
          setActiveOrgId(pickUuid(loadedOrgs[0]));
        }
        // 4) Multiple orgs and none selected? pick first to avoid blank UI
        else if (loadedOrgs.length > 0) {
          setActiveOrgId(pickUuid(loadedOrgs[0]));
        } else {
          // No orgs returned: keep null
          setActiveOrgId(null);
          try {
            localStorage.removeItem(ACTIVE_ORG_KEY);
          } catch {}
        }
      } catch (err) {
        console.error("[OrgContext] load error:", err);
        // Fail-open: keep previous org state; just stop loading
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadOrgs();

    return () => {
      cancelled = true;
    };
  }, []); // run once

  /* -------------------------------------------------
     DERIVED ACTIVE ORG
  -------------------------------------------------- */
  const activeOrg = useMemo(() => {
    if (!activeOrgId) return null;
    return orgs.find((o) => pickUuid(o) === activeOrgId) || null;
  }, [orgs, activeOrgId]);

  return (
    <OrgContext.Provider
      value={{
        orgs,

        activeOrg,
        activeOrgId, // external_uuid

        // canonical alias used by ai-wizard.js
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
