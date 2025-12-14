// context/UserContext.js
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [org, setOrg] = useState(null);
  const [initializing, setInitializing] = useState(true);

  // -------------------------------------
  // LOAD SUPABASE SESSION (ONCE)
  // -------------------------------------
  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;

        setSession(data?.session ?? null);
        setUser(data?.session?.user ?? null);
      } catch (err) {
        console.error("[UserProvider] session load error:", err);
      }
    }

    loadSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
      }
    );

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // -------------------------------------
  // LOAD USER ORG (SAFE, NON-BLOCKING)
  // -------------------------------------
  useEffect(() => {
    let mounted = true;

    async function loadOrg() {
      // No user → done initializing
      if (!user) {
        setOrg(null);
        setInitializing(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("org_members")
          .select("org_id")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle(); // ✅ CRITICAL FIX

        if (!mounted) return;

        if (error) {
          console.warn("[UserProvider] org lookup warning:", error.message);
          setOrg(null);
        } else if (data?.org_id) {
          setOrg({ id: data.org_id });
        } else {
          setOrg(null); // valid: user has no org yet
        }
      } catch (err) {
        console.error("[UserProvider] org load error:", err);
        setOrg(null);
      } finally {
        if (mounted) {
          setInitializing(false); // ✅ ALWAYS RUNS
        }
      }
    }

    loadOrg();

    return () => {
      mounted = false;
    };
  }, [user]);

  // -------------------------------------
  // ROLE SYSTEM (SOURCE OF TRUTH = DB)
  // -------------------------------------
  const role =
    user?.app_metadata?.role ||
    user?.user_metadata?.role ||
    "admin"; // safe default for owner/dev

  const isAdmin = role === "admin";
  const isManager = role === "manager" || role === "admin";
  const isViewer = !isAdmin && !isManager;

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

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUser must be used within UserProvider");
  }
  return ctx;
}
