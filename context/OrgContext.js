import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

const OrgContext = createContext(null);

export function OrgProvider({ children }) {
  const [orgs, setOrgs] = useState([]);
  const [activeOrgId, setActiveOrgId] = useState(null);
  const [loadingOrgs, setLoadingOrgs] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch("/api/org/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: session.user.id }),
      });

      const data = await res.json();
      if (data.ok) {
        setOrgs(data.orgs);

        // Set active org from cookie or fallback to first one
        const cookieOrgId =
          document.cookie
            .split("; ")
            .find((r) => r.startsWith("activeOrgId="))
            ?.split("=")[1];

        setActiveOrgId(cookieOrgId || (data.orgs[0]?.id || null));
      }
      setLoadingOrgs(false);
    }

    load();
  }, []);

  async function switchOrg(id) {
    setActiveOrgId(id);

    await fetch("/api/org/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId: id }),
    });
  }

  return (
    <OrgContext.Provider value={{ orgs, activeOrgId, switchOrg, loadingOrgs }}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  return useContext(OrgContext);
}
