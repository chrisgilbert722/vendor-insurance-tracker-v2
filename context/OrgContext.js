// context/OrgContext.js
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const OrgContext = createContext(null);

export function OrgProvider({ children }) {
  const [orgs, setOrgs] = useState([]);
  const [activeOrgId, setActiveOrgId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { data } = await supabase.auth.getSession();
        const user = data?.session?.user;
        if (!user) return;

        // 🔥 ALWAYS hit NEON via API — never Supabase SQL
        const res = await fetch("/api/orgs/for-user");
        const json = await res.json();

        if (!json.ok) throw new Error(json.error);

        if (!cancelled) {
          setOrgs(json.orgs);
          if (!activeOrgId && json.orgs.length > 0) {
            setActiveOrgId(json.orgs[0].id);
          }
        }
      } catch (e) {
        console.error("[OrgContext]", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <OrgContext.Provider
      value={{
        orgs,
        activeOrgId,
        setActiveOrgId,
        loading,
      }}
    >
      {children}
    </OrgContext.Provider>
  );
}

// 🚨 THIS MUST EXIST ONLY ONCE
export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) {
    throw new Error("useOrg must be used within OrgProvider");
  }
  return ctx;
}
