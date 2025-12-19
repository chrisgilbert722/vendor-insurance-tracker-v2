// pages/admin/security/sso.js
import { useEffect, useState } from "react";
import { useOrg } from "../../../context/OrgContext";
import CommandShell from "../../../components/v5/CommandShell";

export default function EnterpriseSSOPage() {
  const { activeOrgId, loading: orgLoading } = useOrg();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadSSO() {
      // ⏳ Wait for org context to finish
      if (orgLoading) return;

      // 🚫 No org selected
      if (!activeOrgId) {
        if (!cancelled) {
          setLoading(false);
          setError("No organization selected.");
        }
        return;
      }

      try {
        setLoading(true);
        setError("");

        const res = await fetch(`/api/admin/sso/get?orgId=${activeOrgId}`);

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Failed to load SSO settings");
        }

        const json = await res.json();
        if (!json?.ok) {
          throw new Error(json?.error || "Failed to load SSO settings");
        }

        if (!cancelled) {
          setLoading(false);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setLoading(false);
          setError(err.message || "SSO load failed");
        }
      }
    }

    loadSSO();

    return () => {
      cancelled = true;
    };
  }, [activeOrgId, orgLoading]);

  const status = loading
    ? "SYNCING"
    : error
    ? "DEGRADED"
    : "READY";

  return (
    <CommandShell
      tag="ENTERPRISE • SECURITY"
      title="Enterprise SSO"
      subtitle="Azure AD / Entra ID configuration"
      status={status}
    >
      {loading && <div>Loading SSO settings…</div>}

      {!loading && error && (
        <div style={{ color: "#f87171", fontWeight: 600 }}>
          {error}
        </div>
      )}

      {!loading && !error && (
        <div style={{ color: "#86efac", fontWeight: 600 }}>
          SSO configuration ready.
        </div>
      )}
    </CommandShell>
  );
}
