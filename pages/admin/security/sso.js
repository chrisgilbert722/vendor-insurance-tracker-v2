import { useEffect, useState } from "react";
import { useOrg } from "../../../context/OrgContext";
import { useRole } from "../../../lib/useRole";
import CommandShell from "../../../components/v5/CommandShell";
import { V5 } from "../../../components/v5/v5Theme";

export default function EnterpriseSSOPage() {
  const { activeOrgId, loading: orgLoading } = useOrg();
  const { isAdmin, loading: roleLoading } = useRole();

  const [state, setState] = useState({
    loading: true,
    error: "",
  });

  useEffect(() => {
    if (orgLoading || roleLoading) return;

    // 🔒 HARD ADMIN GATE
    if (!isAdmin) {
      setState({
        loading: false,
        error: "Admin access required to manage SSO.",
      });
      return;
    }

    if (!activeOrgId) {
      setState({
        loading: false,
        error: "No organization selected.",
      });
      return;
    }

    async function load() {
      try {
        const res = await fetch(`/api/admin/sso/get?orgId=${activeOrgId}`);
        const json = await res.json();

        if (!json.ok) {
          throw new Error(json.error || "Failed to load SSO settings");
        }

        setState({ loading: false, error: "" });
      } catch (e) {
        setState({ loading: false, error: e.message });
      }
    }

    load();
  }, [activeOrgId, isAdmin, orgLoading, roleLoading]);

  const status = state.error ? "DEGRADED" : "READY";

  return (
    <CommandShell
      tag="ENTERPRISE • SECURITY"
      title="Enterprise SSO"
      subtitle="Azure AD / Entra ID configuration"
      status={status}
      statusColor={state.error ? V5.red : V5.green}
    >
      {state.loading && <div style={{ color: V5.soft }}>Loading…</div>}

      {!state.loading && state.error && (
        <div
          style={{
            padding: 16,
            borderRadius: 16,
            background: "rgba(127,29,29,0.85)",
            border: "1px solid rgba(248,113,113,0.9)",
            color: "#fecaca",
          }}
        >
          {state.error}
        </div>
      )}

      {!state.loading && !state.error && (
        <div style={{ color: "#bbf7d0", fontWeight: 700 }}>
          SSO configuration ready.
        </div>
      )}
    </CommandShell>
  );
}
