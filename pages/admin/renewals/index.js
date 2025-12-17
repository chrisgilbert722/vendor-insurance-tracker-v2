// pages/admin/renewals/index.js
// ============================================================
// RENEWAL INTELLIGENCE V5 — CINEMATIC EXEC AI COMMAND CENTER
// - Iron‑Man style cockpit UI
// - Defensive data handling (no unsafe .length)
// - Uses /api/renewals/predict-org-v1 (org UUID → backend resolves)
// ============================================================

import { useEffect, useMemo, useState } from "react";
import { useOrg } from "../../../context/OrgContext";
import OrgRenewalPredictionHeatmap from "../../../components/renewals/OrgRenewalPredictionHeatmap";

const GP = {
  bg: "#020617",
  text: "#e5e7eb",
  textSoft: "#9ca3af",
  textMuted: "#6b7280",
  borderSoft: "rgba(51,65,85,0.9)",
  borderStrong: "rgba(148,163,184,0.55)",
  panelBg: "rgba(15,23,42,0.92)",
  panelBg2: "rgba(2,6,23,0.55)",
  glowBlue: "rgba(56,189,248,0.45)",
  glowPurple: "rgba(168,85,247,0.35)",
  glowGreen: "rgba(34,197,94,0.35)",
  severe: "#fb7185",
  high: "#fbbf24",
  watch: "#facc15",
  preferred: "#38bdf8",
  safe: "#22c55e",
};

function clamp100(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(100, Math.round(x)));
}

function computeTierCounts(predictions) {
  const counts = {
    severe: 0,
    "high risk": 0,
    watch: 0,
    preferred: 0,
    "elite safe": 0,
    unknown: 0,
  };

  (Array.isArray(predictions) ? predictions : []).forEach((p) => {
    const tier = String(p?.risk_tier || "").toLowerCase();
    if (counts[tier] !== undefined) counts[tier]++;
    else counts.unknown++;
  });

  return counts;
}

function tierColor(tier) {
  const t = String(tier || "").toLowerCase();
  if (t === "severe") return GP.severe;
  if (t === "high risk") return GP.high;
  if (t === "watch") return GP.watch;
  if (t === "preferred") return GP.preferred;
  if (t === "elite safe") return GP.safe;
  return "rgba(148,163,184,0.8)";
}

function MetricPill({ label, value, tone }) {
  const color =
    tone === "severe"
      ? GP.severe
      : tone === "high"
      ? GP.high
      : tone === "watch"
      ? GP.watch
      : tone === "preferred"
      ? GP.preferred
      : tone === "safe"
      ? GP.safe
      : GP.preferred;

  return (
    <div
      style={{
        borderRadius: 18,
        padding: "12px 12px",
        background: "rgba(15,23,42,0.88)",
        border: `1px solid ${color}55`,
        boxShadow: `0 0 18px ${color}22, inset 0 0 18px rgba(0,0,0,0.55)`,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        minHeight: 72,
      }}
    >
      <div
        style={{
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: "0.16em",
          color: GP.textSoft,
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
        <div style={{ fontSize: 11, color: GP.textMuted }}>live</div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, color }) {
  return (
    <div
      style={{
        borderRadius: 22,
        padding: 14,
        border: `1px solid ${color}55`,
        background:
          "radial-gradient(circle at 20% 0%, rgba(15,23,42,0.95), rgba(15,23,42,0.75))",
        boxShadow: `0 0 22px ${color}25, inset 0 0 20px rgba(0,0,0,0.55)`,
      }}
    >
      <div style={{ fontSize: 11, color: GP.textSoft, letterSpacing: 0.3 }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color, marginTop: 4 }}>
        {value}
      </div>
    </div>
  );
}

function Panel({ title, subtitle, children, rightSlot }) {
  return (
    <div
      style={{
        borderRadius: 26,
        padding: 16,
        border: "1px solid rgba(148,163,184,0.28)",
        background:
          "radial-gradient(circle at 10% 0%, rgba(56,189,248,0.10), transparent 45%), radial-gradient(circle at 90% 20%, rgba(168,85,247,0.08), transparent 40%), rgba(15,23,42,0.86)",
        boxShadow:
          "0 22px 60px rgba(0,0,0,0.55), inset 0 0 28px rgba(0,0,0,0.55)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "flex-start",
          marginBottom: 12,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: "0.16em",
              color: GP.textSoft,
            }}
          >
            {title}
          </div>
          {subtitle ? (
            <div style={{ marginTop: 6, fontSize: 12, color: GP.textMuted }}>
              {subtitle}
            </div>
          ) : null}
        </div>

        {rightSlot ? <div>{rightSlot}</div> : null}
      </div>

      {children}
    </div>
  );
}

function TableShell({ title, subtitle, rows, columns }) {
  const safeRows = Array.isArray(rows) ? rows : [];
  return (
    <Panel title={title} subtitle={subtitle}>
      {safeRows.length === 0 ? (
        <div style={{ fontSize: 12, color: GP.textSoft }}>
          No items found.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "separate",
              borderSpacing: 0,
              fontSize: 12,
              color: GP.text,
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
              {safeRows.map((r, idx) => (
                <tr key={r.vendor_id ?? idx} style={rowStyle}>
                  {columns.map((c) => (
                    <td key={c.key} style={tdCell}>
                      {typeof c.render === "function" ? c.render(r) : r?.[c.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

export default function RenewalPredictionDashboardPage() {
  const { activeOrgId: orgId } = useOrg();

  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!orgId) {
      setPredictions([]);
      setLoading(false);
      setError("");
      return;
    }

    let alive = true;

    async function load() {
      try {
        if (!alive) return;
        setLoading(true);
        setError("");

        const res = await fetch(
          `/api/renewals/predict-org-v1?orgId=${encodeURIComponent(orgId)}`
        );
        const json = await res.json().catch(() => ({}));

        if (!json?.ok) {
          throw new Error(json?.error || "Failed to load predictions");
        }

        if (!alive) return;
        setPredictions(Array.isArray(json.predictions) ? json.predictions : []);
      } catch (err) {
        console.error("[RenewalPredictionDashboard] error:", err);
        if (!alive) return;
        setError(err?.message || "Failed to load predictions");
        setPredictions([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [orgId]);

  async function downloadExecutivePdf() {
    if (!orgId) return;
    try {
      setDownloading(true);

      const res = await fetch("/api/admin/executive-renewal-report-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed generating PDF");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Executive_Renewal_Report_${orgId}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("PDF Error: " + (err?.message || "Unknown error"));
    } finally {
      setDownloading(false);
    }
  }

  const safePredictions = Array.isArray(predictions) ? predictions : [];

  const totalVendors = safePredictions.length;

  const avgRisk = useMemo(() => {
    if (totalVendors === 0) return null;
    const sum = safePredictions.reduce((acc, p) => acc + (Number(p?.risk_score) || 0), 0);
    return Math.round(sum / totalVendors);
  }, [safePredictions, totalVendors]);

  const tierCounts = useMemo(() => computeTierCounts(safePredictions), [safePredictions]);

  const highRiskVendors = useMemo(() => {
    return safePredictions
      .filter((p) => {
        const tier = (p?.risk_tier || "").toLowerCase();
        return tier === "severe" || tier === "high risk";
      })
      .sort((a, b) => (Number(b?.risk_score) || 0) - (Number(a?.risk_score) || 0));
  }, [safePredictions]);

  const predictedFailures = useMemo(() => {
    return safePredictions
      .filter((p) => (Number(p?.likelihood_fail) || 0) >= 40)
      .sort((a, b) => (Number(b?.likelihood_fail) || 0) - (Number(a?.likelihood_fail) || 0));
  }, [safePredictions]);

  const cockpitStatus = loading
    ? "SYNCING"
    : error
    ? "DEGRADED"
    : "ONLINE";

  const cockpitStatusColor =
    cockpitStatus === "ONLINE" ? GP.safe : cockpitStatus === "SYNCING" ? GP.preferred : GP.severe;

  return (
    <div
      style={{
        minHeight: "100vh",
        position: "relative",
        background:
          "radial-gradient(circle at 20% 0%, rgba(56,189,248,0.12), transparent 35%), radial-gradient(circle at 85% 10%, rgba(168,85,247,0.10), transparent 35%), radial-gradient(circle at 50% 120%, rgba(34,197,94,0.06), transparent 45%), #020617",
        padding: "34px 42px 44px",
        color: GP.text,
        overflowX: "hidden",
      }}
    >
      {/* Cinematic grid + scanlines */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px)",
          backgroundSize: "100% 3px",
          opacity: 0.18,
          mixBlendMode: "screen",
        }}
      />

      {/* Aurora glow */}
      <div
        style={{
          position: "absolute",
          top: -380,
          left: "50%",
          transform: "translateX(-50%)",
          width: 1400,
          height: 1400,
          background:
            "radial-gradient(circle, rgba(56,189,248,0.24), transparent 60%)",
          filter: "blur(160px)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          borderRadius: 34,
          padding: 22,
          border: "1px solid rgba(148,163,184,0.35)",
          background:
            "radial-gradient(circle at 20% 0%, rgba(15,23,42,0.95), rgba(15,23,42,0.86))",
          boxShadow: `
            0 0 70px rgba(0,0,0,0.8),
            0 0 80px ${GP.glowBlue},
            0 0 60px ${GP.glowPurple},
            inset 0 0 24px rgba(0,0,0,0.65)
          `,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 18,
            flexWrap: "wrap",
            marginBottom: 18,
          }}
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                gap: 10,
                alignItems: "center",
                padding: "6px 12px",
                borderRadius: 999,
                border: "1px solid rgba(148,163,184,0.35)",
                background:
                  "linear-gradient(120deg, rgba(2,6,23,0.8), rgba(15,23,42,0.7))",
                boxShadow: "0 0 18px rgba(56,189,248,0.18)",
                marginBottom: 10,
              }}
            >
              <span style={{ fontSize: 10, letterSpacing: "0.18em", color: GP.textSoft, textTransform: "uppercase" }}>
                EXEC AI • Renewal Command
              </span>
              <span
                style={{
                  fontSize: 10,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: cockpitStatusColor,
                }}
              >
                {cockpitStatus}
              </span>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: cockpitStatusColor,
                  boxShadow: `0 0 14px ${cockpitStatusColor}`,
                  opacity: cockpitStatus === "SYNCING" ? 0.7 : 1,
                }}
              />
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: 30,
                fontWeight: 700,
                letterSpacing: 0.2,
              }}
            >
              Renewal risk{" "}
              <span
                style={{
                  background:
                    "linear-gradient(90deg,#38bdf8,#a855f7,#22c55e,#fbbf24)",
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                }}
              >
                for your entire portfolio
              </span>
              .
            </h1>

            <div style={{ marginTop: 8, fontSize: 13, color: GP.textSoft, maxWidth: 720, lineHeight: 1.55 }}>
              See who will renew on time, who will go late, and where renewal failure will hit — before it happens.
            </div>

            <div
              style={{
                marginTop: 10,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <MetricPill label="Vendors Scored" value={totalVendors} tone="preferred" />
              <MetricPill label="Avg Risk" value={avgRisk == null ? "—" : avgRisk} tone={avgRisk != null && avgRisk >= 70 ? "high" : "preferred"} />
              <MetricPill label="Failures ≥ 40%" value={predictedFailures.length} tone={predictedFailures.length ? "severe" : "safe"} />
            </div>
          </div>

          {/* Executive snapshot */}
          <div
            style={{
              minWidth: 260,
              borderRadius: 22,
              padding: 14,
              border: "1px solid rgba(51,65,85,0.9)",
              background: "rgba(2,6,23,0.55)",
              boxShadow: "0 0 24px rgba(0,0,0,0.55), inset 0 0 18px rgba(0,0,0,0.55)",
            }}
          >
            <div style={{ fontSize: 11, color: GP.textSoft, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 10 }}>
              Executive Controls
            </div>

            <button
              onClick={downloadExecutivePdf}
              disabled={downloading}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 14,
                border: "1px solid rgba(56,189,248,0.85)",
                background: downloading
                  ? "rgba(56,189,248,0.15)"
                  : "linear-gradient(90deg,#38bdf8,#0ea5e9,#1e3a8a)",
                color: "#e0f2fe",
                fontSize: 13,
                fontWeight: 700,
                cursor: downloading ? "not-allowed" : "pointer",
                boxShadow: "0 0 22px rgba(56,189,248,0.25)",
              }}
            >
              {downloading ? "Generating Executive PDF…" : "📄 Executive PDF"}
            </button>

            {error ? (
              <div style={{ marginTop: 10, fontSize: 12, color: GP.severe }}>
                {error}
              </div>
            ) : (
              <div style={{ marginTop: 10, fontSize: 12, color: GP.textMuted }}>
                {loading ? "Fetching predictions…" : "System ready."}
              </div>
            )}
          </div>
        </div>

        {/* KPI strip */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 12,
            marginBottom: 18,
          }}
        >
          <KpiCard label="Severe Risk" value={tierCounts.severe} color={GP.severe} />
          <KpiCard label="High Risk" value={tierCounts["high risk"]} color={GP.high} />
          <KpiCard label="Watch" value={tierCounts.watch} color={GP.watch} />
          <KpiCard label="Preferred" value={tierCounts.preferred} color={GP.preferred} />
          <KpiCard label="Elite Safe" value={tierCounts["elite safe"]} color={GP.safe} />
        </div>

        {/* AI narrative */}
        <Panel
          title="AI Org Insight"
          subtitle="Narrative intelligence • executive-ready"
          rightSlot={
            <div
              style={{
                padding: "4px 10px",
                borderRadius: 999,
                border: "1px solid rgba(148,163,184,0.28)",
                background: "rgba(15,23,42,0.55)",
                color: GP.textSoft,
                fontSize: 11,
                letterSpacing: 0.2,
              }}
            >
              {loading ? "ANALYZING…" : safePredictions.length ? "INSIGHT READY" : "STANDBY"}
            </div>
          }
        >
          <div style={{ fontSize: 13, color: GP.text, lineHeight: 1.55 }}>
            {loading && "Calculating renewal risk…"}{" "}
            {!loading && safePredictions.length === 0 && (
              <>
                No prediction data yet. Executive AI is standing by — predictions activate automatically after vendors
                generate renewal signals (expirations, alerts, and reminder events).
              </>
            )}
            {!loading && safePredictions.length > 0 && (
              <>
                Your organization has <strong>{totalVendors}</strong> vendors analyzed with an average renewal risk of{" "}
                <strong>{avgRisk ?? "—"}</strong>.{" "}
                <strong style={{ color: GP.severe }}>{tierCounts.severe}</strong> Severe and{" "}
                <strong style={{ color: GP.high }}>{tierCounts["high risk"]}</strong> High Risk vendors require focus in the next 30–60 days.
              </>
            )}
          </div>
        </Panel>

        {/* Heatmap centerpiece */}
        <OrgRenewalPredictionHeatmap orgId={orgId} />

        {/* Tables */}
        <div
          style={{
            marginTop: 22,
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
            gap: 18,
          }}
        >
          <TableShell
            title="Top High‑Risk Vendors"
            subtitle="Severe or High Risk vendors (top 10 by score)"
            rows={highRiskVendors.slice(0, 10)}
            columns={[
              {
                key: "vendor_name",
                label: "Vendor",
                render: (r) => r?.vendor_name || "—",
              },
              {
                key: "risk_tier",
                label: "Tier",
                render: (r) => (
                  <span style={{ color: tierColor(r?.risk_tier), fontWeight: 700 }}>
                    {r?.risk_tier || "Unknown"}
                  </span>
                ),
              },
              { key: "risk_score", label: "Risk", render: (r) => clamp100(r?.risk_score) },
              {
                key: "likelihood_fail",
                label: "Fail %",
                render: (r) => `${clamp100(r?.likelihood_fail)}%`,
              },
            ]}
          />

          <TableShell
            title="Vendors Likely to Fail Renewal"
            subtitle="Failure likelihood ≥ 40% (top 10 by fail %)"
            rows={predictedFailures.slice(0, 10)}
            columns={[
              { key: "vendor_name", label: "Vendor", render: (r) => r?.vendor_name || "—" },
              { key: "risk_score", label: "Risk", render: (r) => clamp100(r?.risk_score) },
              { key: "likelihood_fail", label: "Fail %", render: (r) => `${clamp100(r?.likelihood_fail)}%` },
              { key: "likelihood_on_time", label: "On‑Time %", render: (r) => `${clamp100(r?.likelihood_on_time)}%` },
            ]}
          />
        </div>
      </div>

      <style jsx global>{`
        @keyframes pulseGlow {
          0% { filter: drop-shadow(0 0 0 rgba(56,189,248,0)); }
          50% { filter: drop-shadow(0 0 16px rgba(56,189,248,0.22)); }
          100% { filter: drop-shadow(0 0 0 rgba(56,189,248,0)); }
        }
      `}</style>
    </div>
  );
}

const thCell = {
  padding: "10px 10px",
  color: GP.textSoft,
  fontWeight: 700,
  textAlign: "left",
  borderBottom: "1px solid rgba(51,65,85,0.75)",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  background: "rgba(2,6,23,0.25)",
};

const tdCell = {
  padding: "10px 10px",
  color: GP.text,
  borderBottom: "1px solid rgba(51,65,85,0.45)",
  fontSize: 12,
};

const rowStyle = {
  background:
    "linear-gradient(90deg, rgba(15,23,42,0.98), rgba(15,23,42,0.92))",
};
