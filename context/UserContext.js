// context/UserContext.js — FINAL STABLE VERSION
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);

  const [org, setOrg] = useState(null);
  const [initializing, setInitializing] = useState(true);

  /* ============================================
     1) LOAD SUPABASE SESSION
  ============================================ */
  useEffect(() => {
    let ignore = false;

    async function loadSession() {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (!ignore) {
          setSession(data?.session ?? null);
          setUser(data?.session?.user ?? null);
        }
      } catch (err) {
        console.error("[UserProvider] getSession error:", err);
      }
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
    });

    return () => {
      ignore = true;
      subscription?.unsubscribe();
    };
  }, []);

  /* ============================================
     2) LOAD ORGANIZATION FOR USER
  ============================================ */
  useEffect(() => {
    if (!user) {
      setOrg(null);
      setInitializing(false);
      return;
    }

    async function loadOrg() {
      try {
        const { data, error } = await supabase
          .from("organization_members")       // ✅ correct table name
          .select("org_id")
          .eq("user_id", user.id)
          .limit(1);

        if (error) {
          console.error("[UserProvider] org lookup error:", error);
          setOrg(null);
        } else if (data?.length > 0) {
          setOrg({ id: data[0].org_id });
        } else {
          setOrg(null);
        }
      } catch (err) {
        console.error("[UserProvider] org load throw:", err);
        setOrg(null);
      } finally {
        setInitializing(false);
      }
    }

    loadOrg();
  }, [user]);

  /* ============================================
     3) ROLE SYSTEM
  ============================================ */
  const role =
    user?.app_metadata?.role ||
    user?.user_metadata?.role ||
    "admin";

  const isAdmin = role === "admin";
  const isManager = role === "manager" || role === "admin";
  const isViewer = !isAdmin && !isManager;

  /* ============================================
     CONTEXT VALUE
  ============================================ */
  const value = {
    session,
    user,
    org,               // ⭐ now loaded safely
    initializing,
    isLoggedIn: !!user,
    isAdmin,
    isManager,
    isViewer,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  return useContext(UserContext);
}
