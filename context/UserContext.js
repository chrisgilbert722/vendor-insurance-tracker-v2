// context/UserContext.js
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  
  const [org, setOrg] = useState(null);
  const [initializing, setInitializing] = useState(true);

  // Load Supabase session
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

  // Load organization for logged-in user
  useEffect(() => {
    if (!user) {
      setOrg(null);
      setInitializing(false);
      return;
    }

    async function loadOrg() {
      try {
        const { data, error } = await supabase
          .from("organization_members")
          .select("org_id")
          .eq("user_id", user.id)
          .single();

        if (error) {
          console.error("[UserProvider] org lookup error:", error);
        } else {
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

  const role =
    user?.app_metadata?.role ||
    user?.user_metadata?.role ||
    "admin";

  const isAdmin = role === "admin";
  const isManager = role === "manager" || role === "admin";
  const isViewer = !isAdmin && !isManager;

  const value = {
    session,
    user,
    org,              // ⭐ now available!
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
