// pages/renewals/index.js

import { useState, useEffect } from "react";
import { useOrg } from "../../context/OrgContext";
import RenewalTable from "../../components/renewals/RenewalTable";
import RenewalTimelineChart from "../../components/renewals/RenewalTimelineChart";

export default function RenewalPage() {
  const { activeOrgId: orgId } = useOrg();

  // Filters
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [coverageFilter, setCoverageFilter] = useState("all");

  // AI insights (renewal insights summary)
  const [insights, setInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  // Risk ML forecast
  const [forecast, setForecast] = useState([]);
  const [loadingForecast, setLoadingForecast] = useState(false);

  async function loadInsights() {
    if (!orgId) return;
    try {
      setLoadingInsights(true);
      const res = await fetch(`/api/ai/renewal-insights?orgId=${orgId}`);
      const data = await res.json();
      if (data.ok) setInsights(data.insights);
    } catch (_) {
      // ignore
    }
    setLoadingInsights(false);
  }

  async function loadForecast() {
    if (!orgId) return;
    try {
      setLoadingForecast(true);
      const res = await fetch(`/api/renewals/forecast?orgId=${orgId}`);
      const data = await res.json();
      if (data.ok) {
        setForecast(data.forecast || []);
      }
    } catch (_) {
      // ignore
    }
    setLoadingForecast(false);
  }

  useEffect(() => {
    loadInsights();
    loadForecast();
  }, [orgId]);

  // Derived Risk ML stats
  const highRisk = forecast.filter((f) => f.risk_bucket === "high_risk_fail");
  const atRisk = forecast.filter((f) => f.risk_bucket === "at_risk");
  const watch = forecast.filter((f) => f.risk_bucket === "watch");

  const topRiskVendors = [...forecast]
    .sort((a, b) => b.risk_score - a.risk_score)
    .slice(0, 3);

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left,#020617,#020617 45%,#000 100%)",
        padding: "32px 40px 40px",
        color: "#e5e7eb",
        position: "relative",
      }}
    >
      {/* AURA */}
      <div
        style={{
          position: "absolute",
          top: -220,
          left: "50%",
          transform: "translateX(-50%)",
          width: 1200,
          height: 1200,
          background:
            "radial-gradient(circle, rgba(59,130,246,0.40), transparent 60%)",
          filter: "blur(140px)",
          pointerEvents: "none",
        }}
      />

      {/* MAIN COCKPIT */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          borderRadius: 32,
          padding: 24,
          background:
            "radial-gradient(circle at top left,rgba(15,23,42,0.98),rgba(15,23,42,0.9))",
          border: "1px solid rgba(148,163,184,0.45)",
          boxShadow: `
            0 0 60px rgba(15,23,42,0.95),
            inset 0 0 20px rgba(15,23,42,0.9)
          `,
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 16,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              padding: 12,
              borderRadius: 999,
              background:
                "radial-gradient(circle at 30% 0,#0ea5e9,#6366f1,#0f172a)",
              boxShadow: "0 0 40px rgba(56,189,248,0.6)",
            }}
          >
            <span style={{ fontSize: 26 }}>⏳</span>
          </div>

          <div>
            <div
              style={{
                display: "inline-flex",
                gap: 8,
                padding: "4px 12px",
                borderRadius: 999,
                border: "1px solid rgba(148,163,184,0.4)",
                background:
                  "linear-gradient(120deg,rgba(15,23,42,0.9),rgba(15,23,42,0.7))",
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  color: "#9ca3af",
                  letterSpacing: 1.2,
                  textTransform: "uppercase",
                }}
              >
                Renewals V2
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: "#38bdf8",
                  letterSpacing: 1,
                  textTransform: "uppercase",
                }}
              >
                AI Insights + Risk ML
              </span>
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: 28,
                fontWeight: 600,
              }}
            >
              Renewal Automation{" "}
              <span
                style={{
                  background:
                    "linear-gradient(90deg,#38bdf8,#a855f7,#f97316)",
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                }}
              >
                Cockpit
              </span>
            </h1>

            <p
              style={{
                marginTop: 6,
                fontSize: 13,
                color: "#cbd5f5",
                maxWidth: 680,
              }}
            >
              View upcoming expirations, filter by stage, find high-risk vendors,
              and let AI + Risk ML prioritize who to chase first.
            </p>
          </div>
        </div>

        {/* AI INSIGHTS PANEL */}
        <div
          style={{
            borderRadius: 20,
            padding: 16,
            background: "rgba(15,23,42,0.92)",
            border: "1px solid rgba(56,189,248,0.4)",
            marginBottom: 16,
            boxShadow: "0 0 25px rgba(56,189,248,0.25)",
          }}
        >
          <div
            style={{
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: 1.2,
              color: "#38bdf8",
              marginBottom: 8,
              fontWeight: 600,
            }}
          >
            AI Renewal Insights
          </div>

          {loadingInsights && (
            <div style={{ fontSize: 12, color: "#94a3b8" }}>
              Thinking…
            </div>
          )}

          {!loadingInsights && insights && (
            <>
              <div style={{ fontSize: 13, marginBottom: 10 }}>
                {insights.summary}
              </div>

              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12 }}>
                {insights.priority_list?.map((item, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>
                    {item}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* RISK ML FORECAST STRIP */}
        <div
          style={{
            borderRadius: 18,
            padding: 14,
            marginBottom: 22,
            background: "rgba(15,23,42,0.96)",
            border: "1px solid rgba(148,163,184,0.4)",
            display: "grid",
            gridTemplateColumns: "1.4fr 1.6fr",
            gap: 14,
            alignItems: "flex-start",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 1.2,
                color: "#9ca3af",
                marginBottom: 6,
              }}
            >
              Risk ML Forecast
            </div>

            {loadingForecast ? (
              <div style={{ fontSize: 12, color: "#94a3b8" }}>
                Loading risk forecast…
              </div>
            ) : forecast.length === 0 ? (
              <div style={{ fontSize: 12, color: "#94a3b8" }}>
                No active renewals to score yet.
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  fontSize: 12,
                  color: "#e5e7eb",
                }}
              >
                <div
                  style={{
                    padding: "6px 10px",
                    borderRadius: 10,
                    background: "rgba(248,113,113,0.12)",
                    border: "1px solid rgba(248,113,113,0.8)",
                    flex: 1,
                  }}
                >
                  <div style={{ fontSize: 11, color: "#fecaca" }}>
                    High Risk (likely to fail)
                  </div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      marginTop: 2,
                      color: "#fecaca",
                    }}
                  >
                    {highRisk.length}
                  </div>
                </div>

                <div
                  style={{
                    padding: "6px 10px",
                    borderRadius: 10,
                    background: "rgba(250,204,21,0.12)",
                    border: "1px solid rgba(250,204,21,0.8)",
                    flex: 1,
                  }}
                >
                  <div style={{ fontSize: 11, color: "#fcd34d" }}>
                    At Risk (needs attention)
                  </div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      marginTop: 2,
                      color: "#facc15",
                    }}
                  >
                    {atRisk.length}
                  </div>
                </div>

                <div
                  style={{
                    padding: "6px 10px",
                    borderRadius: 10,
                    background: "rgba(56,189,248,0.08)",
                    border: "1px solid rgba(56,189,248,0.7)",
                    flex: 1,
                  }}
                >
                  <div style={{ fontSize: 11, color: "#bae6fd" }}>
                    Watch / Monitoring
                  </div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      marginTop: 2,
                      color: "#38bdf8",
                    }}
                  >
                    {watch.length}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Top 3 Highest Risk Vendors */}
          <div>
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 1.2,
                color: "#9ca3af",
                marginBottom: 6,
              }}
            >
              Top Risky Renewals
            </div>

            {loadingForecast ? (
              <div style={{ fontSize: 12, color: "#94a3b8" }}>
                Calculating…
              </div>
            ) : topRiskVendors.length === 0 ? (
              <div style={{ fontSize: 12, color: "#94a3b8" }}>
                All vendors currently look stable.
              </div>
            ) : (
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  fontSize: 12,
                }}
              >
                {topRiskVendors.map((f) => (
                  <li
                    key={`${f.vendor_id}-${f.policy_id}`}
                    style={{
                      padding: "4px 0",
                      borderBottom: "1px solid rgba(30,64,175,0.5)",
                    }}
                  >
                    <span
                      style={{
                        color: "#e5e7eb",
                        fontWeight: 600,
                      }}
                    >
                      {f.vendor_name}
                    </span>{" "}
                    <span style={{ color: "#9ca3af" }}>
                      — {f.coverage_type || "Unknown"} ·{" "}
                      {f.days_left}d · Risk {f.risk_score}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* FILTER BAR */}
        <div
          style={{
            marginBottom: 20,
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 14,
            alignItems: "center",
          }}
        >
          {/* Search */}
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vendors…"
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(56,189,248,0.35)",
              background: "rgba(15,23,42,0.9)",
              color: "#e5e7eb",
              fontSize: 13,
            }}
          />

          {/* Stage Filter */}
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              background: "rgba(15,23,42,0.9)",
              color: "#e5e7eb",
              border: "1px solid rgba(148,163,184,0.4)",
            }}
          >
            <option value="all">All Stages</option>
            <option value="90">90 days</option>
            <option value="30">30 days</option>
            <option value="7">7 days</option>
            <option value="3">3 days</option>
            <option value="1">1 day</option>
            <option value="0">Expired</option>
          </select>

          {/* Coverage Filter */}
          <select
            value={coverageFilter}
            onChange={(e) => setCoverageFilter(e.target.value)}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              background: "rgba(15,23,42,0.9)",
              color: "#e5e7eb",
              border: "1px solid rgba(148,163,184,0.4)",
            }}
          >
            <option value="all">All Coverages</option>
            <option value="GL">General Liability</option>
            <option value="Auto">Auto</option>
            <option value="WC">Workers Comp</option>
            <option value="Umbrella">Umbrella</option>
            <option value="Property">Property</option>
          </select>
        </div>

        {/* RENEWAL TABLE + TIMELINE */}
        <div
          style={{
            borderRadius: 24,
            border: "1px solid rgba(51,65,85,0.8)",
            background: "rgba(15,23,42,0.95)",
            padding: 16,
            boxShadow: "0 12px 30px rgba(0,0,0,0.5)",
          }}
        >
          <RenewalTable
            orgId={orgId}
            search={search}
            stageFilter={stageFilter}
            coverageFilter={coverageFilter}
          />

          {/* TIMELINE MINI GRAPH */}
          <div style={{ marginTop: 24 }}>
            <RenewalTimelineChart orgId={orgId} />
          </div>
        </div>
      </div>{" "}
      {/* END COCKPIT */}
      {/* FOOTER */}
      <div
        style={{
          marginTop: 30,
          textAlign: "center",
          fontSize: 12,
          color: "#64748b",
        }}
      >
        Renewal Engine V2 • AI Risk Forecasting Enabled
      </div>
    </div>
  );
}
