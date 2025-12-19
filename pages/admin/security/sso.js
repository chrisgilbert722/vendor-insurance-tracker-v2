import { useEffect, useState } from "react";
import { useOrg } from "../../../context/OrgContext";
import CommandShell from "../../../components/v5/CommandShell";
import { V5 } from "../../../components/v5/v5Theme";

export default function EnterpriseSSOPage() {
  const { activeOrgId, loading } = useOrg();
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

    async function load() {
      try {
        const res = await fetch(`/api/admin/sso/get?orgId=${activeOrgId}`);
        const json = await res.json();
        if (!json.ok) throw new Error(json.error);
        setModel(json);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoadingPage(false);
      }
    }

    load();
  }, [activeOrgId, loading]);

  return (
    <CommandShell
      tag="ENTERPRISE • SECURITY"
      title="Enterprise SSO"
      subtitle="Azure AD / Entra ID configuration"
      status={error ? "DEGRADED" : "CONFIGURED"}
      statusColor={error ? V5.red : V5.green}
    >
      {loadingPage && <div>Loading SSO settings…</div>}

      {!loadingPage && error && (
        <div style={{ color: "#fecaca" }}>{error}</div>
      )}

      {model && (
        <div>
          <strong>{model.org.name}</strong>
          <div>External UUID: {model.org.external_uuid}</div>
          <div>Callback URL: {model.callbackUrl}</div>
        </div>
      )}
    </CommandShell>
  );
}
