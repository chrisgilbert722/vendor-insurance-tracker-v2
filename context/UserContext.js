// context/UserContext.js
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function loadSession() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error("[UserProvider] getSession error:", error);
        }
        if (ignore) return;
        setSession(data?.session ?? null);
        setUser(data?.session?.user ?? null);
      } catch (err) {
        console.error("[UserProvider] getSession throw:", err);
      } finally {
        if (!ignore) setInitializing(false);
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

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("[UserProvider] signOut error:", e);
    }
  };

  // Simple role stub — later we can read from user.metadata/DB
  const role =
    user?.app_metadata?.role ||
    user?.user_metadata?.role ||
    "admin"; // default treat as admin for now

  const isAdmin = role === "admin";
  const isManager = role === "manager" || role === "admin";
  const isViewer = !isAdmin && !isManager;

  const value = {
    session,
    user,
    initializing,
    isLoggedIn: !!user,
    isAdmin,
    isManager,
    isViewer,
    signOut,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  return useContext(UserContext);
}
