// components/renewals/RenewalPredictionPanel.js
import { useEffect, useState } from "react";

const GP = {
  text: "#e5e7eb",
  textSoft: "#9ca3af",
  red: "#fb7185",
  gold: "#facc15",
  green: "#22c55e",
  panelBg: "rgba(15,23,42,0.96)",
  border: "1px solid rgba(51,65,85,0.9)",
};

export default function RenewalPredictionPanel({ vendorId, orgId }) {
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState("");

  async function fetchPrediction() {
    if (!vendorId || !orgId) return;
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/renewals/predict-v1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, vendorId }),
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Prediction failed");

      const p = json.predictions?.[0] || null;
      setPrediction(p);
    } catch (err) {
      setError(err.message || "Failed to load prediction");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPrediction();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId, orgId]);

  const scoreColor =
    prediction?.risk_score >= 80
      ? GP.red
      : prediction?.risk_score >= 60
      ? GP.gold
      : GP.green;

  return (
    <div
      style={{
        marginTop: 30,
        padding: 16,
        borderRadius: 18,
        background: GP.panelBg,
        border: GP.border,
      }}
    >
      <div
        style={{
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: GP.textSoft,
          marginBottom: 8,
        }}
      >
        Renewal Prediction (AI)
      </div>

      {loading && (
        <div style={{ fontSize: 13, color: GP.textSoft }}>
          Calculating renewal risk…
        </div>
      )}

      {error && !loading && (
        <div style={{ fontSize: 13, color: GP.red }}>{error}</div>
      )}

      {!loading && !error && prediction && (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: scoreColor,
                }}
              >
                {prediction.risk_score}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: GP.textSoft,
                }}
              >
                Risk score (higher = more risk)
              </div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: 13,
                  color: GP.text,
                  fontWeight: 600,
                }}
              >
                {prediction.risk_tier}
              </div>
            </div>

            <div
              style={{
                fontSize: 11,
                color: GP.textSoft,
                textAlign: "right",
              }}
            >
              <div>
                On-time:{" "}
                <strong>{prediction.likelihood_on_time}%</strong>
              </div>
              <div>
                Late: <strong>{prediction.likelihood_late}%</strong>
              </div>
              <div>
                Failure: <strong>{prediction.likelihood_fail}%</strong>
              </div>
            </div>
          </div>

          {prediction.summary && (
            <div
              style={{
                marginTop: 10,
                fontSize: 12,
                color: GP.textSoft,
              }}
            >
              {prediction.summary}
            </div>
          )}

          <button
            onClick={fetchPrediction}
            style={{
              marginTop: 12,
              padding: "6px 12px",
              borderRadius: 999,
              border: "1px solid rgba(56,189,248,0.8)",
              background:
                "radial-gradient(circle at top left,#38bdf8,#0ea5e9,#0f172a)",
              color: "#e0f2fe",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            🔁 Recalculate Prediction
          </button>
        </>
      )}

      {!loading && !error && !prediction && (
        <div style={{ fontSize: 12, color: GP.textSoft }}>
          No prediction available yet.
          <button
            onClick={fetchPrediction}
            style={{
              marginLeft: 8,
              padding: "4px 8px",
              borderRadius: 999,
              border: "1px solid rgba(56,189,248,0.8)",
              background: "rgba(15,23,42,0.96)",
              color: "#e0f2fe",
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            Run now
          </button>
        </div>
      )}
    </div>
  );
}
