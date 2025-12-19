import { useEffect, useState } from "react";
import { useOrg } from "../../../context/OrgContext";
import CommandShell from "../../../components/v5/CommandShell";

export default function EnterpriseSSOPage() {
  const { activeOrgId, loading } = useOrg();
  const [state, setState] = useState({ loading: true, error: "" });

  useEffect(() => {
    if (loading) return;
    if (!activeOrgId) {
      setState({ loading: false, error: "No organization selected." });
      return;
    }

    async function load() {
      try {
        const res = await fetch(`/api/admin/sso/get?orgId=${activeOrgId}`);
        const json = await res.json();
        if (!json.ok) throw new Error(json.error);
        setState({ loading: false, error: "" });
      } catch (e) {
        setState({ loading: false, error: e.message });
      }
    }

    load();
  }, [activeOrgId, loading]);

  return (
    <CommandShell
      tag="ENTERPRISE • SECURITY"
      title="Enterprise SSO"
      subtitle="Azure AD / Entra ID configuration"
      status={state.error ? "DEGRADED" : "READY"}
    >
      {state.loading && <div>Loading…</div>}
      {state.error && <div style={{ color: "#f87171" }}>{state.error}</div>}
    </CommandShell>
  );
}
