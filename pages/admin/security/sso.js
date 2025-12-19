import { useEffect, useMemo, useState } from "react";
import { useOrg } from "../../../context/OrgContext";
import CommandShell from "../../../components/v5/CommandShell";
import { V5 } from "../../../components/v5/v5Theme";

export default function EnterpriseSSOPage() {
  const { activeOrg, activeOrgId, loading } = useOrg();

  const [loadingPage, setLoadingPage] = useState(true);
  const [error, setError] = useState("");
  const [model, setModel] = useState(null);

  useEffect(() => {
    if (loading) return;

    if (!activeOrgId) {
      setLoadingPage(false);
      setError("No organization selected.");
      return;
    }

    let alive = true;

    async function load() {
      try {
        setLoadingPage(true);
        setError("");

        const res = await fetch(`/api/admin/sso/get?orgId=${activeOrgId}`);
        const json = await res.json();

        if (!json.ok) throw new Error(json.error);

        if (!alive) return;
        setModel(json);
      } catch (e) {
        if (alive) setError(e.message);
      } finally {
        if (alive) setLoadingPage(false);
      }
    }

    load();
    return () => (alive = false);
  }, [activeOrgId, loading]);

  const status = useMemo(() => {
    if (loadingPage) return { label: "SYNCING", color: V5.blue };
    if (error) return { label: "DEGRADED", color: V5.red };
    if (model?.org?.sso_enforced) return { label: "ENFORCED", color: V5.red };
    if (model?.org?.sso_provider !== "none")
      return { label: "CONFIGURED", color: V5.green };
    return { label: "DISABLED", color: V5.soft };
  }, [loadingPage, error, model]);

  return (
    <CommandShell
      tag="ENTERPRISE • SECURITY"
      title="Enterprise SSO"
      subtitle="Azure AD / Entra ID configuration"
      status={status.label}
      statusColor={status.color}
    >
      {loadingPage && <div style={{ color: V5.soft }}>Loading SSO settings…</div>}

      {!loadingPage && error && (
        <div style={{ color: "#fca5a5" }}>{error}</div>
      )}

      {!loadingPage && model && (
        <div style={{ display: "grid", gap: 16 }}>
          <div>
            <strong>{model.org.name}</strong>
            <div style={{ fontSize: 12 }}>
              External UUID: {model.org.external_uuid || "—"}
            </div>
            <div style={{ fontSize: 12, marginTop: 6 }}>
              Callback URL:
            </div>
            <div style={{ fontSize: 12 }}>{model.callbackUrl}</div>
          </div>
        </div>
      )}
    </CommandShell>
  );
}
