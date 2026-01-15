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

        setVendors(Array.isArray(data.vendors) ? data.vendors : []);
      } catch (err) {
        setError(err.message || "Failed to load vendors");
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
      setInsights(data.ok ? data.insights : null);
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
      {/* Header */}
      <div style={{ marginBottom: 10, display: "flex", justifyContent: "space-between" }}>
        <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.4, color: "#9ca3af" }}>
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

      {insights && (
        <div style={{ marginBottom: 12, padding: 10, borderRadius: 16, background: "rgba(15,23,42,0.96)", border: "1px solid rgba(148,163,184,0.5)", fontSize: 12 }}>
          <div style={{ fontWeight: 600 }}>{insights.summary}</div>
        </div>
      )}

      <div style={{ borderRadius: 22, border: "1px solid rgba(30,64,175,0.9)", background: "rgba(15,23,42,0.98)", overflow: "hidden" }}>
        <table style={{ width: "100%", fontSize: 12 }}>
          <thead>
            <tr>
              {["Vendor","Compliance Status","AI Score","Progress","Alerts","Primary Policy","Expires","Contract Status","Actions"].map(h => (
                <th key={h} style={{ padding: "8px 10px", color: "#9ca3af", borderBottom: "1px solid rgba(51,65,85,0.9)" }}>{h}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {vendors.map((v) => {
              const compliance = v.compliance || {};
              const status =
                compliance.status ||
                v.status ||
                v.computedStatus ||
                "unknown";

              const totalRules = Number(compliance.totalRules) || 0;
              const fixedRules = Number(compliance.fixedRules) || 0;

              const primaryPolicy = v.primaryPolicy || {};

              return (
                <tr key={v.id}>
                  <td style={tdCell}>
                    <a href={`/vendor/${v.id}`} style={{ color: "#38bdf8", fontWeight: 600 }}>
                      {v.name}
                    </a>
                  </td>

                  <td style={{ ...tdCell, color: complianceColor(status) }}>
                    {String(status).toUpperCase()}
                  </td>

                  <td style={{ ...tdCell, fontWeight: 600 }}>{v.aiScore ?? "—"}</td>

                  <td style={tdCell}>
                    {totalRules > 0 ? (
                      <div style={progressShell}>
                        <div style={{ ...progressFill, width: `${(fixedRules / totalRules) * 100}%` }} />
                      </div>
                    ) : "—"}
                  </td>

                  <td style={tdCell}>{v.alertsCount ?? 0}</td>

                  <td style={tdCell}>{primaryPolicy.coverage_type || "—"}</td>

                  <td style={tdCell}>{primaryPolicy.expiration_date || "—"}</td>

                  <td style={tdCell}>{(v.contractStatus || "missing").toUpperCase()}</td>

                  <td style={tdCell}>
                    <button onClick={() => router.push(`/admin/contracts/review?vendorId=${v.id}`)}>
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

/* helpers */

const tdCell = { padding: "8px 10px", borderBottom: "1px solid rgba(51,65,85,0.6)" };

const progressShell = { width: 80, height: 4, borderRadius: 999, background: "rgba(15,23,42,1)", overflow: "hidden" };
const progressFill = { height: "100%", background: "#22c55e" };

function complianceColor(status) {
  if (status === "fail") return "#fecaca";
  if (status === "warn") return "#facc15";
  if (status === "pass") return "#bbf7d0";
  return "#9ca3af";
}
