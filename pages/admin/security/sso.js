import { useEffect, useState } from "react";
import { useOrg } from "../../../context/OrgContext";
import CommandShell from "../../../components/v5/CommandShell";

export default function EnterpriseSSOPage() {
  const { activeOrg, loading } = useOrg();
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  useEffect(() => {
    if (loading) return;
    if (!activeOrg?.id) {
      setError("No organization selected.");
      return;
    }

    fetch(`/api/admin/sso/get?orgId=${activeOrg.id}`)
      .then((r) => r.json())
      .then((j) => {
        if (!j.ok) throw new Error(j.error);
        setData(j);
      })
      .catch((e) => setError(e.message));
  }, [activeOrg, loading]);

  return (
    <CommandShell
      tag="ENTERPRISE • SECURITY"
      title="Enterprise SSO"
      subtitle="Azure AD / Entra ID configuration"
      status={error ? "DEGRADED" : "READY"}
    >
      {error && <div style={{ color: "#f87171" }}>{error}</div>}

      {data && (
        <div>
          <strong>{data.org.name}</strong>
          <div>External UUID: {data.org.external_uuid}</div>
          <div>Callback URL: {data.callbackUrl}</div>
        </div>
      )}
    </CommandShell>
  );
}
