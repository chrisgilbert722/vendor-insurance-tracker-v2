// pages/admin/security/sso.js
import { useEffect, useState } from "react";
import { useOrg } from "../../../context/OrgContext";
import CommandShell from "../../../components/v5/CommandShell";
import { V5 } from "../../../components/v5/v5Theme";

export default function EnterpriseSSOPage() {
  const { activeOrgId, loading } = useOrg();
  const [state, setState] = useState({ loading: true, error: "", org: null });

  useEffect(() => {
    if (loading) return;
    if (!activeOrgId) {
      setState({ loading: false, error: "No organization selected.", org: null });
      return;
    }

    fetch(`/api/admin/sso/get?orgId=${activeOrgId}`)
      .then((r) => r.json())
      .then((j) => {
        if (!j.ok) throw new Error(j.error);
        setState({ loading: false, error: "", org: j.org });
      })
      .catch((e) =>
        setState({ loading: false, error: e.message, org: null })
      );
  }, [activeOrgId, loading]);

  return (
    <CommandShell
      title="Enterprise SSO"
      subtitle="Azure AD / Entra ID configuration"
      status={state.error ? "DEGRADED" : "CONFIGURED"}
      statusColor={state.error ? V5.red : V5.green}
    >
      {state.loading && <div>Loading SSO…</div>}
      {state.error && <div style={{ color: "red" }}>{state.error}</div>}
      {state.org && (
        <div>
          <strong>{state.org.name}</strong>
          <div>External UUID: {state.org.external_uuid}</div>
        </div>
      )}
    </CommandShell>
  );
}
