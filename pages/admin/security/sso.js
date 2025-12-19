import { useEffect, useMemo, useState } from "react";
import { useOrg } from "../../../context/OrgContext";
import CommandShell from "../../../components/v5/CommandShell";
import { V5 } from "../../../components/v5/v5Theme";

export default function EnterpriseSSOPage() {
  const { activeOrg, loading } = useOrg();

  const orgId = activeOrg?.id;

  const [state, setState] = useState({
    loading: true,
    error: "",
    ok: "",
    model: null,
  });

  useEffect(() => {
    if (!orgId) {
      setState((s) => ({
        ...s,
        loading: false,
        error: "No organization selected.",
      }));
      return;
    }

    let alive = true;

    async function load() {
      try {
        const res = await fetch(`/api/admin/sso/get?orgId=${orgId}`);
        const json = await res.json();

        if (!json.ok) throw new Error(json.error);

        if (!alive) return;

        setState({
          loading: false,
          error: "",
          ok: "",
          model: {
            ...json.org,
            callbackUrl: json.callbackUrl,
          },
        });
      } catch (e) {
        if (alive) {
          setState((s) => ({
            ...s,
            loading: false,
            error: e.message,
          }));
        }
      }
    }

    load();
    return () => (alive = false);
  }, [orgId]);

  const status = useMemo(() => {
    if (state.loading) return { label: "SYNCING", color: V5.blue };
    if (state.error) return { label: "DEGRADED", color: V5.red };
    return { label: "READY", color: V5.green };
  }, [state]);

  return (
    <CommandShell
      tag="ENTERPRISE • SECURITY"
      title="Enterprise SSO"
      subtitle="Azure AD / Entra ID configuration"
      status={status.label}
      statusColor={status.color}
    >
      {state.loading && <div>Loading…</div>}

      {state.error && (
        <div style={{ color: "#fecaca", padding: 16 }}>{state.error}</div>
      )}

      {state.model && (
        <div style={{ color: "#e5e7eb" }}>
          <div><b>Organization:</b> {state.model.name}</div>
          <div><b>External UUID:</b> {state.model.external_uuid}</div>
          <div><b>Callback URL:</b> {state.model.callbackUrl}</div>
        </div>
      )}
    </CommandShell>
  );
}
