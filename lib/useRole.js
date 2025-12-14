// lib/useRole.js
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export function useRole() {
  const [role, setRole] = useState(null); // null = loading
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadRole() {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user?.email) {
          if (!cancelled) {
            setRole("viewer");
            setLoading(false);
          }
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("email", session.user.email)
          .single();

        if (!cancelled) {
          setRole(error || !data?.role ? "viewer" : data.role);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setRole("viewer");
          setLoading(false);
        }
      }
    }

    loadRole();
    return () => { cancelled = true; };
  }, []);

  return {
    role,
    loading,
    ready: role !== null && !loading,
    isAdmin: role === "admin",
    isManager: role === "manager",
    isViewer: role === "viewer",
  };
}
