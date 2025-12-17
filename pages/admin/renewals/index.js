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
  (Array.isArray(predictions) ? predictions : []).forEach((p) => {
    const tier = (p?.risk_tier || "").toLowerCase();
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
    if (!orgId) {
      setPredictions([]);
      setLoading(false);
      return;
    }

    async function load() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(
          `/api/renewals/predict-org-v1?orgId=${encodeURIComponent(orgId)}`
        );
        const json = await res.json();
        if (!json.ok) throw new Error(json.error || "Failed to load predictions");

        setPredictions(Array.isArray(json.predictions) ? json.predictions : []);
      } catch (err) {
        console.error("[RenewalPredictionDashboard] error:", err);
        setError(err.message || "Failed to load predictions");
        setPredictions([]);
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

  const safePredictions = Array.isArray(predictions) ? predictions : [];
  const totalVendors = safePredictions.length;

  const avgRisk =
    totalVendors > 0
      ? Math.round(
          safePredictions.reduce((sum, p) => sum + (p?.risk_score || 0), 0) /
            totalVendors
        )
      : null;

  const tierCounts = computeTierCounts(safePredictions);

  const highRiskVendors = safePredictions
    .filter((p) => {
      const tier = (p?.risk_tier || "").toLowerCase();
      return tier === "severe" || tier === "high risk";
    })
    .sort((a, b) => (b?.risk_score || 0) - (a?.risk_score || 0));

  const predictedFailures = safePredictions
    .filter((p) => (p?.likelihood_fail || 0) >= 40)
    .sort((a, b) => (b?.likelihood_fail || 0) - (a?.likelihood_fail || 0));

  return (
    <div style={{ minHeight: "100vh", padding: "32px 40px 40px", color: GP.text }}>
      <h1>Renewal risk for your entire portfolio</h1>

      <div style={{ marginBottom: 12 }}>
        Vendors scored: <strong>{totalVendors}</strong> · Avg risk:{" "}
        <strong>{avgRisk ?? "—"}</strong> · Predicted failures ≥40%:{" "}
        <strong>{predictedFailures.length}</strong>
      </div>

      {loading && <div>Loading renewal predictions…</div>}
      {error && <div style={{ color: GP.severe }}>{error}</div>}

      {!loading && (
        <>
          <OrgRenewalPredictionHeatmap orgId={orgId} />

          <div style={{ marginTop: 20 }}>
            <h3>Top High-Risk Vendors</h3>
            {highRiskVendors.length === 0 ? (
              <div>No high-risk vendors.</div>
            ) : (
              highRiskVendors.slice(0, 10).map((v) => (
                <div key={v.vendor_id}>
                  {v.vendor_name} — {v.risk_tier} ({v.risk_score})
                </div>
              ))
            )}
          </div>

          <div style={{ marginTop: 20 }}>
            <h3>Vendors Likely to Fail Renewal</h3>
            {predictedFailures.length === 0 ? (
              <div>No predicted failures.</div>
            ) : (
              predictedFailures.slice(0, 10).map((v) => (
                <div key={v.vendor_id}>
                  {v.vendor_name} — Fail {v.likelihood_fail}%
                </div>
              ))
            )}
          </div>
        </>
      )}

      <button
        onClick={downloadExecutivePdf}
        disabled={downloading}
        style={{ marginTop: 20 }}
      >
        {downloading ? "Generating PDF…" : "📄 Executive PDF"}
      </button>
    </div>
  );
}
