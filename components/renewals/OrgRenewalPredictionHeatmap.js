// components/renewals/OrgRenewalPredictionHeatmap.js
import { useEffect, useState } from "react";

const GP = {
  severe: "#fb7185",
  high: "#fbbf24",
  watch: "#facc15",
  preferred: "#38bdf8",
  safe: "#22c55e",
  unknown: "#64748b",
  text: "#e5e7eb",
  bg: "rgba(15,23,42,0.96)",
  border: "1px solid rgba(51,65,85,0.9)"
};

function getColor(tier) {
  switch ((tier || "").toLowerCase()) {
    case "severe": return GP.severe;
    case "high risk": return GP.high;
    case "watch": return GP.watch;
    case "preferred": return GP.preferred;
    case "elite safe": return GP.safe;
    default: return GP.unknown;
  }
}

export default function OrgRenewalPredictionHeatmap({ orgId }) {
  const [loading, setLoading] = useState(true);
  const [predictions, setPredictions] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!orgId) return;

    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`/api/renewals/predict-org-v1?orgId=${orgId}`);
        const json = await res.json();
        if (!json.ok) throw new Error(json.error);
        setPredictions(json.predictions);
      } catch (err) {
        setError(err.message || "Failed loading predictions.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [orgId]);

  return (
    <div
      style={{
        marginTop: 30,
        padding: 20,
        borderRadius: 20,
        background: GP.bg,
        border: GP.border
      }}
    >
      <h2
        style={{
          margin: 0,
          fontSize: 18,
          fontWeight: 600,
          color: GP.text,
          marginBottom: 12
        }}
      >
        Renewal Prediction Heatmap (AI)
      </h2>

      {loading && (
        <div style={{ color: GP.text }}>Loading predictions...</div>
      )}

      {error && (
        <div style={{ color: GP.severe }}>{error}</div>
      )}

      {!loading && predictions.length === 0 && (
        <div style={{ color: GP.text }}>No prediction data yet.</div>
      )}

      {!loading && predictions.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: 12
          }}
        >
          {predictions.map((p) => (
            <div
              key={p.vendor_id}
              style={{
                borderRadius: 16,
                padding: 10,
                background: "rgba(2,6,23,0.8)",
                border: GP.border
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: GP.text,
                  marginBottom: 6
                }}
              >
                {p.vendor_name}
              </div>

              {/* Score Bar */}
              <div
                style={{
                  height: 8,
                  width: "100%",
                  borderRadius: 10,
                  overflow: "hidden",
                  background: "#1e293b",
                  marginBottom: 8
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${p.risk_score}%`,
                    background: getColor(p.risk_tier)
                  }}
                />
              </div>

              <div
                style={{
                  fontSize: 12,
                  color: getColor(p.risk_tier),
                  fontWeight: 700
                }}
              >
                {p.risk_tier}
              </div>

              <div
                style={{
                  fontSize: 11,
                  color: GP.text,
                  marginTop: 4,
                  lineHeight: 1.4
                }}
              >
                <div>On-Time: {p.likelihood_on_time}%</div>
                <div>Late: {p.likelihood_late}%</div>
                <div>Fail: {p.likelihood_fail}%</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
