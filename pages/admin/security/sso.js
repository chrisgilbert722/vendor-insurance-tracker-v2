// pages/admin/security/sso.js
// ============================================================
// ENTERPRISE SSO SETTINGS (ORG-ADMIN)
// - Client-only
// - Reads/writes via API routes
// ============================================================

import { useEffect, useMemo, useState } from "react";
import { useOrg } from "../../../context/OrgContext";
import CommandShell from "../../../components/v5/CommandShell";
import { V5 } from "../../../components/v5/v5Theme";

export default function EnterpriseSSOPage() {
  const { activeOrgId: orgId, loadingOrgs } = useOrg();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");

  const [model, setModel] = useState({
    orgName: "",
    externalUuid: "",
    ssoProvider: "none", // none | azure
    ssoEnforced: false,
    domain: "",
    allowedDomains: [],
    azureTenantId: "",
    azureClientId: "",
    azureClientSecret: "",
    callbackUrl: "",
  });

  useEffect(() => {
    if (loadingOrgs) return;
    if (!orgId) {
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

        const res = await fetch(`/api/admin/sso/get?orgId=${encodeURIComponent(orgId)}`);
        const json = await res.json().catch(() => ({}));
        if (!json?.ok) throw new Error(json?.error || "Failed to load SSO settings");

        if (!alive) return;

        setModel((prev) => ({
          ...prev,
          orgName: json.org?.name || "",
          externalUuid: json.org?.external_uuid || "",
          ssoProvider: json.org?.sso_provider || "none",
          ssoEnforced: !!json.org?.sso_enforced,
          domain: json.org?.domain || "",
          allowedDomains: Array.isArray(json.org?.allowed_domains) ? json.org.allowed_domains : [],
          azureTenantId: json.org?.azure_tenant_id || "",
          azureClientId: json.org?.azure_client_id || "",
          azureClientSecret: "", // never echo secret back
          callbackUrl: json.callbackUrl || "",
        }));
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
  }, [orgId, loadingOrgs]);

  const status = useMemo(() => {
    if (loading) return { label: "SYNCING", color: V5.blue };
    if (error) return { label: "DEGRADED", color: V5.red };
    if (model.ssoEnforced) return { label: "ENFORCED", color: V5.red };
    if (model.ssoProvider !== "none") return { label: "CONFIGURED", color: V5.green };
    return { label: "DISABLED", color: V5.soft };
  }, [loading, error, model.ssoEnforced, model.ssoProvider]);

  async function save() {
    if (!orgId) return;

    setSaving(true);
    setError("");
    setOkMsg("");

    try {
      const payload = {
        orgId,
        ssoProvider: model.ssoProvider,
        azureTenantId: model.azureTenantId,
        azureClientId: model.azureClientId,
        azureClientSecret: model.azureClientSecret || null, // only update if provided
        allowedDomains: model.allowedDomains,
      };

      const res = await fetch("/api/admin/sso/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));
      if (!json?.ok) throw new Error(json?.error || "Save failed");

      setOkMsg("Saved SSO settings.");
      setModel((prev) => ({ ...prev, azureClientSecret: "" }));
    } catch (e) {
      setError(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function setEnforced(next) {
    if (!orgId) return;

    setSaving(true);
    setError("");
    setOkMsg("");

    try {
      const res = await fetch("/api/admin/sso/enforce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, enforce: !!next }),
      });

      const json = await res.json().catch(() => ({}));
      if (!json?.ok) throw new Error(json?.error || "Failed to update enforcement");

      setModel((prev) => ({ ...prev, ssoEnforced: !!next }));
      setOkMsg(next ? "SSO enforcement enabled." : "SSO enforcement disabled.");
    } catch (e) {
      setError(e?.message || "Failed updating enforcement");
    } finally {
      setSaving(false);
    }
  }

  function addDomain(d) {
    const v = String(d || "").trim().toLowerCase();
    if (!v) return;
    if (!v.includes(".")) return;
    setModel((prev) => {
      const set = new Set([...(prev.allowedDomains || [])].map((x) => String(x).toLowerCase()));
      set.add(v);
      return { ...prev, allowedDomains: Array.from(set) };
    });
  }

  function removeDomain(d) {
    setModel((prev) => ({
      ...prev,
      allowedDomains: (prev.allowedDomains || []).filter((x) => x !== d),
    }));
  }

  return (
    <CommandShell
      tag="ENTERPRISE • SECURITY"
      title="Enterprise SSO"
      subtitle="Configure Azure AD / Entra ID for this organization. Customers own their Azure tenant — you store the connection metadata."
      status={status.label}
      statusColor={status.color}
    >
      {loading && <div style={{ color: V5.soft }}>Loading SSO settings…</div>}

      {!loading && !!error && (
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

      {!loading && !!okMsg && (
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

      {!loading && !error && (
        <div style={{ display: "grid", gap: 16 }}>
          {/* STATUS / INSTRUCTIONS */}
          <div
            style={{
              padding: 18,
              borderRadius: 22,
              border: `1px solid ${V5.border}`,
              background: V5.panel,
              boxShadow: "0 0 32px rgba(0,0,0,0.6), inset 0 0 24px rgba(0,0,0,0.65)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: V5.soft }}>
                  Organization
                </div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{model.orgName || "—"}</div>
                <div style={{ fontSize: 12, color: V5.soft, marginTop: 6 }}>
                  External UUID: <span style={{ color: "#e5e7eb" }}>{model.externalUuid || "—"}</span>
                </div>
              </div>

              <div style={{ minWidth: 260 }}>
                <div style={{ fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: V5.soft }}>
                  Callback URL
                </div>
                <div
                  style={{
                    marginTop: 6,
                    padding: "10px 12px",
                    borderRadius: 14,
                    border: `1px solid ${V5.border}`,
                    background: "rgba(2,6,23,0.55)",
                    color: "#e5e7eb",
                    fontSize: 12,
                    wordBreak: "break-all",
                  }}
                >
                  {model.callbackUrl || "—"}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 14, fontSize: 13, color: V5.soft, lineHeight: 1.6 }}>
              Give the callback URL and your organization identifier to the customer’s IT admin. They create an Azure App in their tenant and
              provide Tenant ID + Client ID + Secret back to you. Then you can enforce SSO for selected email domains.
            </div>
          </div>

          {/* PROVIDER + CREDS */}
          <div
            style={{
              padding: 18,
              borderRadius: 22,
              border: `1px solid ${V5.border}`,
              background: V5.panel,
              boxShadow: "0 0 32px rgba(0,0,0,0.6), inset 0 0 24px rgba(0,0,0,0.65)",
            }}
          >
            <div style={{ fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: V5.soft, marginBottom: 10 }}>
              Provider
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12 }}>
              <Field label="SSO Provider">
                <select
                  value={model.ssoProvider}
                  onChange={(e) => setModel((p) => ({ ...p, ssoProvider: e.target.value }))}
                  style={inputStyle()}
                >
                  <option value="none">Disabled</option>
                  <option value="azure">Azure AD / Entra ID</option>
                </select>
              </Field>

              <Field label="Azure Tenant ID">
                <input
                  value={model.azureTenantId}
                  onChange={(e) => setModel((p) => ({ ...p, azureTenantId: e.target.value }))}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  style={inputStyle()}
                />
              </Field>

              <Field label="Azure Client ID">
                <input
                  value={model.azureClientId}
                  onChange={(e) => setModel((p) => ({ ...p, azureClientId: e.target.value }))}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  style={inputStyle()}
                />
              </Field>

              <Field label="Azure Client Secret (set/rotate)">
                <input
                  value={model.azureClientSecret}
                  onChange={(e) => setModel((p) => ({ ...p, azureClientSecret: e.target.value }))}
                  placeholder="Paste new secret to update (leave blank to keep existing)"
                  style={inputStyle()}
                />
              </Field>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
              <button onClick={save} disabled={saving} style={btnStyle(false)}>
                {saving ? "Saving…" : "Save SSO Settings"}
              </button>

              <button
                onClick={() => setEnforced(!model.ssoEnforced)}
                disabled={saving || model.ssoProvider === "none"}
                style={btnStyle(model.ssoEnforced)}
                title={model.ssoProvider === "none" ? "Configure a provider first" : ""}
              >
                {model.ssoEnforced ? "Disable Enforcement" : "Enforce SSO"}
              </button>
            </div>

            <div style={{ marginTop: 10, fontSize: 12, color: V5.soft }}>
              Enforcement blocks magic links for matching domains and requires enterprise sign-in.
            </div>
          </div>

          {/* DOMAINS */}
          <div
            style={{
              padding: 18,
              borderRadius: 22,
              border: `1px solid ${V5.border}`,
              background: V5.panel,
              boxShadow: "0 0 32px rgba(0,0,0,0.6), inset 0 0 24px rgba(0,0,0,0.65)",
            }}
          >
            <div style={{ fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: V5.soft, marginBottom: 10 }}>
              Allowed Domains
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <input
                placeholder="example.com"
                style={{ ...inputStyle(), maxWidth: 260 }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addDomain(e.currentTarget.value);
                    e.currentTarget.value = "";
                  }
                }}
              />
              <div style={{ fontSize: 12, color: V5.soft }}>
                Press Enter to add. These domains are used to gate magic links and enforce SSO.
              </div>
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(model.allowedDomains || []).length === 0 && (
                <div style={{ fontSize: 13, color: V5.soft }}>No domains set yet.</div>
              )}

              {(model.allowedDomains || []).map((d) => (
                <span
                  key={d}
                  style={{
                    display: "inline-flex",
                    gap: 8,
                    alignItems: "center",
                    padding: "8px 10px",
                    borderRadius: 999,
                    border: `1px solid ${V5.border}`,
                    background: "rgba(2,6,23,0.55)",
                    color: "#e5e7eb",
                    fontSize: 12,
                  }}
                >
                  {d}
                  <button
                    onClick={() => removeDomain(d)}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: V5.soft,
                      cursor: "pointer",
                      fontSize: 12,
                    }}
                    aria-label={`Remove ${d}`}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </CommandShell>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: V5.soft, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 6 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function inputStyle() {
  return {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 14,
    border: `1px solid ${V5.border}`,
    background: "rgba(2,6,23,0.55)",
    color: "#e5e7eb",
    outline: "none",
    fontSize: 13,
  };
}

function btnStyle(danger) {
  return {
    padding: "10px 14px",
    borderRadius: 14,
    border: danger ? "1px solid rgba(248,113,113,0.55)" : "1px solid rgba(56,189,248,0.35)",
    background: danger ? "rgba(127,29,29,0.55)" : "rgba(2,6,23,0.55)",
    color: "#e5e7eb",
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 13,
  };
}
