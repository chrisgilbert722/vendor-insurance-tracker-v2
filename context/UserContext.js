// context/UserContext.js
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [org, setOrg] = useState(null);
  const [initializing, setInitializing] = useState(true);

  // ---------------------------------
  // AUTH SESSION (ALWAYS FINISHES)
  // ---------------------------------
  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      setSession(data?.session ?? null);
      setUser(data?.session?.user ?? null);
      setInitializing(false); // ✅ AUTH IS DONE — ALWAYS
    }

    loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
      }
    );

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  // ---------------------------------
  // ORG LOOKUP (NON-BLOCKING)
  // ---------------------------------
  useEffect(() => {
    if (!user) {
      setOrg(null);
      return;
    }

    async function loadOrg() {
      try {
        const { data } = await supabase
          .from("org_members")
          .select("org_id")
          .eq("user_id", user.id)
          .single();

        if (data?.org_id) {
          setOrg({ id: data.org_id });
        }
      } catch (err) {
        console.error("[UserContext] org lookup failed:", err);
      }
    }

    loadOrg();
  }, [user]);

  return (
    <UserContext.Provider
      value={{
        session,
        user,
        org,
        isLoggedIn: !!user,
        initializing,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
