// context/UserContext.js
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      setSession(data?.session ?? null);
      setUser(data?.session?.user ?? null);
      setInitializing(false);
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

  return (
    <UserContext.Provider
      value={{
        session,
        user,
        isLoggedIn: !!user,
        initializing,
      }}
    >
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
