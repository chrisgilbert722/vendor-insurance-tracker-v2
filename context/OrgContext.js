import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

const OrgContext = createContext(null);

export function OrgProvider({ children }) {
  const [orgs, setOrgs] = useState([]);
  const [activeOrgId, setActiveOrgId] = useState(null);
  const [loadingOrgs, setLoadingOrgs] = useState(true);

  useEffect(() => {
    async function load() {
      // 1️⃣ Try to get session normally
      let {
        data: { session },
      } = await supabase.auth.getSession();

      // 2️⃣ If session is STILL NULL, fallback to getUser()
      if (!session) {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          session = { user };
        }
      }

      // 3️⃣ If STILL no user → stop
      if (!session?.user?.id) {
        console.warn("No Supabase user found");
        setLoadingOrgs(false);
        return;
      }

      // 4️⃣ Load orgs from your Neon API
      const res = await fetch("/api/org/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: session.user.id }),
      });

      const data = await res.json();

      if (data.ok) {
        setOrgs(data.orgs);

        // 5️⃣ ALWAYS use the first org from DB
        const newActiveOrgId = data.orgs[0]?.id || null;
        setActiveOrgId(newActiveOrgId);
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
