import { useEffect, useState } from "react";
import { useOrg } from "../../../context/OrgContext";
import { useRole } from "../../../lib/useRole";
import CommandShell from "../../../components/v5/CommandShell";
import { V5 } from "../../../components/v5/v5Theme";

export default function EnterpriseSSOPage() {
  const { activeOrgId, loading: orgLoading } = useOrg();
  const { isAdmin, loading: roleLoading } = useRole();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [enforced, setEnforced] = useState(false);
  const [azureReady, setAzureReady] = useState(false);

  // ============================================================
  // LOAD SSO STATE (ADMIN ONLY)
  // ============================================================
  useEffect(() => {
    if (orgLoading || roleLoading) return;

    if (!activeOrgId) {
      setLoading(false);
      setError("No organization selected.");
      return;
    }

    if (!isAdmin) {
      setLoading(false);
      setError("Admin access required.");
      return;
    }

    async function load() {
      try {
        const res = await fetch(`/api/admin/sso/get?orgId=${activeOrgId}`);
        const json = await res.json();

        if (!json.ok) throw new Error(json.error);

        const org = json.org;

        setEnforced(!!org.sso_enforced);

        // ✅ Azure readiness guard
        const ready =
          org.sso_provider === "azure" &&
          !!org.azure_tenant_id &&
          !!org.azure_client_id &&
          !!org.azure_client_secret;

        setAzureReady(ready);
        setError("");
      } catch (e) {
        setError(e.message || "Failed to load SSO settings");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [activeOrgId, orgLoading, roleLoading, isAdmin]);

  // ============================================================
  // TOGGLE ENFORCEMENT (SAFE)
  // ============================================================
  async function toggleEnforcement(next) {
    setOkMsg("");
    setError("");

    try {
      const res = await fetch("/api/admin/sso/enforce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: activeOrgId,
          enforce: next,
        }),
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error);

      setEnforced(next);
      setOkMsg(
        next
          ? "SSO enforcement enabled. All users must log in via SSO."
          : "SSO enforcement disabled."
      );
    } catch (e) {
      setError(e.message || "Failed to update enforcement");
    }
  }

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <CommandShell
      tag="ENTERPRISE • SECURITY"
      title="Enterprise SSO"
      subtitle="Azure AD / Entra ID configuration"
      status={error ? "DEGRADED" : enforced ? "ENFORCED" : "READY"}
      statusColor={error ? V5.red : enforced ? V5.red : V5.green}
    >
      {loading && (
        <div style={{ color: V5.soft }}>Loading SSO settings…</div>
      )}

      {error && (
        <div style={{ color: "#f87171", marginBottom: 12 }}>{error}</div>
      )}

      {okMsg && (
        <div style={{ color: "#4ade80", marginBottom: 12 }}>{okMsg}</div>
      )}

      {!loading && !error && (
        <div
          style={{
            padding: 20,
            borderRadius: 18,
            border: `1px solid ${V5.border}`,
            background: V5.panel,
            maxWidth: 520,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }}>
            SSO Enforcement
          </div>

          <div style={{ fontSize: 13, color: V5.soft, marginBottom: 14 }}>
            When enabled, all users must authenticate via your configured SSO
            provider. Password logins are disabled.
          </div>

          <button
            disabled={!azureReady}
            onClick={() => toggleEnforcement(!enforced)}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: enforced
                ? "1px solid rgba(248,113,113,0.6)"
                : "1px solid rgba(56,189,248,0.5)",
              background: !azureReady
                ? "rgba(127,29,29,0.45)"
                : enforced
                ? "rgba(127,29,29,0.6)"
                : "rgba(2,6,23,0.6)",
              color: "#e5e7eb",
              fontWeight: 800,
              cursor: azureReady ? "pointer" : "not-allowed",
            }}
          >
            {enforced ? "Disable Enforcement" : "Enforce SSO"}
          </button>

          {!azureReady && (
            <div style={{ marginTop: 10, fontSize: 12, color: "#fca5a5" }}>
              Azure Tenant ID, Client ID, and Client Secret are required before
              enforcing SSO.
            </div>
          )}
        </div>
      )}
    </CommandShell>
  );
}
