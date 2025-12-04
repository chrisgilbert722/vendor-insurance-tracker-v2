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

          <div
            style={{
              minWidth: 230,
              padding: 12,
              borderRadius: 18,
              border: "1px solid rgba(51,65,85,0.9)",
              background: "rgba(15,23,42,0.98)",
              fontSize: 12,
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
          </div>
        </div>

        {/* KPI Strip */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <KpiCard
            label="Severe Risk"
            value={tierCounts.severe}
            color={GP.severe}
          />
          <KpiCard
            label="High Risk"
            value={tierCounts["high risk"]}
            color={GP.high}
          />
          <KpiCard
            label="Watch"
            value={tierCounts.watch}
            color={GP.watch}
          />
          <KpiCard
            label="Preferred"
            value={tierCounts.preferred}
            color={GP.preferred}
          />
          <KpiCard
            label="Elite Safe"
            value={tierCounts["elite safe"]}
            color={GP.safe}
          />
        </div>

        {/* AI-ish summary (rule-based narrative) */}
        <div
          style={{
            borderRadius: 18,
            padding: 14,
            marginBottom: 20,
            background: "rgba(15,23,42,0.96)",
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
          <div
            style={{
              fontSize: 13,
              color: GP.text,
              lineHeight: 1.5,
            }}
          >
            {loading && "Calculating renewal risk for this organization…"}
            {!loading && predictions.length === 0 && (
              <>No prediction data yet. Run vendor predictions to populate this view.</>
            )}
            {!loading && predictions.length > 0 && (
              <>
                Your organization currently has{" "}
                <strong>{totalVendors}</strong> vendors scored, with an
                average renewal risk of{" "}
                <strong>{avgRisk ?? "—"}</strong>.{" "}
                <strong>{tierCounts.severe}</strong> vendors are in{" "}
                <span style={{ color: GP.severe }}>Severe</span> risk and{" "}
                <strong>{tierCounts["high risk"]}</strong> in{" "}
                <span style={{ color: GP.high }}>High Risk</span>, suggesting
                where renewal follow-up and escalation should focus in the next
                30–60 days.
              </>
            )}
          </div>
        </div>

        {/* Heatmap */}
        <OrgRenewalPredictionHeatmap orgId={orgId} />

        {/* High-Risk Vendors + Predicted Failures */}
        <div
          style={{
            marginTop: 30,
            display: "grid",
            gridTemplateColumns: "minmax(0,1.5fr) minmax(0,1.5fr)",
            gap: 20,
            alignItems: "flex-start",
          }}
        >
          <HighRiskVendorsPanel vendors={highRiskVendors} />
          <PredictedFailuresPanel vendors={predictedFailures} />
        </div>

        {/* Error state */}
        {error && (
          <div
            style={{
              marginTop: 16,
              fontSize: 13,
              color: GP.severe,
            }}
          >
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

/* =============== Small Components =============== */

function KpiCard({ label, value, color }) {
  return (
    <div
      style={{
        borderRadius: 18,
        padding: 10,
        border: "1px solid rgba(51,65,85,0.9)",
        background: "rgba(15,23,42,0.98)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: GP.textSoft,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: color,
        }}
      >
        {value}
      </div>
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
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          marginBottom: 6,
        }}
      >
        Top High-Risk Vendors
      </div>
      <div
        style={{
          fontSize: 11,
          color: GP.textSoft,
          marginBottom: 8,
        }}
      >
        Vendors in Severe or High Risk tiers, sorted by risk score.
      </div>

      {vendors.length === 0 && (
        <div style={{ fontSize: 12, color: GP.textSoft }}>
          No high-risk vendors at this time.
        </div>
      )}

      {vendors.length > 0 && (
        <div
          style={{
            maxHeight: 260,
            overflowY: "auto",
            paddingRight: 4,
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "separate",
              borderSpacing: 0,
              fontSize: 12,
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
                  <td style={tdCell}>
                    {v.likelihood_fail != null ? v.likelihood_fail : "—"}%
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
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          marginBottom: 6,
        }}
      >
        Vendors Likely to Fail Renewal
      </div>
      <div
        style={{
          fontSize: 11,
          color: GP.textSoft,
          marginBottom: 8,
        }}
      >
        Vendors with failure likelihood ≥ 40% — focus for early intervention.
      </div>

      {vendors.length === 0 && (
        <div style={{ fontSize: 12, color: GP.textSoft }}>
          No vendors currently flagged as likely to fail renewal.
        </div>
      )}

      {vendors.length > 0 && (
        <div
          style={{
            maxHeight: 260,
            overflowY: "auto",
            paddingRight: 4,
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "separate",
              borderSpacing: 0,
              fontSize: 12,
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
                    {v.likelihood_on_time != null
                      ? v.likelihood_on_time
                      : "—"}
                    %
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

/* mini table styles */
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
