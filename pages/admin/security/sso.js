// pages/admin/security/sso.js
// ============================================================
// ENTERPRISE SSO SETTINGS (ORG-ADMIN)
// - Client-only
// - Uses org.external_uuid for SSO APIs
// ============================================================

import { useEffect, useMemo, useState } from "react";
import { useOrg } from "../../../context/OrgContext";
import CommandShell from "../../../components/v5/CommandShell";
import { V5 } from "../../../components/v5/v5Theme";

export default function EnterpriseSSOPage() {
  const { activeOrg, loadingOrgs } = useOrg();

  const orgExternalId = activeOrg?.external_uuid || null;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");

  const [model, setModel] = useState({
    orgName: "",
    externalUuid: "",
    ssoProvider: "none", // none | azure
    ssoEnforced: false,
    allowedDomains: [],
    azureTenantId: "",
    azureClientId: "",
    azureClientSecret: "",
    callbackUrl: "",
  });

  useEffect(() => {
    if (loadingOrgs) return;

    if (!orgExternalId) {
      setLoading(false);
      setError("Organization is missing an external UUID.");
      return;
    }

    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setError("");
        setOkMsg("");

        const res = await fetch(
          `/api/admin/sso/get?orgId=${encodeURIComponent(orgExternalId)}`
        );

        const json = await res.json().catch(() => ({}));
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
  }, [orgExternalId, loadingOrgs]);

  const status = useMemo(() => {
    if (loading) return { label: "SYNCING", color: V5.blue };
    if (error) return { label: "DEGRADED", color: V5.red };
    if (model.ssoEnforced) return { label: "ENFORCED", color: V5.red };
    if (model.ssoProvider !== "none")
      return { label: "CONFIGURED", color: V5.green };
    return { label: "DISABLED", color: V5.soft };
  }, [loading, error, model.ssoEnforced, model.ssoProvider]);

  async function save() {
    if (!orgExternalId) return;

    setSaving(true);
    setError("");
    setOkMsg("");

    try {
      const res = await fetch("/api/admin/sso/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: orgExternalId,
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
    if (!orgExternalId) return;

    setSaving(true);
    setError("");
    setOkMsg("");

    try {
      const res = await fetch("/api/admin/sso/enforce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: orgExternalId,
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

  function addDomain(d) {
    const v = String(d || "").trim().toLowerCase();
    if (!v || !v.includes(".")) return;

    setModel((p) => {
      const set = new Set(
        (p.allowedDomains || []).map((x) => String(x).toLowerCase())
      );
      set.add(v);
      return { ...p, allowedDomains: Array.from(set) };
    });
  }

  function removeDomain(d) {
    setModel((p) => ({
      ...p,
      allowedDomains: (p.allowedDomains || []).filter((x) => x !== d),
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
      {loading && (
        <div style={{ color: V5.soft }}>Loading SSO settings…</div>
      )}

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

      {!loading && !error && (
        <div style={{ display: "grid", gap: 16 }}>
          {/* STATUS */}
          <div
            style={{
              padding: 18,
              borderRadius: 22,
              border: `1px solid ${V5.border}`,
              background: V5.panel,
              boxShadow:
                "0 0 32px rgba(0,0,0,0.6), inset 0 0 24px rgba(0,0,0,0.65)",
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 800 }}>
              {model.orgName}
            </div>
            <div style={{ fontSize: 12, color: V5.soft, marginTop: 6 }}>
              External UUID:{" "}
              <span style={{ color: "#e5e7eb" }}>
                {model.externalUuid}
              </span>
            </div>
            <div style={{ fontSize: 12, color: V5.soft, marginTop: 8 }}>
              Callback URL:
            </div>
            <div
              style={{
                marginTop: 4,
                padding: "8px 10px",
                borderRadius: 12,
                border: `1px solid ${V5.border}`,
                background: "rgba(2,6,23,0.55)",
                color: "#e5e7eb",
                fontSize: 12,
                wordBreak: "break-all",
              }}
            >
              {model.callbackUrl}
            </div>
          </div>

          {/* PROVIDER */}
          <div
            style={{
              padding: 18,
              borderRadius: 22,
              border: `1px solid ${V5.border}`,
              background: V5.panel,
            }}
          >
            <Field label="SSO Provider">
              <select
                value={model.ssoProvider}
                onChange={(e) =>
                  setModel((p) => ({
                    ...p,
                    ssoProvider: e.target.value,
                  }))
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
                  setModel((p) => ({
                    ...p,
                    azureTenantId: e.target.value,
                  }))
                }
                style={inputStyle()}
              />
            </Field>

            <Field label="Azure Client ID">
              <input
                value={model.azureClientId}
                onChange={(e) =>
                  setModel((p) => ({
                    ...p,
                    azureClientId: e.target.value,
                  }))
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
                placeholder="Paste new secret to update"
                style={inputStyle()}
              />
            </Field>

            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button onClick={save} disabled={saving} style={btnStyle(false)}>
                {saving ? "Saving…" : "Save"}
              </button>

              <button
                onClick={() => setEnforced(!model.ssoEnforced)}
                disabled={saving || model.ssoProvider === "none"}
                style={btnStyle(model.ssoEnforced)}
              >
                {model.ssoEnforced ? "Disable Enforcement" : "Enforce SSO"}
              </button>
            </div>
          </div>

          {/* DOMAINS */}
          <div
            style={{
              padding: 18,
              borderRadius: 22,
              border: `1px solid ${V5.border}`,
              background: V5.panel,
            }}
          >
            <Field label="Allowed Domains">
              <input
                placeholder="example.com"
                style={inputStyle()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addDomain(e.currentTarget.value);
                    e.currentTarget.value = "";
                  }
                }}
              />
            </Field>

            <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(model.allowedDomains || []).map((d) => (
                <span
                  key={d}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: `1px solid ${V5.border}`,
                    background: "rgba(2,6,23,0.55)",
                    color: "#e5e7eb",
                    fontSize: 12,
                  }}
                >
                  {d}{" "}
                  <button
                    onClick={() => removeDomain(d)}
                    style={{
                      marginLeft: 6,
                      background: "transparent",
                      border: "none",
                      color: V5.soft,
                      cursor: "pointer",
                    }}
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
    <div style={{ marginBottom: 10 }}>
      <div
        style={{
          fontSize: 11,
          color: V5.soft,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
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
    border: danger
      ? "1px solid rgba(248,113,113,0.55)"
      : "1px solid rgba(56,189,248,0.35)",
    background: danger
      ? "rgba(127,29,29,0.55)"
      : "rgba(2,6,23,0.55)",
    color: "#e5e7eb",
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 13,
  };
}
