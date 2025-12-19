import { useEffect, useMemo, useState } from "react";
import { useOrg } from "../../../context/OrgContext";
import CommandShell from "../../../components/v5/CommandShell";
import { V5 } from "../../../components/v5/v5Theme";

export default function EnterpriseSSOPage() {
  const { activeOrg, loading } = useOrg();
  const orgExternalId = activeOrg?.external_uuid || null;

  const [loadingPage, setLoadingPage] = useState(true);
  const [error, setError] = useState("");
  const [org, setOrg] = useState(null);
  const [callbackUrl, setCallbackUrl] = useState("");

  useEffect(() => {
    if (loading) return;

    if (!orgExternalId) {
      setLoadingPage(false);
      setError("Organization missing external UUID.");
      return;
    }

    let alive = true;

    async function load() {
      try {
        setLoadingPage(true);
        setError("");

        const res = await fetch(
          `/api/admin/sso/get?orgId=${orgExternalId}`
        );
        const json = await res.json();

        if (!json.ok) throw new Error(json.error);

        if (!alive) return;
        setOrg(json.org);
        setCallbackUrl(json.callbackUrl);
      } catch (e) {
        if (alive) setError(e.message);
      } finally {
        if (alive) setLoadingPage(false);
      }
    }

    load();
    return () => (alive = false);
  }, [orgExternalId, loading]);

  const status = useMemo(() => {
    if (loadingPage) return { label: "SYNCING", color: V5.blue };
    if (error) return { label: "DEGRADED", color: V5.red };
    if (org?.sso_enforced) return { label: "ENFORCED", color: V5.red };
    if (org?.sso_provider !== "none")
      return { label: "CONFIGURED", color: V5.green };
    return { label: "DISABLED", color: V5.soft };
  }, [loadingPage, error, org]);

  return (
    <CommandShell
      tag="ENTERPRISE • SECURITY"
      title="Enterprise SSO"
      subtitle="Azure AD / Entra ID configuration"
      status={status.label}
      statusColor={status.color}
    >
      {loadingPage && <div style={{ color: V5.soft }}>Loading SSO…</div>}

      {!loadingPage && error && (
        <div style={{ color: "#fecaca" }}>{error}</div>
      )}

      {!loadingPage && org && (
        <div>
          <strong>{org.name}</strong>
          <div>External UUID: {org.external_uuid}</div>
          <div>Callback URL: {callbackUrl}</div>
        </div>
      )}
    </CommandShell>
  );
}
