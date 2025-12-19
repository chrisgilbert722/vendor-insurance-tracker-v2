// pages/admin/security/sso.js
// ============================================================
// ENTERPRISE SSO SETTINGS — STABLE VERSION
// - Uses activeOrg from OrgContext
// - Numeric org ID
// - Guarded against hydration flicker
// ============================================================

import { useEffect, useMemo, useState } from "react";
import { useOrg } from "../../../context/OrgContext";
import CommandShell from "../../../components/v5/CommandShell";
import { V5 } from "../../../components/v5/v5Theme";

export default function EnterpriseSSOPage() {
  const { activeOrg, loading } = useOrg();

  const orgId = activeOrg?.id || null;

  const [loadingPage, setLoadingPage] = useState(true);
  const [error, setError] = useState("");
  const [org, setOrg] = useState(null);
  const [callbackUrl, setCallbackUrl] = useState("");

  // ============================================================
  // LOAD SSO SETTINGS (SAFE)
  // ============================================================
  useEffect(() => {
    if (loading) return;

    if (!orgId) {
      setLoadingPage(false);
      setError("No organization selected.");
      return;
    }

    let alive = true;

    async function load() {
      try {
        setLoadingPage(true);
        setError("");

        const res = await fetch(`/api/admin/sso/get?orgId=${orgId}`);
        const json = await res.json();

        if (!json?.ok) {
          throw new Error(json?.error || "Failed to load SSO settings");
        }

        if (!alive) return;

        setOrg(json.org);
        setCallbackUrl(json.callbackUrl || "");
      } catch (e) {
        if (alive) setError(e.message || "Failed to load");
      } finally {
        if (alive) setLoadingPage(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [orgId, loading]);

  // ============================================================
  // STATUS BADGE
  // ============================================================
  const status = useMemo(() => {
    if (loadingPage) return { label: "SYNCING", color: V5.blue };
    if (error) return { label: "DEGRADED", color: V5.red };
    if (org?.sso_enforced) return { label: "ENFORCED", color: V5.red };
    if (org?.sso_provider && org.sso_provider !== "none")
      return { label: "CONFIGURED", color: V5.green };
    return { label: "DISABLED", color: V5.soft };
  }, [loadingPage, error, org]);

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
      {loadingPage && (
        <div style={{ color: V5.soft }}>Loading SSO settings…</div>
      )}

      {!loadingPage && error && (
        <div
          style={{
            padding: 16,
            borderRadius: 18,
            background: "rgba(127,29,29,0.85)",
            border: "1px solid rgba(248,113,113,0.9)",
            color: "#fecaca",
            fontSize: 14,
          }}
        >
          {error}
        </div>
      )}

      {!loadingPage && !error && org && (
        <div
          style={{
            padding: 18,
            borderRadius: 22,
            border: `1px solid ${V5.border}`,
            background: V5.panel,
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 800 }}>
            {org.name}
          </div>

          <div style={{ fontSize: 12, color: V5.soft, marginTop: 6 }}>
            External UUID:{" "}
            <span style={{ color: "#e5e7eb" }}>
              {org.external_uuid || "—"}
            </span>
          </div>

          <div style={{ fontSize: 12, color: V5.soft, marginTop: 10 }}>
            Callback URL:
          </div>

          <div
            style={{
              marginTop: 6,
              padding: "8px 10px",
              borderRadius: 12,
              border: `1px solid ${V5.border}`,
              background: "rgba(2,6,23,0.55)",
              color: "#e5e7eb",
              fontSize: 12,
              wordBreak: "break-all",
            }}
          >
            {callbackUrl}
          </div>
        </div>
      )}
    </CommandShell>
  );
}
