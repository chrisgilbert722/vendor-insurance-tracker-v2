// context/UserContext.js
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);

  const [org, setOrg] = useState(null); // active org
  const [initializing, setInitializing] = useState(true);

  // ---------------------------
  // LOAD SUPABASE SESSION
  // ---------------------------
  useEffect(() => {
    let ignore = false;

    async function loadSession() {
      const { data } = await supabase.auth.getSession();
      if (ignore) return;

      setSession(data?.session ?? null);
      setUser(data?.session?.user ?? null);
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

  // ---------------------------
  // LOAD USER'S ORGANIZATION
  // ---------------------------
  useEffect(() => {
    if (!user) {
      setOrg(null);
      setInitializing(false);
      return;
    }

    async function loadOrg() {
      try {
        const { data, error } = await supabase
          .from("org_members") // ✅ FIXED TABLE NAME
          .select("org_id")
          .eq("user_id", user.id)
          .single();

        if (error) {
          console.error("[UserProvider] org lookup error:", error);
        } else if (data?.org_id) {
          setOrg({ id: data.org_id });
        }
      } catch (err) {
        console.error("[UserProvider] org load throw:", err);
      } finally {
        setInitializing(false);
      }
    }

    loadOrg();
  }, [user]);

  // ---------------------------
  // ROLE SYSTEM
  // ---------------------------
  const role =
    user?.app_metadata?.role ||
    user?.user_metadata?.role ||
    "admin";

  const isAdmin = role === "admin";
  const isManager = role === "manager" || role === "admin";
  const isViewer = !isAdmin && !isManager;

  // ---------------------------
  // PROVIDER VALUE
  // ---------------------------
  const value = {
    session,
    user,
    org,
    isLoggedIn: !!user,
    isAdmin,
    isManager,
    isViewer,
    initializing,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  return useContext(UserContext);
}
