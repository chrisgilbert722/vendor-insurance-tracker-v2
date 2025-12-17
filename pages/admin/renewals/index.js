// pages/admin/renewals/index.js
// ============================================================
// RENEWAL INTELLIGENCE V5 — EXEC AI COMMAND
// Shell-driven, cinematic, dashboard-consistent
// ============================================================

import { useEffect, useMemo, useState } from "react";
import { useOrg } from "../../../context/OrgContext";

import CommandShell from "../../../components/v5/CommandShell";
import { V5 } from "../../../components/v5/v5Theme";
import OrgRenewalPredictionHeatmap from "../../../components/renewals/OrgRenewalPredictionHeatmap";

/* ------------------------------------------------------------
   HELPERS
------------------------------------------------------------ */
const clamp100 = (n) => {
  const x = Number(n);
  return Number.isFinite(x) ? Math.max(0, Math.min(100, Math.round(x))) : 0;
};

function tierColor(tier) {
  const t = String(tier || "").toLowerCase();
  if (t === "severe") return V5.red;
  if (t === "high risk") return V5.yellow;
  if (t === "watch") return V5.orange;
  if (t === "preferred") return V5.blue;
  if (t === "elite safe") return V5.green;
  return V5.soft;
}

function computeTierCounts(predictions) {
  const counts = {
    severe: 0,
    "high risk": 0,
    watch: 0,
    preferred: 0,
    "elite safe": 0,
  };

  (Array.isArray(predictions) ? predictions : []).forEach((p) => {
    const t = String(p?.risk_tier || "").toLowerCase();
    if (counts[t] !== undefined) counts[t]++;
  });

  return counts;
}

/* ------------------------------------------------------------
   UI ATOMS
------------------------------------------------------------ */
function MetricPill({ label, value, color }) {
  return (
    <div
      style={{
        padding: "12px 14px",
        borderRadius: 18,
        border: `1px solid ${color}55`,
        background: V5.panel,
        boxShadow: `0 0 18px ${color}22, inset 0 0 18px rgba(0,0,0,0.55)`,
      }}
    >
      <div
        style={{
          fontSize: 10,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: V5.soft,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>
        {value ?? "—"}
      </div>
    </div>
  );
}

function KpiCard({ label, value, color }) {
  return (
    <div
      style={{
        borderRadius: 22,
        padding: 16,
        border: `1px solid ${color}55`,
        background: V5.panel,
        boxShadow: `0 0 22px ${color}25, inset 0 0 22px rgba(0,0,0,0.6)`,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: V5.soft,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 900, color, marginTop: 6 }}>
        {value}
      </div>
    </div>
  );
}

function TableShell({ title, subtitle, rows, columns }) {
  const safeRows = Array.isArray(rows) ? rows : [];

  return (
    <div
      style={{
        borderRadius: 26,
        padding: 18,
        border: `1px solid ${V5.border}`,
        background: V5.panel,
        boxShadow:
          "0 0 36px rgba(0,0,0,0.6), inset 0 0 26px rgba(0,0,0,0.65)",
      }}
    >
      <div
        style={{
          fontSize: 12,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: V5.soft,
          marginBottom: 6,
        }}
      >
        {title}
      </div>

      {subtitle && (
        <div style={{ fontSize: 12, color: V5.muted, marginBottom: 10 }}>
          {subtitle}
        </div>
      )}

      {safeRows.length === 0 ? (
        <div style={{ fontSize: 12, color: V5.soft }}>No vendors found.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "separate",
              borderSpacing: 0,
              fontSize: 12,
              color: V5.text,
            }}
          >
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.key} style={thCell}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {safeRows.map((r, i) => (
                <tr key={r.vendor_id ?? i} style={rowStyle}>
                  {columns.map((c) => (
                    <td key={c.key} style={tdCell}>
                      {typeof c.render === "function"
                        ? c.render(r)
                        : r?.[c.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------
   PAGE
------------------------------------------------------------ */
export default function RenewalIntelligenceV5() {
  const { activeOrgId: orgId } = useOrg();

  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!orgId) {
      setPredictions([]);
      setLoading(false);
      return;
    }

    let alive = true;

    (async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/renewals/predict-org-v1?orgId=${encodeURIComponent(orgId)}`
        );
        const json = await res.json().catch(() => ({}));
        if (!json?.ok) throw new Error(json?.error || "Load failed");
        if (!alive) return;
        setPredictions(Array.isArray(json.predictions) ? json.predictions : []);
      } catch (e) {
        if (!alive) return;
        setError(e.message);
        setPredictions([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => (alive = false);
  }, [orgId]);

  const safe = Array.isArray(predictions) ? predictions : [];
  const total = safe.length;

  const avgRisk =
    total === 0
      ? null
      : Math.round(
          safe.reduce((a, p) => a + (Number(p?.risk_score) || 0), 0) / total
        );

  const tierCounts = computeTierCounts(safe);

  const highRisk = safe
    .filter((p) =>
      ["severe", "high risk"].includes(
        String(p?.risk_tier || "").toLowerCase()
      )
    )
    .sort((a, b) => (b?.risk_score || 0) - (a?.risk_score || 0))
    .slice(0, 10);

  const failures = safe
    .filter((p) => (Number(p?.likelihood_fail) || 0) >= 40)
    .sort((a, b) => (b?.likelihood_fail || 0) - (a?.likelihood_fail || 0))
    .slice(0, 10);

  return (
    <CommandShell
      tag="EXEC AI • RENEWAL COMMAND"
      title="Renewal Intelligence"
      subtitle="Predict renewal risk before it happens"
      status={loading ? "SYNCING" : error ? "DEGRADED" : "ONLINE"}
      statusColor={loading ? V5.blue : error ? V5.red : V5.green}
      actions={[
        <button
          key="pdf"
          onClick={() => setDownloading(true)}
          style={{
            padding: "8px 14px",
            borderRadius: 999,
            border: `1px solid ${V5.blue}`,
            background: "transparent",
            color: V5.blue,
            fontWeight: 700,
            fontSize: 12,
          }}
        >
          Executive PDF
        </button>,
      ]}
    >
      {/* METRICS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
          gap: 14,
          marginBottom: 22,
        }}
      >
        <MetricPill label="Vendors Scored" value={total} color={V5.blue} />
        <MetricPill label="Avg Risk" value={avgRisk ?? "—"} color={V5.purple} />
        <MetricPill
          label="Failures ≥ 40%"
          value={failures.length}
          color={failures.length ? V5.red : V5.green}
        />
      </div>

      {/* KPI STRIP */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <KpiCard label="Severe" value={tierCounts.severe} color={V5.red} />
        <KpiCard label="High" value={tierCounts["high risk"]} color={V5.yellow} />
        <KpiCard label="Watch" value={tierCounts.watch} color={V5.orange} />
        <KpiCard
          label="Preferred"
          value={tierCounts.preferred}
          color={V5.blue}
        />
        <KpiCard
          label="Elite Safe"
          value={tierCounts["elite safe"]}
          color={V5.green}
        />
      </div>

      {/* HEATMAP */}
      <OrgRenewalPredictionHeatmap orgId={orgId} />

      {/* TABLES */}
      <div
        style={{
          marginTop: 24,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 18,
        }}
      >
        <TableShell
          title="Top High-Risk Vendors"
          subtitle="Severe or High Risk"
          rows={highRisk}
          columns={[
            { key: "vendor_name", label: "Vendor" },
            {
              key: "risk_tier",
              label: "Tier",
              render: (r) => (
                <span
                  style={{
                    color: tierColor(r?.risk_tier),
                    fontWeight: 800,
                  }}
                >
                  {r?.risk_tier}
                </span>
              ),
            },
            { key: "risk_score", label: "Risk" },
            {
              key: "likelihood_fail",
              label: "Fail %",
              render: (r) => `${clamp100(r?.likelihood_fail)}%`,
            },
          ]}
        />

        <TableShell
          title="Likely to Fail Renewal"
          subtitle="Failure ≥ 40%"
          rows={failures}
          columns={[
            { key: "vendor_name", label: "Vendor" },
            { key: "risk_score", label: "Risk" },
            {
              key: "likelihood_fail",
              label: "Fail %",
              render: (r) => `${clamp100(r?.likelihood_fail)}%`,
            },
            {
              key: "likelihood_on_time",
              label: "On-Time %",
              render: (r) => `${clamp100(r?.likelihood_on_time)}%`,
            },
          ]}
        />
      </div>
    </CommandShell>
  );
}

/* ------------------------------------------------------------
   TABLE STYLES
------------------------------------------------------------ */
const thCell = {
  padding: "10px",
  color: V5.soft,
  fontWeight: 800,
  textAlign: "left",
  borderBottom: `1px solid ${V5.border}`,
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.14em",
};

const tdCell = {
  padding: "10px",
  color: V5.text,
  borderBottom: `1px solid ${V5.border}`,
  fontSize: 12,
};

const rowStyle = {
  background:
    "linear-gradient(90deg, rgba(15,23,42,0.98), rgba(15,23,42,0.92))",
};

const rowStyle = {
  background:
    "linear-gradient(90deg, rgba(15,23,42,0.98), rgba(15,23,42,0.92))",
};
