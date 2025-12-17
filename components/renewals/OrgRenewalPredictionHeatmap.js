// components/renewals/OrgRenewalPredictionHeatmap.js
// ============================================================
// RENEWAL HEATMAP V5 — CINEMATIC GRID
// - Iron‑Man cockpit tile grid + legend + hover stats
// - Defensive data handling (no unsafe .length)
// ============================================================

import { useEffect, useMemo, useState } from "react";

const GP = {
  severe: "#fb7185",
  high: "#fbbf24",
  watch: "#facc15",
  preferred: "#38bdf8",
  safe: "#22c55e",
  unknown: "#64748b",
  text: "#e5e7eb",
  textSoft: "#9ca3af",
  textMuted: "#6b7280",
  bg: "rgba(15,23,42,0.92)",
  border: "1px solid rgba(51,65,85,0.9)",
};

function getColor(tier) {
  switch ((tier || "").toLowerCase()) {
    case "severe":
      return GP.severe;
    case "high risk":
      return GP.high;
    case "watch":
      return GP.watch;
    case "preferred":
      return GP.preferred;
    case "elite safe":
      return GP.safe;
    default:
      return GP.unknown;
  }
}

function clamp100(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(100, Math.round(x)));
}

export default function OrgRenewalPredictionHeatmap({ orgId }) {
  const [loading, setLoading] = useState(true);
  const [predictions, setPredictions] = useState([]);
  const [error, setError] = useState("");
  const [hover, setHover] = useState(null);

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
          throw new Error(json?.error || "Failed loading predictions.");
        }

        if (!alive) return;
        setPredictions(Array.isArray(json.predictions) ? json.predictions : []);
      } catch (err) {
        console.error("[OrgRenewalPredictionHeatmap] error:", err);
        if (!alive) return;
        setError(err?.message || "Failed loading predictions.");
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

  const safePredictions = Array.isArray(predictions) ? predictions : [];

  const summary = useMemo(() => {
    const total = safePredictions.length;
    const severe = safePredictions.filter((p) => (p?.risk_tier || "").toLowerCase() === "severe").length;
    const high = safePredictions.filter((p) => (p?.risk_tier || "").toLowerCase() === "high risk").length;
    const fail40 = safePredictions.filter((p) => (Number(p?.likelihood_fail) || 0) >= 40).length;
    return { total, severe, high, fail40 };
  }, [safePredictions]);

  return (
    <div
      style={{
        marginTop: 18,
        padding: 16,
        borderRadius: 28,
        background:
          "radial-gradient(circle at 15% 0%, rgba(56,189,248,0.10), transparent 45%), radial-gradient(circle at 85% 20%, rgba(168,85,247,0.08), transparent 45%), rgba(15,23,42,0.86)",
        border: "1px solid rgba(148,163,184,0.28)",
        boxShadow:
          "0 22px 60px rgba(0,0,0,0.55), inset 0 0 26px rgba(0,0,0,0.55)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 12, color: GP.textSoft, textTransform: "uppercase", letterSpacing: "0.16em" }}>
            Renewal Prediction Heatmap
          </div>
          <div style={{ marginTop: 6, fontSize: 13, color: GP.textMuted }}>
            Grid intelligence • hover any tile for vendor detail
          </div>
        </div>

        {/* Legend + quick stats */}
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <LegendPill label="Severe" color={GP.severe} />
          <LegendPill label="High" color={GP.high} />
          <LegendPill label="Watch" color={GP.watch} />
          <LegendPill label="Preferred" color={GP.preferred} />
          <LegendPill label="Elite Safe" color={GP.safe} />

          <div
            style={{
              marginLeft: 6,
              padding: "6px 10px",
              borderRadius: 999,
              border: "1px solid rgba(51,65,85,0.7)",
              background: "rgba(2,6,23,0.35)",
              fontSize: 11,
              color: GP.textSoft,
              display: "inline-flex",
              gap: 10,
              alignItems: "center",
              whiteSpace: "nowrap",
            }}
          >
            <span>Total: <strong style={{ color: GP.text }}>{summary.total}</strong></span>
            <span>Fail ≥40%: <strong style={{ color: GP.severe }}>{summary.fail40}</strong></span>
          </div>
        </div>
      </div>

      {/* Status */}
      <div style={{ marginTop: 12 }}>
        {loading && <div style={{ color: GP.textSoft, fontSize: 12 }}>Loading predictions…</div>}
        {!loading && error && <div style={{ color: GP.severe, fontSize: 12 }}>{error}</div>}
        {!loading && !error && safePredictions.length === 0 && (
          <div style={{ color: GP.textSoft, fontSize: 12 }}>
            No prediction data yet.
          </div>
        )}
      </div>

      {/* Grid + hover inspector */}
      {!loading && safePredictions.length > 0 && (
        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: "minmax(0, 2.2fr) minmax(0, 1fr)",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div
            style={{
              borderRadius: 22,
              border: "1px solid rgba(51,65,85,0.7)",
              background: "rgba(2,6,23,0.35)",
              padding: 12,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                gap: 12,
              }}
            >
              {safePredictions.map((p) => {
                const c = getColor(p?.risk_tier);
                const score = clamp100(p?.risk_score);
                return (
                  <button
                    key={p.vendor_id}
                    onMouseEnter={() => setHover(p)}
                    onMouseLeave={() => setHover(null)}
                    style={{
                      textAlign: "left",
                      borderRadius: 18,
                      padding: 12,
                      background:
                        "linear-gradient(145deg, rgba(15,23,42,0.95), rgba(2,6,23,0.6))",
                      border: `1px solid ${c}55`,
                      boxShadow: `0 0 18px ${c}22, inset 0 0 18px rgba(0,0,0,0.5)`,
                      cursor: "default",
                      outline: "none",
                    }}
                    type="button"
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, color: GP.text, marginBottom: 8 }}>
                      {p.vendor_name || "Unknown Vendor"}
                    </div>

                    <div
                      style={{
                        height: 8,
                        width: "100%",
                        borderRadius: 999,
                        overflow: "hidden",
                        background: "rgba(30,41,59,1)",
                        marginBottom: 10,
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${score}%`,
                          background: c,
                          boxShadow: `0 0 16px ${c}`,
                        }}
                      />
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: c, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        {p.risk_tier || "Unknown"}
                      </div>
                      <div style={{ fontSize: 11, color: GP.textSoft }}>
                        Risk <strong style={{ color: GP.text }}>{score}</strong>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div
            style={{
              borderRadius: 22,
              border: "1px solid rgba(51,65,85,0.7)",
              background: "rgba(2,6,23,0.35)",
              padding: 12,
              position: "sticky",
              top: 12,
            }}
          >
            <div style={{ fontSize: 11, color: GP.textSoft, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 10 }}>
              Hover Inspector
            </div>

            {!hover ? (
              <div style={{ fontSize: 12, color: GP.textMuted, lineHeight: 1.55 }}>
                Hover a vendor tile to view operational detail.
                <div style={{ marginTop: 8, color: GP.textSoft }}>
                  Tip: start generating predictions by running <strong>Predict V1</strong> on vendors.
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: GP.text }}>
                <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 6 }}>
                  {hover.vendor_name || "Unknown Vendor"}
                </div>

                <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                  <span
                    style={{
                      padding: "4px 10px",
                      borderRadius: 999,
                      border: `1px solid ${getColor(hover.risk_tier)}55`,
                      color: getColor(hover.risk_tier),
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      background: "rgba(15,23,42,0.7)",
                      fontSize: 11,
                    }}
                  >
                    {hover.risk_tier || "Unknown"}
                  </span>
                  <span style={{ color: GP.textSoft }}>
                    Risk <strong style={{ color: GP.text }}>{clamp100(hover.risk_score)}</strong>
                  </span>
                </div>

                <div style={{ color: GP.textSoft, lineHeight: 1.6 }}>
                  <div>On‑Time: <strong style={{ color: GP.text }}>{clamp100(hover.likelihood_on_time)}%</strong></div>
                  <div>Late: <strong style={{ color: GP.text }}>{clamp100(hover.likelihood_late)}%</strong></div>
                  <div>Fail: <strong style={{ color: GP.severe }}>{clamp100(hover.likelihood_fail)}%</strong></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function LegendPill({ label, color }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        borderRadius: 999,
        border: `1px solid ${color}55`,
        background: "rgba(2,6,23,0.35)",
        color: GP.textSoft,
        fontSize: 11,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: color,
          boxShadow: `0 0 12px ${color}`,
        }}
      />
      {label}
    </div>
  );
}
