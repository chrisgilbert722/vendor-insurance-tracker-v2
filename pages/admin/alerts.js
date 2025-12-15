// pages/admin/alerts.js
import { useEffect, useMemo, useState } from "react";
import { useRole } from "../../lib/useRole";
import { useOrg } from "../../context/OrgContext";
import ToastV2 from "../../components/ToastV2";

/* ==========================================================
   ALERTS V5 — ENTERPRISE INCIDENT COMMAND
   Canonical rebuild (UUID-safe, cinematic, stable)
========================================================== */

const GP = {
  bg: "#020617",
  panel: "rgba(15,23,42,0.96)",
  panelSoft: "rgba(15,23,42,0.75)",
  border: "rgba(51,65,85,0.6)",
  text: "#e5e7eb",
  textSoft: "#9ca3af",

  blue: "#38bdf8",
  green: "#22c55e",
  yellow: "#facc15",
  red: "#fb7185",
  purple: "#a855f7",
};

/* ==========================================================
   HELPERS
========================================================== */

function safeFetch(url) {
  return fetch(url)
    .then((r) => r.json())
    .catch(() => ({ ok: false }));
}

function exportCSV(orgId) {
  if (!orgId) return;
  window.open(
    `/api/admin/timeline/export.csv?orgId=${orgId}`,
    "_blank"
  );
}

function exportPDF(orgId) {
  if (!orgId) return;
  window.open(
    `/api/admin/timeline/export.pdf?orgId=${orgId}`,
    "_blank"
  );
}

/* ==========================================================
   COMPONENT
========================================================== */

export default function AlertsEnterprise() {
  const { isAdmin, isManager } = useRole();
  const { activeOrgId: orgId, loadingOrgs } = useOrg();
  const canEdit = isAdmin || isManager;

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!orgId || loadingOrgs) return;

    setLoading(true);

    safeFetch(`/api/alerts-v2/stats?orgId=${orgId}`).then((res) => {
      if (res?.ok) {
        setStats(res.stats || res);
      } else {
        setStats(null); // silent fail
      }
      setLoading(false);
    });
  }, [orgId, loadingOrgs]);

  const counters = useMemo(() => {
    return {
      all: stats?.total || 0,
      critical: stats?.critical || 0,
      high: stats?.high || 0,
      medium: stats?.medium || 0,
      low: stats?.low || 0,
      sla: stats?.slaBreached || 0,
    };
  }, [stats]);

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "36px 44px 80px",
        background:
          "radial-gradient(1200px 600px at top left, #020617 0%, #000 70%)",
        color: GP.text,
      }}
    >
      {/* ================= HEADER ================= */}
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          borderRadius: 20,
          padding: "28px 32px",
          background: GP.panel,
          border: `1px solid ${GP.border}`,
          boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 20,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                letterSpacing: "0.18em",
                color: GP.textSoft,
                marginBottom: 6,
              }}
            >
              INCIDENT COMMAND
            </div>

            <h1 style={{ fontSize: 28, fontWeight: 700 }}>
              Alerts & Compliance
            </h1>

            <p
              style={{
                marginTop: 8,
                fontSize: 14,
                color: GP.textSoft,
                maxWidth: 560,
              }}
            >
              Real-time compliance incidents, SLA exposure, and automated
              escalation across your organization.
            </p>
          </div>

          {/* EXPORT CONTROLS */}
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={() => exportCSV(orgId)}
              style={{
                padding: "10px 16px",
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 600,
                color: GP.text,
                background:
                  "linear-gradient(135deg, rgba(56,189,248,0.18), rgba(56,189,248,0.05))",
                border: `1px solid rgba(56,189,248,0.35)`,
                cursor: "pointer",
              }}
            >
              📊 Export CSV
            </button>

            <button
              onClick={() => exportPDF(orgId)}
              style={{
                padding: "10px 16px",
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 600,
                color: GP.text,
                background:
                  "linear-gradient(135deg, rgba(168,85,247,0.22), rgba(168,85,247,0.08))",
                border: `1px solid rgba(168,85,247,0.45)`,
                cursor: "pointer",
              }}
            >
              📄 Export PDF
            </button>
          </div>
        </div>

        {/* ================= COUNTERS ================= */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
            gap: 14,
            marginTop: 24,
          }}
        >
          {[
            ["ALL", counters.all, GP.blue],
            ["CRITICAL", counters.critical, GP.red],
            ["HIGH", counters.high, GP.yellow],
            ["MEDIUM", counters.medium, GP.blue],
            ["LOW", counters.low, GP.green],
            ["SLA BREACHED", counters.sla, GP.red],
          ].map(([label, value, color]) => (
            <div
              key={label}
              style={{
                padding: "16px 18px",
                borderRadius: 14,
                background: GP.panelSoft,
                border: `1px solid ${color}55`,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  color: color,
                  marginBottom: 6,
                }}
              >
                {label}
              </div>
              <div style={{ fontSize: 26, fontWeight: 700 }}>
                {loading ? "—" : value}
              </div>
            </div>
          ))}
        </div>

        {/* ================= EMPTY STATE ================= */}
        {!loading && counters.all === 0 && (
          <div
            style={{
              marginTop: 22,
              padding: "14px 18px",
              borderRadius: 12,
              background: "rgba(34,197,94,0.1)",
              border: "1px solid rgba(34,197,94,0.35)",
              color: GP.green,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            ✅ No active compliance incidents.
          </div>
        )}
      </div>

      {toast && (
        <ToastV2
          open
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
