// lib/useRole.js
import { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabaseClient";
import { useOrg } from "../context/OrgContext";

export function useRole() {
  const { activeOrgId } = useOrg() || {};

  const [profileRole, setProfileRole] = useState(null);
  const [orgRole, setOrgRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadRoles() {
      setLoading(true);
      setError("");

      try {
        // 1️⃣ Get logged-in user
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const userId = session?.user?.id;
        if (!userId) {
          if (!cancelled) {
            setProfileRole("viewer");
            setOrgRole("viewer");
            setLoading(false);
          }
          return;
        }

        // 2️⃣ Load GLOBAL role (profiles)
        const { data: profile, error: profileErr } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", userId)
          .single();

        if (profileErr) throw profileErr;

        // 3️⃣ Load ORG role (org_members)
        let orgMemberRole = "viewer";

        if (activeOrgId) {
          const { data: member, error: memberErr } = await supabase
            .from("org_members")
            .select("role")
            .eq("user_id", userId)
            .eq("org_id", activeOrgId)
            .single();

          if (!memberErr && member?.role) {
            orgMemberRole = member.role;
          }
        }

        if (!cancelled) {
          setProfileRole(profile?.role || "viewer");
          setOrgRole(orgMemberRole);
          setLoading(false);
        }
      } catch (err) {
        console.error("[useRole] error:", err);
        if (!cancelled) {
          setProfileRole("viewer");
          setOrgRole("viewer");
          setError(err.message || "Failed loading role");
          setLoading(false);
        }
      }
    }

    loadRoles();
    return () => {
      cancelled = true;
    };
  }, [activeOrgId]);

  // 4️⃣ Compute permissions ONLY when both roles are known
  const computed = useMemo(() => {
    if (!profileRole || !orgRole) {
      return {
        isAdmin: false,
        isManager: false,
        isViewer: true,
      };
    }

    const global = profileRole.toLowerCase();
    const org = orgRole.toLowerCase();

    const isAdmin = global === "admin" && org === "admin";
    const isManager =
      (global === "admin" && org === "manager") ||
      (global === "manager" && (org === "admin" || org === "manager"));
    const isViewer = !isAdmin && !isManager;

    return { isAdmin, isManager, isViewer };
  }, [profileRole, orgRole]);

  return {
    loading,
    error,
    profileRole,
    orgRole,
    isLoadingRole: loading || !profileRole || !orgRole,
    ...computed,
  };
}
