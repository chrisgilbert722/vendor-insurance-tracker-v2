// lib/useRole.js
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { useOrg } from "../context/OrgContext";

export function useRole() {
  const { activeOrgId } = useOrg();

  const [role, setRole] = useState(null); // null = loading
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadRole() {
      try {
        // No org yet → wait
        if (!activeOrgId) {
          if (!cancelled) {
            setLoading(true);
          }
          return;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user?.id) {
          if (!cancelled) {
            setRole("viewer");
            setLoading(false);
          }
          return;
        }

        // ✅ ORG-SCOPED ROLE (SOURCE OF TRUTH)
        const { data, error } = await supabase
          .from("org_members")
          .select("role")
          .eq("org_id", activeOrgId)
          .eq("user_id", session.user.id)
          .single();

        if (!cancelled) {
          if (error || !data?.role) {
            console.warn("[useRole] No org role found, defaulting to viewer");
            setRole("viewer");
          } else {
            setRole(data.role);
          }
          setLoading(false);
        }
      } catch (err) {
        console.error("[useRole] Role load error:", err);
        if (!cancelled) {
          setRole("viewer");
          setLoading(false);
        }
      }
    }

    loadRole();
    return () => {
      cancelled = true;
    };
  }, [activeOrgId]);

  return {
    role,
    loading,
    ready: role !== null && !loading,

    // ✅ Canonical flags used everywhere
    isAdmin: role === "admin",
    isManager: role === "manager",
    isViewer: role === "viewer",
  };
}
