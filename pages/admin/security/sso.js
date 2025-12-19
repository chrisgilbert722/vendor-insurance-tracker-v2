// pages/admin/security/sso.js
import { useEffect, useMemo, useState } from "react";
import { useOrg } from "../../../context/OrgContext";
import CommandShell from "../../../components/v5/CommandShell";
import { V5 } from "../../../components/v5/v5Theme";

export default function EnterpriseSSOPage() {
  const { activeOrg, activeOrgId, loadingOrgs } = useOrg();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");

  const [model, setModel] = useState({
    orgName: "",
    externalUuid: "",
    ssoProvider: "none",
    ssoEnforced: false,
    allowedDomains: [],
    azureTenantId: "",
    azureClientId: "",
    azureClientSecret: "",
    callbackUrl: "",
  });

  useEffect(() => {
    if (loadingOrgs) return;

    if (!activeOrgId) {
      setLoading(false);
      setError("No organization selected.");
      return;
    }

    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setError("");
        setOkMsg("");

        const res = await fetch(`/api/admin/sso/get?orgId=${activeOrgId}`);
        const json = await res.json();

        if (!json?.ok) {
          throw new Error(json?.error || "Failed to load SSO settings");
        }

        if (!alive) return;

        setModel({
          orgName: json.org.name,
          externalUuid: json.org.external_uuid,
          ssoProvider: json.org.sso_provider || "none",
          ssoEnforced: !!json.org.sso_enforced,
          allowedDomains: json.org.allowed_domains || [],
          azureTenantId: json.org.azure_tenant_id || "",
          azureClientId: json.org.azure_client_id || "",
          azureClientSecret: "",
          callbackUrl: json.callbackUrl || "",
        });
      } catch (e) {
        if (!alive) return;
        setError(e.message);
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [activeOrgId, loadingOrgs]);

  const status = useMemo(() => {
    if (loading) return { label: "SYNCING", color: V5.blue };
    if (error) return { label: "DEGRADED", color: V5.red };
    if (model.ssoEnforced) return { label: "ENFORCED", color: V5.red };
    if (model.ssoProvider !== "none")
      return { label: "CONFIGURED", color: V5.green };
    return { label: "DISABLED", color: V5.soft };
  }, [loading, error, model]);

  return (
    <CommandShell
      tag="ENTERPRISE • SECURITY"
      title="Enterprise SSO"
      subtitle="Azure AD / Entra ID configuration"
      status={status.label}
      statusColor={status.color}
    >
      {loading && <div style={{ color: V5.soft }}>Loading SSO settings…</div>}

      {!loading && error && (
        <div style={{ padding: 16, borderRadius: 18, background: "rgba(127,29,29,0.85)", color: "#fecaca" }}>
          {error}
        </div>
      )}

      {!loading && !error && (
        <div style={{ padding: 18, borderRadius: 22, background: V5.panel }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{model.orgName}</div>
          <div style={{ fontSize: 12, color: V5.soft }}>
            External UUID: {model.externalUuid}
          </div>
          <div style={{ marginTop: 10, fontSize: 12 }}>
            Callback URL:
            <div style={{ wordBreak: "break-all" }}>{model.callbackUrl}</div>
          </div>
        </div>
      )}
    </CommandShell>
  );
}
