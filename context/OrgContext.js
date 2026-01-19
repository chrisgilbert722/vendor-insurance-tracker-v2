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

// ✅ HYDRATE FROM LOCALSTORAGE (SSR-SAFE)
function getInitialUuid() {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(ACTIVE_ORG_UUID_KEY) || null;
  } catch {
    return null;
  }
}

function getInitialId() {
  if (typeof window === "undefined") return null;
  try {
    const val = localStorage.getItem(ACTIVE_ORG_ID_KEY);
    return val ? Number(val) : null;
  } catch {
    return null;
  }
}

export function OrgProvider({ children }) {
  const [orgs, setOrgs] = useState([]);

  // ✅ HYDRATE FROM LOCALSTORAGE IMMEDIATELY (no flash of null)
  const [activeOrgId, setActiveOrgId] = useState(getInitialId);
  const [activeOrgUuid, setActiveOrgUuid] = useState(getInitialUuid);
  const [loading, setLoading] = useState(true);

  /* -------------------------------------------------
     SINGLE SOURCE OF TRUTH — ACTIVATE ORG

     🔧 FIX: Also add org to orgs array if not present
     This ensures orgs/activeOrg stay in sync
  -------------------------------------------------- */
  function activateOrg(org) {
    if (!org) {
      // Only clear if explicitly passed null
      setActiveOrgId(null);
      setActiveOrgUuid(null);
      try {
        localStorage.removeItem(ACTIVE_ORG_ID_KEY);
        localStorage.removeItem(ACTIVE_ORG_UUID_KEY);
      } catch {}
      return;
    }

    const id = pickId(org);
    const uuid = pickUuid(org);

    // ✅ SET STATE IMMEDIATELY
    setActiveOrgId(id);
    setActiveOrgUuid(uuid);

    // ✅ ADD ORG TO ARRAY IF NOT PRESENT (prevents state desync)
    if (id) {
      setOrgs((prev) => {
        const exists = prev.some((o) => pickId(o) === id);
        if (exists) return prev;
        return [...prev, org];
      });
    }

    // ✅ PERSIST TO LOCALSTORAGE
    try {
      if (id) localStorage.setItem(ACTIVE_ORG_ID_KEY, String(id));
      if (uuid) localStorage.setItem(ACTIVE_ORG_UUID_KEY, uuid);
    } catch {}
  }

  /* -------------------------------------------------
     LOAD ORGS (AUTHORITATIVE)

     🔧 FIX: Preserve activeOrgUuid if already set
     (e.g., from localStorage or prior activateOrg call)
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

        // ✅ FIX: Only activate if we found an org
        // If no org found but activeOrgUuid is already set (from prior creation),
        // DO NOT overwrite it with null
        if (resolvedOrg) {
          activateOrg(resolvedOrg);
        } else if (loadedOrgs.length === 0) {
          // No orgs exist — leave activeOrgUuid alone if already set
          // This handles the case where org was just created but API hasn't synced
          // We only clear if there truly are no orgs and no prior state
          const currentUuid = localStorage.getItem(ACTIVE_ORG_UUID_KEY);
          if (!currentUuid) {
            setActiveOrgId(null);
            setActiveOrgUuid(null);
          }
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

        // ✅ public setter (used by org switcher and ai-wizard)
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
