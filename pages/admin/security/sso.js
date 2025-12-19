// pages/admin/security/sso.js
// ============================================================
// ENTERPRISE SSO SETTINGS (ORG-ADMIN)
// - Client-only
// - Uses INTERNAL org ID (numeric)
// ============================================================

import { useEffect, useMemo, useState } from "react";
import { useOrg } from "../../../context/OrgContext";
import CommandShell from "../../../components/v5/CommandShell";
import { V5 } from "../../../components/v5/v5Theme";

export default function EnterpriseSSOPage() {
  const { activeOrgId, loading } = useOrg();

  const [loadingPage, setLoadingPage] = useState(true);
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

  // ============================================================
  // LOAD SSO SETTINGS (NUMERIC ORG ID)
  // ============================================================
  useEffect(() => {
    if (loading) return;

    // 🚨 HARD GUARD — prevents sidebar + SSO race condition
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
        setOkMsg("");

        const res = await fetch(
          `/api/admin/sso/get?orgId=${encodeURIComponent(activeOrgId)}`
        );

        const json = await res.json();
        if (!json?.ok) {
          throw new Error(json?.error || "Failed to load SSO settings");
        }

        if (!alive) return;

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
        if (alive) setError(e.message);
      } finally {
        if (alive) setLoadingPage(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [activeOrgId, loading]);

  // ============================================================
  // STATUS BADGE
  // ============================================================
  const status = useMemo(() => {
    if (loadingPage) return { label: "SYNCING", color: V5.blue };
    if (error) return { label: "DEGRADED", color: V5.red };
    if (model.ssoEnforced) return { label: "ENFORCED", color: V5.red };
    if (model.ssoProvider !== "none")
      return { label: "CONFIGURED", color: V5.green };
    return { label: "DISABLED", color: V5.soft };
  }, [loadingPage, error, model]);

  // ============================================================
  // SAVE
  // ============================================================
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

      const json = await res.json();
      if (!json?.ok) {
        throw new Error(json?.error || "Save failed");
      }

      setOkMsg("SSO settings saved.");
      setModel((p) => ({ ...p, azureClientSecret: "" }));
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  // ============================================================
  // UI
  // ============================================================
  return (
    <CommandShell
      tag="ENTERPRISE • SECURITY"
      title="Enterprise SSO"
      subtitle="Azure AD / Entra ID configuration"
      status={status.label}
      statusColor={status.color}
    >
      {loadingPage && <div style={{ color: V5.soft }}>Loading SSO settings…</div>}

      {!loadingPage && error && <div style={errorBox}>{error}</div>}

      {!loadingPage && okMsg && <div style={successBox}>{okMsg}</div>}

      {!loadingPage && !error && (
        <div style={{ display: "grid", gap: 16 }}>
          {/* ORG INFO */}
          <div style={panel}>
            <strong>{model.orgName}</strong>
            <div style={{ fontSize: 12, color: V5.soft, marginTop: 6 }}>
              External UUID: {model.externalUuid || "—"}
            </div>

            <div style={{ fontSize: 12, marginTop: 10, color: V5.soft }}>
              Callback URL
            </div>
            <div style={codeBox}>{model.callbackUrl || "—"}</div>
          </div>

          {/* PROVIDER */}
          <div style={panel}>
            <Field label="SSO Provider">
              <select
                value={model.ssoProvider}
                onChange={(e) =>
                  setModel((p) => ({ ...p, ssoProvider: e.target.value }))
                }
                style={inputStyle()}
              >
                <option value="none">Disabled</option>
                <option value="azure">Azure AD / Entra ID</option>
              </select>
            </Field>

            <Field label="Azure Tenant ID">
              <input
                value={model.azureTenantId}
                onChange={(e) =>
                  setModel((p) => ({ ...p, azureTenantId: e.target.value }))
                }
                style={inputStyle()}
              />
            </Field>

            <Field label="Azure Client ID">
              <input
                value={model.azureClientId}
                onChange={(e) =>
                  setModel((p) => ({ ...p, azureClientId: e.target.value }))
                }
                style={inputStyle()}
              />
            </Field>

            <Field label="Azure Client Secret (rotate)">
              <input
                value={model.azureClientSecret}
                onChange={(e) =>
                  setModel((p) => ({
                    ...p,
                    azureClientSecret: e.target.value,
                  }))
                }
                style={inputStyle()}
              />
            </Field>

            <button onClick={save} disabled={saving} style={btnStyle()}>
              {saving ? "Saving…" : "Save SSO Settings"}
            </button>
          </div>
        </div>
      )}
    </CommandShell>
  );
}

// ============================================================
// STYLES
// ============================================================
const panel = {
  padding: 18,
  borderRadius: 22,
  border: `1px solid ${V5.border}`,
  background: V5.panel,
};

const inputStyle = () => ({
  width: "100%",
  padding: "10px 12px",
  borderRadius: 14,
  border: `1px solid ${V5.border}`,
  background: "rgba(2,6,23,0.55)",
  color: "#e5e7eb",
});

const btnStyle = () => ({
  marginTop: 14,
  padding: "10px 14px",
  borderRadius: 14,
  border: "1px solid rgba(56,189,248,0.35)",
  background: "rgba(2,6,23,0.55)",
  color: "#e5e7eb",
  fontWeight: 800,
  cursor: "pointer",
});

const Field = ({ label, children }) => (
  <div style={{ marginBottom: 12 }}>
    <div style={{ fontSize: 11, color: V5.soft, marginBottom: 6 }}>
      {label}
    </div>
    {children}
  </div>
);

const errorBox = {
  padding: 16,
  borderRadius: 18,
  background: "rgba(127,29,29,0.85)",
  border: "1px solid rgba(248,113,113,0.9)",
  color: "#fecaca",
};

const successBox = {
  padding: 14,
  borderRadius: 18,
  background: "rgba(16,185,129,0.10)",
  border: "1px solid rgba(16,185,129,0.35)",
  color: "#bbf7d0",
};

const codeBox = {
  marginTop: 6,
  padding: "8px 10px",
  borderRadius: 12,
  background: "rgba(2,6,23,0.55)",
  fontSize: 12,
};
