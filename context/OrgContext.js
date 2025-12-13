// context/OrgContext.js — SAFE, PERSISTENT, DASHBOARD-STABLE
import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

/*
  IMPORTANT DESIGN GOALS
  - Never return null context
  - Persist active org across reloads
  - Auto-select only if nothing stored
  - Never break dashboard or exports
*/

const OrgContext = createContext({
  orgs: [],
  activeOrgId: null,
  activeOrg: null,
  loadingOrgs: true,
  onboardingComplete: true,
  setOnboardingComplete: () => {},
  switchOrg: () => {},
});

export function OrgProvider({ children }) {
  const [orgs, setOrgs] = useState([]);
  const [activeOrgId, setActiveOrgId] = useState(null);
  const [activeOrg, setActiveOrg] = useState(null);
  const [loadingOrgs, setLoadingOrgs] = useState(true);

  // Global onboarding flag (unchanged behavior)
  const [onboardingComplete, setOnboardingComplete] = useState(true);

  /* ---------------------------------------------------------
     LOAD ORGS + RESTORE ACTIVE ORG
  --------------------------------------------------------- */
  useEffect(() => {
    async function load() {
      try {
        let { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) session = { user };
        }

        if (!session?.user?.id) {
          setLoadingOrgs(false);
          return;
        }

        const res = await fetch("/api/org/list", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: session.user.id }),
        });

        const data = await res.json();
        if (!data.ok) return;

        setOrgs(data.orgs);

        // 🔹 Restore persisted org
        const storedOrgId = localStorage.getItem("active_org_id");

        const resolvedOrg =
          data.orgs.find(o => String(o.id) === String(storedOrgId)) ||
          data.orgs[0] ||
          null;

        if (resolvedOrg) {
          setActiveOrgId(resolvedOrg.id);
          setActiveOrg(resolvedOrg);
          localStorage.setItem("active_org_id", resolvedOrg.id);
        }
      } catch (err) {
        console.error("[OrgContext] load error", err);
      } finally {
        setLoadingOrgs(false);
      }
    }

    load();
  }, []);

  /* ---------------------------------------------------------
     KEEP activeOrg IN SYNC
  --------------------------------------------------------- */
  useEffect(() => {
    if (!activeOrgId || orgs.length === 0) return;

    const found = orgs.find(o => String(o.id) === String(activeOrgId));
    if (found) setActiveOrg(found);
  }, [activeOrgId, orgs]);

  /* ---------------------------------------------------------
     SWITCH ORG (SAFE)
  --------------------------------------------------------- */
  async function switchOrg(id) {
    setActiveOrgId(id);
    localStorage.setItem("active_org_id", id);

    try {
      await fetch("/api/org/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: id }),
      });
    } catch (err) {
      console.error("[OrgContext] switchOrg failed", err);
    }
  }

  return (
    <OrgContext.Provider
      value={{
        orgs,
        activeOrgId,
        activeOrg,
        loadingOrgs,
        onboardingComplete,
        setOnboardingComplete,
        switchOrg,
      }}
    >
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  return useContext(OrgContext);
}
