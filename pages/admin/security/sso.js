import { useEffect, useState } from "react";
import { useOrg } from "../../../context/OrgContext";
import CommandShell from "../../../components/v5/CommandShell";
import { V5 } from "../../../components/v5/v5Theme";

export default function EnterpriseSSOPage() {
  const { activeOrgId, orgs, loading } = useOrg();
  const org = orgs.find(o => o.id === activeOrgId);

  const [error, setError] = useState("");
  const [loadingPage, setLoadingPage] = useState(true);

  useEffect(() => {
    if (loading) return;

    if (!org) {
      setError("No organization selected.");
      setLoadingPage(false);
      return;
    }

    async function load() {
      try {
        const res = await fetch(`/api/admin/sso/get?orgId=${org.id}`);
        const json = await res.json();
        if (!json.ok) throw new Error(json.error);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoadingPage(false);
      }
    }

    load();
  }, [org, loading]);

  return (
    <CommandShell
      tag="ENTERPRISE • SECURITY"
      title="Enterprise SSO"
      subtitle="Azure AD / Entra ID configuration"
      status={error ? "DEGRADED" : "ACTIVE"}
      statusColor={error ? V5.red : V5.green}
    >
      {loadingPage && <div>Loading…</div>}
      {!loadingPage && error && <div style={{ color: "red" }}>{error}</div>}
      {!loadingPage && !error && (
        <div>
          <strong>{org.name}</strong>
          <div>External UUID: {org.external_uuid}</div>
        </div>
      )}
    </CommandShell>
  );
}
