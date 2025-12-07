// components/vendors/GlobalVendorTable.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function GlobalVendorTable({ orgId }) {
  const router = useRouter();

  const [vendors, setVendors] = useState([]);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!orgId) return;
    async function load() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`/api/vendors/gvi?orgId=${orgId}`);
        const data = await res.json();
        if (!data.ok) throw new Error(data.error);

        setVendors(data.vendors || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [orgId]);

  async function runInsights() {
    if (!vendors.length) return;
    try {
      setInsightsLoading(true);
      const res = await fetch("/api/ai/gvi-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendors }),
      });
      const data = await res.json();
      if (data.ok) {
        setInsights(data.insights);
      } else {
        setInsights(null);
      }
    } catch (err) {
      console.error("Insights error", err);
    } finally {
      setInsightsLoading(false);
    }
  }

  if (!orgId) {
    return <div style={{ fontSize: 12, color: "#9ca3af" }}>No org selected.</div>;
  }

  if (loading) {
    return <div style={{ fontSize: 12, color: "#9ca3af" }}>Loading vendor landscape…</div>;
  }

  if (error) {
    return <div style={{ fontSize: 12, color: "#fecaca" }}>Error: {error}</div>;
  }

  return (
    <div>
      {/* Insights header */}
      <div
        style={{
          marginBottom: 10,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div
          style={{
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: 1.4,
            color: "#9ca3af",
          }}
        >
          Global Vendor Index
        </div>

        <button
          onClick={runInsights}
          disabled={insightsLoading || vendors.length === 0}
          style={{
            padding: "6px 10px",
            borderRadius: 999,
            border: "1px solid rgba(56,189,248,0.85)",
            background: "linear-gradient(90deg,#0ea5e9,#38bdf8,#0f172a)",
            color: "white",
            fontSize: 11,
            fontWeight: 600,
            cursor: insightsLoading ? "not-allowed" : "pointer",
          }}
        >
          {insightsLoading ? "Analyzing…" : "⚡ AI Risk Insights"}
        </button>
      </div>

      {/* AI Insights */}
      {insights && (
        <div
          style={{
            marginBottom: 12,
            padding: 10,
            borderRadius: 16,
            background: "rgba(15,23,42,0.96)",
            border: "1px solid rgba(148,163,184,0.5)",
            fontSize: 12,
            color: "#e5e7eb",
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 6 }}>
            {insights.summary}
          </div>
        </div>
      )}

      {/* Vendor table */}
      <div
        style={{
          borderRadius: 22,
          border: "1px solid rgba(30,64,175,0.9)",
          background: "rgba(15,23,42,0.98)",
          boxShadow: "0 18px 45px rgba(15,23,42,0.95)",
          overflow: "hidden",
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
              {[
                "Vendor",
                "Compliance Status",
                "AI Score",
                "Progress",
                "Alerts",
                "Primary Policy",
                "Expires",
                "Contract Status", // ⭐ CONTRACT
                "Actions",          // ⭐ REVIEW
              ].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: "left",
                    padding: "8px 10px",
                    background: "rgba(15,23,42,1)",
                    color: "#9ca3af",
                    borderBottom: "1px solid rgba(51,65,85,0.9)",
                    fontWeight: 600,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {vendors.map((v) => {
              const contractStatus = v.contractStatus || "missing";
              const contractIssuesCount = v.contractIssuesCount ?? 0;

              return (
                <tr
                  key={v.id}
                  style={{
                    background:
                      "linear-gradient(90deg,rgba(15,23,42,0.98),rgba(15,23,42,0.94))",
                  }}
                >
                  {/* Vendor name + Contract Review link */}
                  <td style={tdCell}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <a
                        href={`/vendor/${v.id}`}
                        style={{
                          color: "#38bdf8",
                          textDecoration: "none",
                          fontWeight: 600,
                          marginBottom: 2,
                        }}
                      >
                        {v.name}
                      </a>

                      {/* Quick contract badge */}
                      {contractStatus !== "missing" && (
                        <span
                          style={{
                            fontSize: 11,
                            color:
                              contractStatus === "failed"
                                ? "#fb7185"
                                : contractStatus === "partial"
                                ? "#facc15"
                                : "#22c55e",
                          }}
                        >
                          {contractStatus === "passed"
                            ? "✓ Contract OK"
                            : contractStatus === "partial"
                            ? "⚠ Contract Partial"
                            : contractStatus === "failed"
                            ? "⚠ Contract Issues"
                            : "Contract Unknown"}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Compliance Status */}
                  <td
                    style={{
                      ...tdCell,
                      color: complianceColor(v.compliance.status),
                    }}
                  >
                    {String(v.compliance.status || "unknown").toUpperCase()}
                  </td>

                  {/* AI Score */}
                  <td
                    style={{
                      ...tdCell,
                      color: aiColor(v.aiScore),
                      fontWeight: 600,
                    }}
                  >
                    {v.aiScore}
                  </td>

                  {/* Progress */}
                  <td style={tdCell}>
                    {v.compliance.totalRules > 0 ? (
                      <div style={progressShell}>
                        <div
                          style={{
                            ...progressFill,
                            width: `${
                              (v.compliance.fixedRules /
                                v.compliance.totalRules) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                    ) : (
                      <span style={{ color: "#6b7280" }}>—</span>
                    )}
                  </td>

                  {/* Alerts */}
                  <td
                    style={{
                      ...tdCell,
                      color: v.alertsCount > 0 ? "#fb7185" : "#6b7280",
                    }}
                  >
                    {v.alertsCount}
                  </td>

                  {/* Primary Policy */}
                  <td style={tdCell}>
                    {v.primaryPolicy.coverage_type || "—"}
                  </td>

                  {/* Expires */}
                  <td
                    style={{
                      ...tdCell,
                      color:
                        v.primaryPolicy.daysLeft != null &&
                        v.primaryPolicy.daysLeft <= 30
                          ? "#fecaca"
                          : "#9ca3af",
                    }}
                  >
                    {v.primaryPolicy.expiration_date || "—"}{" "}
                    {v.primaryPolicy.daysLeft != null &&
                      `(${v.primaryPolicy.daysLeft} d)`}
                  </td>

                  {/* CONTRACT STATUS */}
                  <td
                    style={{
                      ...tdCell,
                      color:
                        contractStatus === "failed"
                          ? "#fb7185"
                          : contractStatus === "partial"
                          ? "#facc15"
                          : contractStatus === "passed"
                          ? "#22c55e"
                          : "#9ca3af",
                    }}
                  >
                    {contractStatus === "missing"
                      ? "MISSING"
                      : contractStatus.toUpperCase()}{" "}
                    {contractIssuesCount > 0 && `(${contractIssuesCount})`}
                  </td>

                  {/* ACTIONS: Review Contract */}
                  <td style={tdCell}>
                    <button
                      onClick={() =>
                        router.push(`/admin/contracts/review?vendorId=${v.id}`)
                      }
                      style={{
                        padding: "6px 10px",
                        borderRadius: 999,
                        border: "1px solid #22c55e",
                        background: "rgba(34,197,94,0.1)",
                        color: "#22c55e",
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        boxShadow: "0 0 12px rgba(34,197,94,0.3)",
                      }}
                    >
                      ⚖ Review
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ================================
   STYLES & HELPERS
================================ */

const tdCell = {
  padding: "8px 10px",
  borderBottom: "1px solid rgba(51,65,85,0.6)",
  color: "#e5e7eb",
};

const progressShell = {
  width: 80,
  height: 4,
  borderRadius: 999,
  background: "rgba(15,23,42,1)",
  overflow: "hidden",
};

const progressFill = {
  height: "100%",
  background: "#22c55e",
};

function complianceColor(status) {
  if (!status) return "#9ca3af";
  if (status === "fail") return "#fecaca";
  if (status === "warn") return "#facc15";
  if (status === "pass") return "#bbf7d0";
  return "#9ca3af";
}

function aiColor(score) {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#facc15";
  return "#fb7185";
}
