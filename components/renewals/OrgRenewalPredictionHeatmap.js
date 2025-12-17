// components/renewals/OrgRenewalPredictionHeatmap.js
// ============================================================
// RENEWAL HEATMAP V5 — EXEC HUD GRID
// Fully aligned with CommandShell / Alerts / Renewals / AI Setup
// ============================================================

import { useEffect, useMemo, useState } from "react";
import { V5 } from "../v5/v5Theme";

/* ------------------------------------------------------------
   HELPERS
------------------------------------------------------------ */
function tierColor(tier) {
  const t = String(tier || "").toLowerCase();
  if (t === "severe") return V5.red;
  if (t === "high risk") return V5.yellow;
  if (t === "watch") return V5.orange;
  if (t === "preferred") return V5.blue;
  if (t === "elite safe") return V5.green;
  return V5.soft;
}

function clamp100(n) {
  const x = Number(n);
  return Number.isFinite(x) ? Math.max(0, Math.min(100, Math.round(x))) : 0;
}

/* ------------------------------------------------------------
   COMPONENT
------------------------------------------------------------ */
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

    (async () => {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(
          `/api/renewals/predict-org-v1?orgId=${encodeURIComponent(orgId)}`
        );
        const json = await res.json().catch(() => ({}));

        if (!json?.ok) throw new Error(json?.error || "Load failed");

        if (!alive) return;
        setPredictions(Array.isArray(json.predictions) ? json.predictions : []);
      } catch (e) {
        if (!alive) return;
        setError(e.message || "Failed loading predictions");
        setPredictions([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => (alive = false);
  }, [orgId]);

  const safe = Array.isArray(predictions) ? predictions : [];

  const summary = useMemo(() => {
    return {
      total: safe.length,
      severe: safe.filter(
        (p) => String(p?.risk_tier).toLowerCase() === "severe"
      ).length,
      high: safe.filter(
        (p) => String(p?.risk_tier).toLowerCase() === "high risk"
      ).length,
      fail40: safe.filter((p) => (Number(p?.likelihood_fail) || 0) >= 40).length,
    };
  }, [safe]);

  return (
    <div
      style={{
        marginTop: 22,
        padding: 18,
        borderRadius: 28,
        border: `1px solid ${V5.border}`,
        background: V5.panel,
        boxShadow:
          "0 0 40px rgba(0,0,0,0.6), inset 0 0 28px rgba(0,0,0,0.65)",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 14,
          alignItems: "flex-start",
          flexWrap: "wrap",
          marginBottom: 14,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 12,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: V5.soft,
            }}
          >
            Renewal Prediction Heatmap
          </div>
          <div style={{ marginTop: 6, fontSize: 13, color: V5.muted }}>
            Portfolio-level risk grid • hover for vendor intelligence
          </div>
        </div>

        {/* LEGEND */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Legend label="Severe" color={V5.red} />
          <Legend label="High" color={V5.yellow} />
          <Legend label="Watch" color={V5.orange} />
          <Legend label="Preferred" color={V5.blue} />
          <Legend label="Elite Safe" color={V5.green} />

          <div
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              border: `1px solid ${V5.border}`,
              background: "rgba(2,6,23,0.45)",
              fontSize: 11,
              color: V5.soft,
              whiteSpace: "nowrap",
            }}
          >
            Total <strong style={{ color: V5.text }}>{summary.total}</strong> ·
            Fail ≥40%{" "}
            <strong style={{ color: V5.red }}>{summary.fail40}</strong>
          </div>
        </div>
      </div>

      {/* STATUS */}
      {loading && (
        <div style={{ fontSize: 12, color: V5.soft }}>
          Loading predictions…
        </div>
      )}
      {!loading && error && (
        <div style={{ fontSize: 12, color: V5.red }}>{error}</div>
      )}
      {!loading && !error && safe.length === 0 && (
        <div style={{ fontSize: 12, color: V5.soft }}>
          No prediction data yet.
        </div>
      )}

      {/* GRID */}
      {!loading && safe.length > 0 && (
        <div
          style={{
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: "minmax(0,2.3fr) minmax(0,1fr)",
            gap: 18,
          }}
        >
          {/* TILES */}
          <div
            style={{
              borderRadius: 22,
              border: `1px solid ${V5.border}`,
              background: "rgba(2,6,23,0.45)",
              padding: 14,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))",
                gap: 14,
              }}
            >
              {safe.map((p) => {
                const c = tierColor(p?.risk_tier);
                const score = clamp100(p?.risk_score);

                return (
                  <div
                    key={p.vendor_id}
                    onMouseEnter={() => setHover(p)}
                    onMouseLeave={() => setHover(null)}
                    style={{
                      borderRadius: 20,
                      padding: 14,
                      border: `1px solid ${c}55`,
                      background: V5.panel,
                      boxShadow: `0 0 20px ${c}22, inset 0 0 22px rgba(0,0,0,0.6)`,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        marginBottom: 10,
                      }}
                    >
                      {p.vendor_name || "Unknown Vendor"}
                    </div>

                    <div
                      style={{
                        height: 8,
                        borderRadius: 999,
                        background: "rgba(30,41,59,1)",
                        overflow: "hidden",
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

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 11,
                      }}
                    >
                      <span
                        style={{
                          color: c,
                          fontWeight: 900,
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                        }}
                      >
                        {p.risk_tier || "Unknown"}
                      </span>
                      <span style={{ color: V5.soft }}>
                        Risk{" "}
                        <strong style={{ color: V5.text }}>{score}</strong>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* INSPECTOR */}
          <div
            style={{
              borderRadius: 22,
              border: `1px solid ${V5.border}`,
              background: "rgba(2,6,23,0.45)",
              padding: 16,
              position: "sticky",
              top: 16,
            }}
          >
            <div
              style={{
                fontSize: 11,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: V5.soft,
                marginBottom: 10,
              }}
            >
              Hover Inspector
            </div>

            {!hover ? (
              <div style={{ fontSize: 12, color: V5.muted, lineHeight: 1.6 }}>
                Hover a vendor tile to inspect renewal intelligence.
              </div>
            ) : (
              <div style={{ fontSize: 12 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 900,
                    marginBottom: 8,
                  }}
                >
                  {hover.vendor_name || "Unknown Vendor"}
                </div>

                <div
                  style={{
                    marginBottom: 12,
                    padding: "4px 10px",
                    borderRadius: 999,
                    border: `1px solid ${tierColor(hover.risk_tier)}55`,
                    display: "inline-block",
                    color: tierColor(hover.risk_tier),
                    fontWeight: 900,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  {hover.risk_tier || "Unknown"}
                </div>

                <div style={{ color: V5.soft, lineHeight: 1.6 }}>
                  <div>
                    On-Time:{" "}
                    <strong style={{ color: V5.text }}>
                      {clamp100(hover.likelihood_on_time)}%
                    </strong>
                  </div>
                  <div>
                    Late:{" "}
                    <strong style={{ color: V5.text }}>
                      {clamp100(hover.likelihood_late)}%
                    </strong>
                  </div>
                  <div>
                    Fail:{" "}
                    <strong style={{ color: V5.red }}>
                      {clamp100(hover.likelihood_fail)}%
                    </strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------
   LEGEND
------------------------------------------------------------ */
function Legend({ label, color }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        borderRadius: 999,
        border: `1px solid ${color}55`,
        background: "rgba(2,6,23,0.45)",
        color: V5.soft,
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
