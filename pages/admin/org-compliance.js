// pages/admin/org-compliance.js
// ============================================================
// ORG COMPLIANCE — EXEC DASHBOARD (CLIENT ONLY)
// - SAFE for Vercel / Turbopack
// - NO server imports (db, uuid, openai)
// - Fetches /api/admin/org-compliance-v5
// - Styled to match Dashboard / Alerts / V5 pages
// ============================================================

import { useEffect, useState } from "react";
import { useOrg } from "../../context/OrgContext";
import CommandShell from "../../components/v5/CommandShell";
import { V5 } from "../../components/v5/v5Theme";

export default function OrgCompliancePage() {
  const { activeOrgId: orgId, loadingOrgs } = useOrg();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

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

        const res = await fetch(
          `/api/admin/org-compliance-v5?orgId=${encodeURIComponent(orgId)}`
        );

        const json = await res.json().catch(() => ({}));

        if (!json.ok) {
          throw new Error(json.error || "Org compliance unavailable");
        }

        if (!alive) return;
        setData(json);
      } catch (e) {
        if (!alive) return;
        setError(e.message || "Failed loading org compliance");
        setData(null);
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [orgId, loadingOrgs]);

  const metrics = data?.metrics;

  return (
    <CommandShell
      tag="EXEC AI • ORG COMPLIANCE"
      title="Organization Compliance"
      subtitle="Executive-level compliance health across your entire organization"
      status={loading ? "SYNCING" : error ? "DEGRADED" : "ONLINE"}
      statusColor={loading ? V5.blue : error ? V5.red : V5.green}
    >
      {loading && (
        <div style={{ color: V5.soft }}>Loading organization compliance…</div>
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
          }}
        >
          {error}
        </div>
      )}

      {!loading && !error && data && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
            gap: 16,
          }}
        >
          <MetricCard label="Vendors" value={metrics.vendorCount} color={V5.blue} />
          <MetricCard label="Avg Score" value={metrics.avgScore} color={V5.purple} />
          <MetricCard
            label="Combined Score"
            value={metrics.combinedScore}
            color={
              metrics.combinedScore >= 70
                ? V5.green
                : metrics.combinedScore >= 40
                ? V5.yellow
                : V5.red
            }
          />
          <MetricCard label="Tier" value={metrics.tier} color={V5.blue} />

          <div
            style={{
              gridColumn: "1 / -1",
              marginTop: 10,
              padding: 18,
              borderRadius: 22,
              border: `1px solid ${V5.border}`,
              background: V5.panel,
              boxShadow:
                "0 0 32px rgba(0,0,0,0.6), inset 0 0 24px rgba(0,0,0,0.65)",
            }}
          >
            <div
              style={{
                fontSize: 12,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: V5.soft,
                marginBottom: 8,
              }}
            >
              Executive Summary
            </div>

            <div style={{ fontSize: 14, lineHeight: 1.6 }}>
              {data.narrative || "No executive narrative available yet."}
            </div>
          </div>
        </div>
      )}
    </CommandShell>
  );
}

function MetricCard({ label, value, color }) {
  return (
    <div
      style={{
        borderRadius: 20,
        padding: 16,
        background: V5.panel,
        border: `1px solid ${color}55`,
        boxShadow: `0 0 22px ${color}22, inset 0 0 22px rgba(0,0,0,0.6)`,
      }}
    >
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
      <div style={{ fontSize: 26, fontWeight: 800, color }}>
        {value ?? "—"}
      </div>
    </div>
  );
}
