import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

const OrgContext = createContext(null);

export function OrgProvider({ children }) {
  const [orgs, setOrgs] = useState([]);
  const [activeOrgId, setActiveOrgId] = useState(null);
  const [loadingOrgs, setLoadingOrgs] = useState(true);

  useEffect(() => {
    async function load() {
      // 1. Load Supabase user session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        console.warn("No Supabase session found");
        setLoadingOrgs(false);
        return;
      }

      // 2. Load orgs using NEON-based API
      const res = await fetch("/api/org/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: session.user.id }),
      });

      const data = await res.json();

      if (data.ok) {
        setOrgs(data.orgs);

        // 3. ALWAYS use first org from DB, ignore ANY old cookies forever
        const newActiveOrgId = data.orgs[0]?.id || null;
        setActiveOrgId(newActiveOrgId);

        // 4. DELETE any corrupted cookie immediately
        document.cookie =
          "activeOrgId=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
      }

      setLoadingOrgs(false);
    }

    load();
  }, []);

  async function switchOrg(id) {
    setActiveOrgId(id);

    // After removing cookie logic permanently,
    // we still update the backend (Neon) active org if needed
    await fetch("/api/org/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId: id }),
    });
  }

  return (
    <OrgContext.Provider
      value={{ orgs, activeOrgId, switchOrg, loadingOrgs }}
    >
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  return useContext(OrgContext);
}
