import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const OrgContext = createContext(null);

// ✅ EXPLICIT STORAGE KEYS
const ACTIVE_ORG_ID_KEY = "verivo:activeOrgId";       // internal int
const ACTIVE_ORG_UUID_KEY = "verivo:activeOrgUuid";   // external uuid

function pickUuid(org) {
  return org?.external_uuid || org?.externalUuid || org?.uuid || null;
}

function pickId(org) {
  return typeof org?.id === "number" ? org.id : null;
}

export function OrgProvider({ children }) {
  const [orgs, setOrgs] = useState([]);
  const [activeOrgId, setActiveOrgId] = useState(null);       // ✅ INTERNAL INT
  const [activeOrgUuid, setActiveOrgUuid] = useState(null);   // ✅ UUID
  const [loading, setLoading] = useState(true);

  /* -------------------------------------------------
     SINGLE SOURCE OF TRUTH — ACTIVATE ORG
  -------------------------------------------------- */
  function activateOrg(org) {
    const id = pickId(org);
    const uuid = pickUuid(org);

    setActiveOrgId(id || null);
    setActiveOrgUuid(uuid || null);

    try {
      if (id) localStorage.setItem(ACTIVE_ORG_ID_KEY, String(id));
      else localStorage.removeItem(ACTIVE_ORG_ID_KEY);

      if (uuid) localStorage.setItem(ACTIVE_ORG_UUID_KEY, uuid);
      else localStorage.removeItem(ACTIVE_ORG_UUID_KEY);
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
        if (!json?.ok || !Array.isArray(json.orgs)) {
          if (!cancelled) setLoading(false);
          return;
        }

        if (cancelled) return;

        const loadedOrgs = json.orgs;
        setOrgs(loadedOrgs);

        // ---- resolve active org ----
        let savedId = null;
        let savedUuid = null;

        try {
          savedId = Number(localStorage.getItem(ACTIVE_ORG_ID_KEY)) || null;
          savedUuid = localStorage.getItem(ACTIVE_ORG_UUID_KEY);
        } catch {}

        let resolvedOrg = null;

        if (loadedOrgs.length === 1) {
          resolvedOrg = loadedOrgs[0];
        } else if (savedId) {
          resolvedOrg = loadedOrgs.find((o) => pickId(o) === savedId);
        } else if (savedUuid) {
          resolvedOrg = loadedOrgs.find((o) => pickUuid(o) === savedUuid);
        } else if (loadedOrgs.length > 0) {
          resolvedOrg = loadedOrgs[0];
        }

        activateOrg(resolvedOrg);
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
    if (!orgs.length || !activeOrgId) return null;
    return orgs.find((o) => pickId(o) === activeOrgId) || null;
  }, [orgs, activeOrgId]);

  return (
    <OrgContext.Provider
      value={{
        orgs,

        // ✅ canonical values
        activeOrg,
        activeOrgId,       // INTERNAL INTEGER (Neon)
        activeOrgUuid,     // EXTERNAL UUID

        // ✅ public setter (used by org switcher)
        setActiveOrg: activateOrg,

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
