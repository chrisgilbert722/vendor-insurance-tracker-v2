// pages/admin/renewals/index.js
// Executive Renewal Prediction Dashboard (AI)

import { useEffect, useState } from "react";
import { useOrg } from "../../../context/OrgContext";
import OrgRenewalPredictionHeatmap from "../../../components/renewals/OrgRenewalPredictionHeatmap";

const GP = {
  bg: "#020617",
  text: "#e5e7eb",
  textSoft: "#9ca3af",
  borderSoft: "rgba(51,65,85,0.9)",
  panelBg: "rgba(15,23,42,0.98)",
  severe: "#fb7185",
  high: "#fbbf24",
  watch: "#facc15",
  preferred: "#38bdf8",
  safe: "#22c55e",
};

function computeTierCounts(predictions) {
  const counts = {
    severe: 0,
    "high risk": 0,
    watch: 0,
    preferred: 0,
    "elite safe": 0,
    unknown: 0,
  };
  predictions.forEach((p) => {
    const tier = (p.risk_tier || "").toLowerCase();
    if (counts[tier] !== undefined) counts[tier]++;
    else counts.unknown++;
  });
  return counts;
}

export default function RenewalPredictionDashboardPage() {
  const { activeOrgId: orgId } = useOrg();

  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!orgId) return;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(
          `/api/renewals/predict-org-v1?orgId=${encodeURIComponent(orgId)}`
        );
        const json = await res.json();
        if (!json.ok) throw new Error(json.error || "Failed to load predictions");
        setPredictions(json.predictions || []);
      } catch (err) {
        console.error("[RenewalPredictionDashboard] error:", err);
        setError(err.message || "Failed to load predictions");
      } finally {
        setLoading(false);
      }
    }

    load();
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
        throw new Error(err.error || "Failed generating PDF");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Executive_Renewal_Report_${orgId}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("PDF Error: " + err.message);
    } finally {
      setDownloading(false);
    }
  }

  const totalVendors = predictions.length;
  const avgRisk =
    totalVendors > 0
      ? Math.round(
          predictions.reduce((sum, p) => sum + (p.risk_score || 0), 0) /
            totalVendors
        )
      : null;

  const tierCounts = computeTierCounts(predictions);

  const highRiskVendors = predictions
    .filter((p) => {
      const tier = (p.risk_tier || "").toLowerCase();
      return tier === "severe" || tier === "high risk";
    })
    .sort((a, b) => b.risk_score - a.risk_score);

  const predictedFailures = predictions
    .filter((p) => (p.likelihood_fail || 0) >= 40)
    .sort((a, b) => b.likelihood_fail - a.likelihood_fail);
  return (
    <div
      style={{
        minHeight: "100vh",
        position: "relative",
        background:
          "radial-gradient(circle at top left,#020617 0,#020617 45%,#000 100%)",
        padding: "32px 40px 40px",
        color: GP.text,
      }}
    >
      {/* Aura */}
      <div
        style={{
          position: "absolute",
          top: -260,
          left: "50%",
          transform: "translateX(-50%)",
          width: 1200,
          height: 1200,
          background:
            "radial-gradient(circle, rgba(56,189,248,0.3), transparent 60%)",
          filter: "blur(140px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Shell */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          borderRadius: 32,
          padding: 22,
          background:
            "radial-gradient(circle at top left,rgba(15,23,42,0.98),rgba(15,23,42,0.95))",
          border: "1px solid rgba(148,163,184,0.45)",
          boxShadow: `
            0 0 60px rgba(15,23,42,0.95),
            0 0 80px rgba(15,23,42,0.9),
            inset 0 0 22px rgba(15,23,42,0.9)
          `,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 18,
            marginBottom: 20,
            flexWrap: "wrap",
          }}
        >
          {/* LEFT SIDE */}
          <div>
            <div
              style={{
                display: "inline-flex",
                gap: 8,
                padding: "4px 10px",
                borderRadius: 999,
                border: "1px solid rgba(148,163,184,0.4)",
                background:
                  "linear-gradient(120deg,rgba(15,23,42,0.94),rgba(15,23,42,0.7))",
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  color: GP.textSoft,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                }}
              >
                Org Renewal Command
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: "#38bdf8",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                AI Prediction Dashboard
              </span>
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: 26,
                fontWeight: 600,
              }}
            >
              Renewal risk for{" "}
              <span
                style={{
                  background:
                    "linear-gradient(90deg,#38bdf8,#a855f7,#f97316)",
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                }}
              >
                your entire portfolio
              </span>
              .
            </h1>

            <p
              style={{
                marginTop: 6,
                fontSize: 13,
                color: GP.textSoft,
                maxWidth: 640,
              }}
            >
              See which vendors are predicted to renew on time, who is likely
              to be late, and where renewal failure is most likely — before it
              happens.
            </p>
          </div>

          {/* RIGHT SNAPSHOT + PDF BTN */}
          <div
            style={{
              minWidth: 230,
              padding: 12,
              borderRadius: 18,
              border: "1px solid rgba(51,65,85,0.9)",
              background: "rgba(15,23,42,0.98)",
              fontSize: 12,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ color: GP.textSoft, marginBottom: 4 }}>
              Org Snapshot
            </div>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Vendors scored</span>
              <strong>{totalVendors}</strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Avg risk</span>
              <strong>{avgRisk == null ? "—" : avgRisk}</strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Predicted failures ≥40%</span>
              <strong>{predictedFailures.length}</strong>
            </div>

            <button
              onClick={downloadExecutivePdf}
              disabled={downloading}
              style={{
                marginTop: 6,
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid rgba(56,189,248,0.8)",
                background:
                  "radial-gradient(circle at top left,#38bdf8,#0ea5e9,#0f172a)",
                color: "#e0f2fe",
                fontSize: 11,
                fontWeight: 600,
                cursor: downloading ? "not-allowed" : "pointer",
                textAlign: "center",
                whiteSpace: "nowrap",
              }}
            >
              {downloading ? "Generating PDF…" : "📄 Executive PDF"}
            </button>
          </div>
        </div>

        {/* KPI STRIP */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <KpiCard label="Severe Risk" value={tierCounts.severe} color={GP.severe} />
          <KpiCard label="High Risk" value={tierCounts["high risk"]} color={GP.high} />
          <KpiCard label="Watch" value={tierCounts.watch} color={GP.watch} />
          <KpiCard label="Preferred" value={tierCounts.preferred} color={GP.preferred} />
          <KpiCard label="Elite Safe" value={tierCounts["elite safe"]} color={GP.safe} />
        </div>

        {/* AI SUMMARY */}
        <div
          style={{
            borderRadius: 18,
            padding: 14,
            marginBottom: 20,
            background: GP.panelBg,
            border: "1px solid rgba(51,65,85,0.9)",
          }}
        >
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: GP.textSoft,
              marginBottom: 6,
            }}
          >
            AI Org Insight
          </div>

          <div style={{ fontSize: 13, color: GP.text, lineHeight: 1.5 }}>
            {loading && "Calculating renewal risk…"}

            {!loading && predictions.length === 0 && (
              <>No prediction data yet.</>
            )}

            {!loading && predictions.length > 0 && (
              <>
                Your organization has <strong>{totalVendors}</strong> vendors
                analyzed with an average renewal risk of{" "}
                <strong>{avgRisk ?? "—"}</strong>.{" "}
                <strong>{tierCounts.severe}</strong> Severe risk vendors and{" "}
                <strong>{tierCounts["high risk"]}</strong> High Risk vendors
                require your team's focus in the next 30–60 days.
              </>
            )}
          </div>
        </div>

        {/* HEATMAP */}
        <OrgRenewalPredictionHeatmap orgId={orgId} />

        {/* TWO PANELS */}
        <div
          style={{
            marginTop: 30,
            display: "grid",
            gridTemplateColumns: "minmax(0,1.5fr) minmax(0,1.5fr)",
            gap: 20,
          }}
        >
          <HighRiskVendorsPanel vendors={highRiskVendors} />
          <PredictedFailuresPanel vendors={predictedFailures} />
        </div>

        {error && (
          <div style={{ marginTop: 16, fontSize: 13, color: GP.severe }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
/* ===========================
      COMPONENTS
=========================== */

function KpiCard({ label, value, color }) {
  return (
    <div
      style={{
        borderRadius: 18,
        padding: 10,
        border: "1px solid rgba(51,65,85,0.9)",
        background: GP.panelBg,
      }}
    >
      <div style={{ fontSize: 11, color: GP.textSoft }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function HighRiskVendorsPanel({ vendors }) {
  return (
    <div
      style={{
        borderRadius: 18,
        padding: 14,
        background: GP.panelBg,
        border: GP.borderSoft,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
        Top High-Risk Vendors
      </div>

      <div style={{ fontSize: 11, color: GP.textSoft, marginBottom: 8 }}>
        Vendors in Severe or High Risk tiers.
      </div>

      {vendors.length === 0 ? (
        <div style={{ fontSize: 12, color: GP.textSoft }}>
          No high-risk vendors.
        </div>
      ) : (
        <div style={{ maxHeight: 260, overflowY: "auto", paddingRight: 4 }}>
          <table
            style={{
              width: "100%",
              fontSize: 12,
              borderSpacing: 0,
              borderCollapse: "separate",
            }}
          >
            <thead>
              <tr>
                <th style={thCell}>Vendor</th>
                <th style={thCell}>Tier</th>
                <th style={thCell}>Risk</th>
                <th style={thCell}>Fail %</th>
              </tr>
            </thead>
            <tbody>
              {vendors.slice(0, 10).map((v) => (
                <tr key={v.vendor_id} style={rowStyle}>
                  <td style={tdCell}>{v.vendor_name}</td>
                  <td style={tdCell}>{v.risk_tier}</td>
                  <td style={tdCell}>{v.risk_score}</td>
                  <td style={tdCell}>{v.likelihood_fail ?? "—"}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
function PredictedFailuresPanel({ vendors }) {
  return (
    <div
      style={{
        borderRadius: 18,
        padding: 14,
        background: GP.panelBg,
        border: GP.borderSoft,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
        Vendors Likely to Fail Renewal
      </div>

      <div style={{ fontSize: 11, color: GP.textSoft, marginBottom: 8 }}>
        Vendors with failure likelihood ≥ 40%.
      </div>

      {vendors.length === 0 ? (
        <div style={{ fontSize: 12, color: GP.textSoft }}>
          No predicted failures.
        </div>
      ) : (
        <div style={{ maxHeight: 260, overflowY: "auto", paddingRight: 4 }}>
          <table
            style={{
              width: "100%",
              fontSize: 12,
              borderSpacing: 0,
              borderCollapse: "separate",
            }}
          >
            <thead>
              <tr>
                <th style={thCell}>Vendor</th>
                <th style={thCell}>Risk</th>
                <th style={thCell}>Fail %</th>
                <th style={thCell}>On-Time %</th>
              </tr>
            </thead>

            <tbody>
              {vendors.slice(0, 10).map((v) => (
                <tr key={v.vendor_id} style={rowStyle}>
                  <td style={tdCell}>{v.vendor_name}</td>
                  <td style={tdCell}>{v.risk_score}</td>
                  <td style={tdCell}>{v.likelihood_fail}%</td>
                  <td style={tdCell}>
                    {v.likelihood_on_time ?? "—"}%
                  </td>
                </tr>
              ))}
            </tbody>

          </table>
        </div>
      )}
    </div>
  );
}
/* ===========================
      TABLE STYLES
=========================== */

const thCell = {
  padding: "6px 8px",
  color: GP.textSoft,
  fontWeight: 600,
  textAlign: "left",
  borderBottom: "1px solid rgba(51,65,85,0.8)",
  fontSize: 11,
};

const tdCell = {
  padding: "6px 8px",
  color: GP.text,
  borderBottom: "1px solid rgba(51,65,85,0.5)",
  fontSize: 12,
};

const rowStyle = {
  background:
    "linear-gradient(90deg,rgba(15,23,42,0.98),rgba(15,23,42,0.94))",
};

