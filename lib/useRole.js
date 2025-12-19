// lib/useRole.js
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { useOrg } from "../context/OrgContext";

export function useRole() {
  const { activeOrgId } = useOrg();

  const [role, setRole] = useState(null); // null = not resolved yet
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadRole() {
      // 🔒 No org selected → stay in loading
      if (!activeOrgId) {
        if (!cancelled) {
          setRole(null);
          setLoading(true);
        }
        return;
      }

      try {
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

        // ✅ CORRECT TABLE — SOURCE OF TRUTH
        const { data, error } = await supabase
          .from("organization_members")
          .select("role")
          .eq("org_id", activeOrgId)
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (cancelled) return;

        if (error || !data?.role) {
          // ⚠️ Silent fallback (no console spam)
          setRole("viewer");
        } else {
          setRole(data.role);
        }

        setLoading(false);
      } catch (err) {
        console.error("[useRole] Failed to load role:", err);
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
    ready: !loading && role !== null,

    // ✅ Canonical flags
    isAdmin: role === "admin",
    isManager: role === "manager",
    isViewer: role === "viewer",
  };
}
