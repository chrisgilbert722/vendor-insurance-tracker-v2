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
        // Wait for org
        if (!activeOrgId) {
          if (!cancelled) {
            setLoading(true);
            setRole(null);
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

        // ✅ SERVER-SIDE SOURCE OF TRUTH
        const res = await fetch(
          `/api/orgs/role?orgId=${activeOrgId}`
        );

        if (!res.ok) {
          throw new Error("Role lookup failed");
        }

        const json = await res.json();

        if (!cancelled) {
          setRole(json.role || "viewer");
          setLoading(false);
        }
      } catch (err) {
        console.warn("[useRole] defaulting to viewer:", err.message);
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

    isAdmin: role === "admin",
    isManager: role === "manager",
    isViewer: role === "viewer",
  };
}
 
