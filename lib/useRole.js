import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

export function useRole() {
  const [role, setRole] = useState(null);   // IMPORTANT — null until loaded
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRole() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user?.email) {
          setRole("viewer");
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("email", session.user.email)
          .single();

        if (error || !data?.role) {
          console.warn("No role found, defaulting to viewer");
          setRole("viewer");
        } else {
          setRole(data.role);
        }
      } catch (err) {
        console.error("Role fetch error:", err);
        setRole("viewer");
      }

      setLoading(false);
    }

    loadRole();
  }, []);

  return {
    role,
    loading,
    isLoadingRole: role === null || loading,     // NEW
    isAdmin: role === "admin",
    isManager: role === "manager",
    isViewer: role === "viewer",
  };
}
