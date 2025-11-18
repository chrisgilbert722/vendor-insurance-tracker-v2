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

        // 3. Check for existing cookie to remember last org
        const cookieOrgId =
          document.cookie
            .split("; ")
            .find((r) => r.startsWith("activeOrgId="))
            ?.split("=")[1];

        // 4. Use cookie OR default to first org
        const fallbackOrg = data.orgs[0]?.id || null;
        const newActiveOrgId = cookieOrgId || fallbackOrg;

        setActiveOrgId(newActiveOrgId);
      }

      setLoadingOrgs(false);
    }

    load();
  }, []);

  async function switchOrg(id) {
    setActiveOrgId(id);

    // Persist org choice in cookie
    document.cookie = `activeOrgId=${id}; path=/; max-age=31536000`;

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
