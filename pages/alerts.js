// pages/alerts.js
import { useEffect, useState } from "react";
import { useOrg } from "../context/OrgContext";
import { useRole } from "../lib/useRole";

export default function AlertsPage() {
  const { activeOrgId, loadingOrgs } = useOrg();
  const { isAdmin, isManager, isViewer, loading: loadingRole } = useRole();

  const [alerts, setAlerts] = useState([]);
  const [aiSummary, setAiSummary] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");

  // Load Alerts
  useEffect(() => {
    if (!activeOrgId) return;

    async function loadAlerts() {
      setLoading(true);
      setError("");

      try {
        const res = await fetch(`/api/alerts?orgId=${activeOrgId}`);
        const data = await res.json();

        if (!res.ok || !data.ok) {
          throw new Error(data.error || "Failed to load alerts");
        }

        setAlerts(data.alerts || []);
        setAiSummary(data.aiSummary?.summaryText || "");
      } catch (err) {
        console.error("ALERT LOAD ERROR:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadAlerts();
  }, [activeOrgId]);
  // Severity badges
  function severityBadge(sev) {
    const base = {
      padding: "4px 10px",
      borderRadius: "999px",
      fontSize: "11px",
      fontWeight: 600,
      display: "inline-block",
    };

    if (sev === "critical")
      return { ...base, background: "#fee2e2", color: "#b91c1c" };

    if (sev === "warning")
      return { ...base, background: "#fef3c7", color: "#b45309" };

    return { ...base, background: "#e0f2fe", color: "#0369a1" }; // info
  }

  const filteredAlerts = alerts.filter((a) => {
    if (filter === "all") return true;
    return a.severity === filter;
  });

  // Role-gating: viewers see read-only, admins/managers full access
  const canView = isAdmin || isManager || isViewer;
  const canManage = isAdmin || isManager;

  if (!canView) {
    return (
      <div style={{ padding: "30px 40px" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700 }}>Alerts</h1>
        <p style={{ color: "#6b7280", fontSize: 14 }}>Access denied.</p>
      </div>
    );
  }
  return (
    <div style={{ padding: "30px 40px" }}>
      <h1
        style={{
          fontSize: "32px",
          fontWeight: 700,
          marginBottom: 6,
          color: "#0f172a",
        }}
      >
        Alerts
      </h1>

      <p style={{ fontSize: 14, color: "#64748b", marginBottom: 20 }}>
        All vendor, policy, and requirement alerts for this organization.
      </p>

      {error && (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            borderRadius: 8,
            border: "1px solid #fecaca",
            background: "#fef2f2",
            color: "#b91c1c",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {(loading || loadingOrgs || loadingRole) && (
        <p style={{ marginBottom: 20, color: "#6b7280", fontSize: 14 }}>
          Loading alerts…
        </p>
      )}

      {/* AI SUMMARY */}
      {aiSummary && (
        <div
          style={{
            marginBottom: 28,
            padding: "20px",
            borderRadius: "12px",
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            boxShadow: "0 8px 24px rgba(15,23,42,0.04)",
          }}
        >
          <h2
            style={{
              fontSize: 16,
              fontWeight: 700,
              marginBottom: 10,
              color: "#0f172a",
            }}
          >
            AI Risk Summary
          </h2>
          <p style={{ color: "#374151", fontSize: 14, whiteSpace: "pre-line" }}>
            {aiSummary}
          </p>
        </div>
      )}

      {/* FILTER BUTTONS */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 16,
        }}
      >
        {["all", "critical", "warning", "info"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "6px 14px",
              borderRadius: "999px",
              border: "1px solid #d1d5db",
              background: filter === f ? "#0f172a" : "#ffffff",
              color: filter === f ? "#ffffff" : "#374151",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {f === "all"
              ? "All"
              : f.charAt(0).toUpperCase() + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* ALERTS TABLE */}
      <div
        style={{
          marginTop: 10,
          borderRadius: 12,
          border: "1px solid #e5e7eb",
          background: "#ffffff",
          boxShadow: "0 8px 24px rgba(15,23,42,0.04)",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "separate",
            borderSpacing: 0,
            fontSize: 13,
          }}
        >
          <thead>
            <tr style={{ background: "#f9fafb" }}>
              <Th>Severity</Th>
              <Th>Vendor</Th>
              <Th>Coverage</Th>
              <Th>Message</Th>
            </tr>
          </thead>

          <tbody>
            {filteredAlerts.length === 0 && !loading && (
              <tr>
                <td
                  colSpan="4"
                  style={{
                    padding: 20,
                    fontSize: 14,
                    textAlign: "center",
                    color: "#6b7280",
                  }}
                >
                  No alerts found.
                </td>
              </tr>
            )}

            {filteredAlerts.map((a, idx) => (
              <tr key={idx} style={{ background: "#ffffff" }}>
                <td style={td}>
                  <span style={severityBadge(a.severity)}>{a.severity}</span>
                </td>
                <td style={td}>{a.vendor_name || "—"}</td>
                <td style={td}>{a.coverage_type || "—"}</td>
                <td style={td}>{a.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function Th({ children }) {
  return (
    <th
      style={{
        padding: "12px 14px",
        fontSize: 11,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: "#6b7280",
        borderBottom: "1px solid #e5e7eb",
        textAlign: "left",
      }}
    >
      {children}
    </th>
  );
}

const td = {
  padding: "12px 14px",
  borderBottom: "1px solid #f3f4f6",
  verticalAlign: "top",
  color: "#111827",
  fontSize: "13px",
};
