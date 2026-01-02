// context/OrgContext.js — RECOVERY SAFE (NO LOOPS, NO REDIRECTS)

import { createContext, useContext, useEffect, useState, useMemo } from "react";
import { supabase } from "../lib/supabaseClient";

const OrgContext = createContext(null);

export function OrgProvider({ children }) {
  const [orgs, setOrgs] = useState([]);
  const [activeOrgId, setActiveOrgId] = useState(null); // INT (internal)
  const [loading, setLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadOrgs() {
      try {
        setLoading(true);

        // 🔑 Cookie-based session (source of truth)
        const { data } = await supabase.auth.getSession();
        const session = data?.session;

        if (!session) {
          if (!cancelled) {
            setHasSession(false);
            setOrgs([]);
            setActiveOrgId(null);
          }
          return;
        }

        setHasSession(true);

        // 🔑 SINGLE SOURCE OF TRUTH — backend resolves orgs
        const res = await fetch("/api/orgs/for-user", {
          credentials: "include",
        });

        const json = await res.json();

        // Fail-open: never brick UI
        if (!json?.ok) {
          if (!cancelled) {
            setOrgs([]);
            setActiveOrgId(null);
          }
          return;
        }

        if (cancelled) return;

        const loadedOrgs = json.orgs || [];
        setOrgs(loadedOrgs);

        // Auto-select first org if none selected
        if (!activeOrgId && loadedOrgs.length > 0) {
          setActiveOrgId(loadedOrgs[0].id);
        }
      } catch (err) {
        console.error("[OrgContext] loadOrgs error:", err);
        if (!cancelled) {
          setOrgs([]);
          setActiveOrgId(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadOrgs();
    return () => {
      cancelled = true;
    };
  }, []); // 🚫 DO NOT add activeOrgId here (prevents loops)

  // 🔑 Canonical active org object
  const activeOrg = useMemo(
    () => orgs.find((o) => o.id === activeOrgId) || null,
    [orgs, activeOrgId]
  );

  // 🔑 Canonical UUID (PUBLIC, used by onboarding)
  const activeOrgUuid = activeOrg?.external_uuid || null;

  return (
    <OrgContext.Provider
      value={{
        // collections
        orgs,

        // active org
        activeOrg,      // full object
        activeOrgId,    // INT
        activeOrgUuid,  // UUID

        // setters
        setActiveOrgId,

        // state
        loading,
        hasSession,
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
