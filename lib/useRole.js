import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

/**
 * useRole()
 *
 * Returns:
 *  - isAdmin
 *  - isManager
 *  - isViewer
 *  - role
 *
 * Roles are stored in the `profiles` table:
 *   { id, email, role }
 *
 * Valid roles:
 *   admin, manager, viewer
 */
export function useRole() {
  const [role, setRole] = useState("viewer");
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

        // Fetch profile from DB
        const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("email", session.user.email)
          .single();

        if (error) {
          console.warn("No role found, defaulting to viewer");
          setRole("viewer");
        } else if (data?.role) {
          setRole(data.role);
        } else {
          setRole("viewer");
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
    isAdmin: role === "admin",
    isManager: role === "manager",
    isViewer: role === "viewer",
  };
}
