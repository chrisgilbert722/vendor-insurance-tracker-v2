// pages/broker/portal/[token].js
// Read-only broker portal for viewing vendor compliance status

import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function BrokerPortalPage() {
  const router = useRouter();
  const { token } = router.query;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!token) return;

    async function loadPortal() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`/api/broker/portal-init?token=${token}`);
        const json = await res.json();

        if (!res.ok || !json.ok) {
          throw new Error(json.error || "Failed to load portal");
        }

        setData(json);
      } catch (err) {
        console.error("[broker-portal]", err);
        setError(err.message || "Failed to load portal");
      } finally {
        setLoading(false);
      }
    }

    loadPortal();
  }, [token]);

  if (loading) {
    return (
      <Shell>
        <div style={{ textAlign: "center", padding: 60 }}>
          <div style={{ fontSize: 14, color: "#9ca3af" }}>Loading compliance data...</div>
        </div>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell>
        <div style={{ textAlign: "center", padding: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <div style={{ fontSize: 16, color: "#fecaca", marginBottom: 8 }}>{error}</div>
          <div style={{ fontSize: 12, color: "#9ca3af" }}>
            Please contact your organization for a new link.
          </div>
        </div>
      </Shell>
    );
  }

  if (!data) return null;

  const { org, summary, vendors, brokerInfo } = data;

  return (
    <Shell>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={badge}>
          <span style={{ color: "#9ca3af" }}>Broker Portal</span>
          <span style={{ color: "#22c55e" }}>Read-Only Access</span>
        </div>

        <h1 style={{ margin: "8px 0 4px", fontSize: 26, fontWeight: 600 }}>
          {org.name}
        </h1>
        <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>
          Vendor Compliance Overview
          {brokerInfo?.name && ` — Shared with ${brokerInfo.name}`}
        </p>
      </div>

      {/* Summary Cards */}
      <div style={summaryGrid}>
        <SummaryCard label="Total Vendors" value={summary.totalVendors} color="#38bdf8" />
        <SummaryCard label="Compliant" value={summary.compliant} color="#22c55e" />
        <SummaryCard label="At Risk" value={summary.atRisk} color="#fb7185" />
        <SummaryCard label="Expiring (30d)" value={summary.expiringIn30Days} color="#facc15" />
        <SummaryCard label="Open Alerts" value={summary.totalAlerts} color="#f97316" />
      </div>

      {/* Vendor Table */}
      <div style={tableContainer}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              {["Vendor", "Status", "Score", "Policies", "Alerts"].map((h) => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vendors.map((v) => (
              <tr key={v.id} style={tr}>
                <td style={td}>
                  <div style={{ fontWeight: 600, color: "#e5e7eb" }}>{v.name}</div>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>{v.email || "—"}</div>
                </td>
                <td style={td}>
                  <StatusBadge status={v.status} />
                </td>
                <td style={td}>
                  <ScoreBadge score={v.complianceScore} />
                </td>
                <td style={td}>
                  <PolicySummary policies={v.policies} />
                </td>
                <td style={td}>
                  <AlertBadge alerts={v.alerts} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {vendors.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
            No vendors found for this organization.
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={footer}>
        <div>Powered by Verivo Compliance Platform</div>
        <div style={{ fontSize: 10, color: "#6b7280", marginTop: 4 }}>
          This is a read-only view. Contact the organization admin for changes.
        </div>
      </div>
    </Shell>
  );
}

/* ========== Components ========== */

function Shell({ children }) {
  return (
    <div style={shell}>
      <div style={aura} />
      <div style={{ position: "relative", zIndex: 1, maxWidth: 1100, margin: "0 auto" }}>
        {children}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color }) {
  return (
    <div style={summaryCard}>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const colors = {
    active: { bg: "rgba(34,197,94,0.15)", text: "#22c55e" },
    compliant: { bg: "rgba(34,197,94,0.15)", text: "#22c55e" },
    expired: { bg: "rgba(251,113,133,0.15)", text: "#fb7185" },
    pending: { bg: "rgba(250,204,21,0.15)", text: "#facc15" },
    unknown: { bg: "rgba(107,114,128,0.15)", text: "#6b7280" },
  };
  const c = colors[status?.toLowerCase()] || colors.unknown;

  return (
    <span style={{ ...statusBadge, background: c.bg, color: c.text }}>
      {(status || "unknown").toUpperCase()}
    </span>
  );
}

function ScoreBadge({ score }) {
  if (score === null || score === undefined) {
    return <span style={{ color: "#6b7280" }}>—</span>;
  }

  const color = score >= 80 ? "#22c55e" : score >= 60 ? "#facc15" : "#fb7185";

  return (
    <span style={{ fontWeight: 700, color }}>{score}</span>
  );
}

function PolicySummary({ policies }) {
  if (!policies || policies.length === 0) {
    return <span style={{ color: "#6b7280", fontSize: 11 }}>No policies</span>;
  }

  const now = Date.now();
  const expiringSoon = policies.filter((p) => {
    if (!p.expiration_date) return false;
    const daysLeft = Math.floor((new Date(p.expiration_date).getTime() - now) / 86400000);
    return daysLeft >= 0 && daysLeft <= 30;
  }).length;

  return (
    <div style={{ fontSize: 11 }}>
      <div style={{ color: "#e5e7eb" }}>{policies.length} {policies.length === 1 ? "policy" : "policies"}</div>
      {expiringSoon > 0 && (
        <div style={{ color: "#facc15" }}>{expiringSoon} expiring soon</div>
      )}
    </div>
  );
}

function AlertBadge({ alerts }) {
  if (!alerts || alerts.total === 0) {
    return <span style={{ color: "#22c55e", fontSize: 11 }}>None</span>;
  }

  return (
    <div style={{ fontSize: 11 }}>
      {alerts.critical > 0 && (
        <span style={{ color: "#fb7185", marginRight: 8 }}>{alerts.critical} critical</span>
      )}
      {alerts.high > 0 && (
        <span style={{ color: "#f97316", marginRight: 8 }}>{alerts.high} high</span>
      )}
      {alerts.total - (alerts.critical || 0) - (alerts.high || 0) > 0 && (
        <span style={{ color: "#facc15" }}>
          {alerts.total - (alerts.critical || 0) - (alerts.high || 0)} other
        </span>
      )}
    </div>
  );
}

/* ========== Styles ========== */

const shell = {
  minHeight: "100vh",
  padding: "32px 24px",
  background: "radial-gradient(circle at top left,#020617 0,#020617 45%,#000 100%)",
  color: "#e5e7eb",
  position: "relative",
};

const aura = {
  position: "absolute",
  top: -200,
  left: "50%",
  transform: "translateX(-50%)",
  width: 1000,
  height: 1000,
  background: "radial-gradient(circle, rgba(34,197,94,0.25), transparent 60%)",
  filter: "blur(120px)",
  pointerEvents: "none",
  zIndex: 0,
};

const badge = {
  display: "inline-flex",
  gap: 12,
  padding: "6px 14px",
  borderRadius: 999,
  border: "1px solid rgba(148,163,184,0.3)",
  background: "rgba(15,23,42,0.8)",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: 0.5,
};

const summaryGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: 12,
  marginBottom: 24,
};

const summaryCard = {
  padding: "16px 14px",
  borderRadius: 16,
  background: "rgba(15,23,42,0.9)",
  border: "1px solid rgba(148,163,184,0.25)",
  textAlign: "center",
};

const tableContainer = {
  borderRadius: 20,
  background: "rgba(15,23,42,0.95)",
  border: "1px solid rgba(148,163,184,0.3)",
  overflow: "hidden",
};

const th = {
  padding: "12px 16px",
  textAlign: "left",
  fontSize: 11,
  color: "#9ca3af",
  textTransform: "uppercase",
  borderBottom: "1px solid rgba(148,163,184,0.2)",
  background: "rgba(15,23,42,0.5)",
};

const td = {
  padding: "14px 16px",
  borderBottom: "1px solid rgba(148,163,184,0.1)",
  verticalAlign: "top",
};

const tr = {
  transition: "background 0.15s",
};

const statusBadge = {
  display: "inline-block",
  padding: "4px 10px",
  borderRadius: 999,
  fontSize: 10,
  fontWeight: 700,
};

const footer = {
  marginTop: 32,
  padding: "20px 0",
  textAlign: "center",
  fontSize: 11,
  color: "#9ca3af",
  borderTop: "1px solid rgba(148,163,184,0.15)",
};
