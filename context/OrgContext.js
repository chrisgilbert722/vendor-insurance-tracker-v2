// context/OrgContext.js — STABLE DEFAULT (Fixes React 310)
import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

// 🚨 Provide a FULL default shape, never null
const OrgContext = createContext({
  orgs: [],
  activeOrgId: null,
  loadingOrgs: true,
  switchOrg: () => {}
});

export function OrgProvider({ children }) {
  const [orgs, setOrgs] = useState([]);
  const [activeOrgId, setActiveOrgId] = useState(null);
  const [loadingOrgs, setLoadingOrgs] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        let {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          const {
            data: { user },
          } = await supabase.auth.getUser();
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

        if (data.ok) {
          setOrgs(data.orgs);
          setActiveOrgId(data.orgs[0]?.id || null);
        }
      } catch (err) {
        console.error("[OrgContext] Error loading orgs", err);
      } finally {
        setLoadingOrgs(false);
      }
    }

    load();
  }, []);

  async function switchOrg(id) {
    setActiveOrgId(id);

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
        loadingOrgs,
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
