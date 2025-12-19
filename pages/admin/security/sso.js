// ============================================================
// ENTERPRISE SSO SETTINGS (ORG-ADMIN)
// - Client-only
// - Uses numeric orgId (internal ID)
// - API resolves external_uuid internally
// ============================================================

import { useEffect, useMemo, useState } from "react";
import { useOrg } from "../../../context/OrgContext";
import CommandShell from "../../../components/v5/CommandShell";
import { V5 } from "../../../components/v5/v5Theme";

export default function EnterpriseSSOPage() {
  const { activeOrgId, loadingOrgs } = useOrg();

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

        const res = await fetch(
          `/api/admin/sso/get?orgId=${activeOrgId}`
        );

        const json = await res.json().catch(() => ({}));
        if (!json?.ok) {
          throw new Error(json?.error || "Failed to load SSO settings");
        }

        if (!alive) return;

        if (json.missingExternalUuid) {
          setError("Organization is missing an external UUID.");
        }

        setModel({
          orgName: json.org?.name || "",
          externalUuid: json.org?.external_uuid || "",
          ssoProvider: json.org?.sso_provider || "none",
          ssoEnforced: !!json.org?.sso_enforced,
          allowedDomains: Array.isArray(json.org?.allowed_domains)
            ? json.org.allowed_domains
            : [],
          azureTenantId: json.org?.azure_tenant_id || "",
          azureClientId: json.org?.azure_client_id || "",
          azureClientSecret: "",
          callbackUrl: json.callbackUrl || "",
        });
      } catch (e) {
        if (!alive) return;
        setError(e?.message || "Failed to load");
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
  }, [loading, error, model.ssoEnforced, model.ssoProvider]);

  async function save() {
    if (!activeOrgId) return;

    setSaving(true);
    setError("");
    setOkMsg("");

    try {
      const res = await fetch("/api/admin/sso/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: activeOrgId,
          ssoProvider: model.ssoProvider,
          azureTenantId: model.azureTenantId,
          azureClientId: model.azureClientId,
          azureClientSecret: model.azureClientSecret || null,
          allowedDomains: model.allowedDomains,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!json?.ok) throw new Error(json?.error || "Save failed");

      setOkMsg("Saved SSO settings.");
      setModel((p) => ({ ...p, azureClientSecret: "" }));
    } catch (e) {
      setError(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function setEnforced(next) {
    if (!activeOrgId) return;

    setSaving(true);
    setError("");
    setOkMsg("");

    try {
      const res = await fetch("/api/admin/sso/enforce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: activeOrgId,
          enforce: !!next,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!json?.ok)
        throw new Error(json?.error || "Failed to update enforcement");

      setModel((p) => ({ ...p, ssoEnforced: !!next }));
      setOkMsg(
        next ? "SSO enforcement enabled." : "SSO enforcement disabled."
      );
    } catch (e) {
      setError(e?.message || "Failed updating enforcement");
    } finally {
      setSaving(false);
    }
  }

  return (
    <CommandShell
      tag="ENTERPRISE • SECURITY"
      title="Enterprise SSO"
      subtitle="Configure Azure AD / Entra ID for this organization."
      status={status.label}
      statusColor={status.color}
    >
      {loading && <div style={{ color: V5.soft }}>Loading SSO settings…</div>}

      {!loading && error && (
        <div
          style={{
            padding: 16,
            borderRadius: 18,
            background: "rgba(127,29,29,0.85)",
            border: "1px solid rgba(248,113,113,0.9)",
            color: "#fecaca",
            fontSize: 14,
            marginBottom: 12,
          }}
        >
          {error}
        </div>
      )}

      {!loading && okMsg && (
        <div
          style={{
            padding: 14,
            borderRadius: 18,
            background: "rgba(16,185,129,0.10)",
            border: "1px solid rgba(16,185,129,0.35)",
            color: "#bbf7d0",
            fontSize: 14,
            marginBottom: 12,
          }}
        >
          {okMsg}
        </div>
      )}
    </CommandShell>
  );
}
