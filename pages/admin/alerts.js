import { useEffect, useMemo, useState } from "react";
import { useRole } from "../../lib/useRole";
import { useOrg } from "../../context/OrgContext";
import ToastV2 from "../../components/ToastV2";

/* ==========================================================
   ALERTS V5 — INCIDENT COMMAND (CINEMATIC)
========================================================== */

const GP = {
  bg: "#020617",
  panel: "rgba(15,23,42,0.96)",
  border: "rgba(51,65,85,0.6)",
  text: "#e5e7eb",
  textSoft: "#94a3b8",
  critical: "#fb7185",
  high: "#facc15",
  medium: "#38bdf8",
  low: "#22c55e",
};

/* ==========================================================
   HELPERS
========================================================== */

function countBySeverity(alerts) {
  const out = {
    all: alerts.length,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    sla: 0,
  };

  for (const a of alerts) {
    if (out[a.severity] !== undefined) out[a.severity]++;
    if (a.sla_due_at && new Date(a.sla_due_at) < new Date()) out.sla++;
  }

  return out;
}

/* ==========================================================
   PAGE
========================================================== */

export default function AlertsPage() {
  const { isAdmin, isManager } = useRole();
  const { activeOrgId: orgId, loadingOrgs } = useOrg();
  const canEdit = isAdmin || isManager;

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const [toast, setToast] = useState({
    open: false,
    type: "success",
    message: "",
  });

  /* ----------------------------------------------------------
     LOAD ALERTS
  ---------------------------------------------------------- */
  useEffect(() => {
    if (!orgId || loadingOrgs) return;
    loadAlerts();
  }, [orgId, loadingOrgs]);

  async function loadAlerts() {
    try {
      setLoading(true);
      const res = await fetch(`/api/alerts-v2/list?orgId=${orgId}`);
      const json = await res.json();

      if (!json.ok) throw new Error(json.error || "Failed to load alerts");
      setAlerts(json.items || []);
    } catch (err) {
      setToast({ open: true, type: "error", message: err.message });
    } finally {
      setLoading(false);
    }
  }

  /* ----------------------------------------------------------
     FILTERED VIEW
  ---------------------------------------------------------- */
  const filtered = useMemo(() => {
    if (filter === "all") return alerts;
    if (filter === "sla")
      return alerts.filter(
        (a) => a.sla_due_at && new Date(a.sla_due_at) < new Date()
      );
    return alerts.filter((a) => a.severity === filter);
  }, [alerts, filter]);

  const counts = useMemo(() => countBySeverity(alerts), [alerts]);

  /* ----------------------------------------------------------
     EXPORTS
  ---------------------------------------------------------- */
  function exportCSV() {
    window.open(
      `/api/admin/timeline/export.csv?orgId=${orgId}`,
      "_blank"
    );
  }

  function exportPDF() {
    window.open(
      `/api/admin/timeline/export.pdf?orgId=${orgId}`,
      "_blank"
    );
  }

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left,#020617 0%,#020617 45%,#000 100%)",
        padding: "36px 40px 80px",
        color: GP.text,
      }}
    >
      {/* ======================================================
          HEADER
      ======================================================= */}
      <div
        style={{
          borderRadius: 22,
          background: GP.panel,
          border: `1px solid ${GP.border}`,
          padding: 28,
        }}
      >
        <div style={{ opacity: 0.7, fontSize: 12, letterSpacing: "0.2em" }}>
          INCIDENT COMMAND
        </div>

        <h1 style={{ fontSize: 32, marginTop: 6 }}>
          Alerts & Compliance
        </h1>

        <p style={{ color: GP.textSoft, maxWidth: 720 }}>
          Real-time compliance incidents, SLA exposure, and automated escalation
          across your organization.
        </p>

        {/* ACTIONS */}
        <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
          <button onClick={exportCSV}>Export CSV</button>
          <button onClick={exportPDF}>Export PDF</button>
        </div>

        {/* COUNTERS */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))",
            gap: 12,
            marginTop: 24,
          }}
        >
          <Stat label="All" value={counts.all} active={filter === "all"} onClick={() => setFilter("all")} />
          <Stat label="Critical" value={counts.critical} color={GP.critical} active={filter === "critical"} onClick={() => setFilter("critical")} />
          <Stat label="High" value={counts.high} color={GP.high} active={filter === "high"} onClick={() => setFilter("high")} />
          <Stat label="Medium" value={counts.medium} color={GP.medium} active={filter === "medium"} onClick={() => setFilter("medium")} />
          <Stat label="Low" value={counts.low} color={GP.low} active={filter === "low"} onClick={() => setFilter("low")} />
          <Stat label="SLA Breached" value={counts.sla} color={GP.critical} active={filter === "sla"} onClick={() => setFilter("sla")} />
        </div>
      </div>

      {/* ======================================================
          CONTENT
      ======================================================= */}
      <div style={{ marginTop: 28 }}>
        {loading ? (
          <div style={{ color: GP.textSoft }}>Loading alerts…</div>
        ) : filtered.length === 0 ? (
          <div style={{ color: GP.textSoft }}>
            ✅ No active compliance incidents.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))",
              gap: 16,
            }}
          >
            {filtered.map((a) => (
              <div
                key={a.id}
                style={{
                  background: GP.panel,
                  borderRadius: 16,
                  padding: 16,
                  border: `1px solid ${GP.border}`,
                }}
              >
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  {a.severity?.toUpperCase()}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>
                  {a.message}
                </div>
                <div style={{ fontSize: 12, color: GP.textSoft }}>
                  Vendor: {a.vendor_id}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ToastV2
        open={toast.open}
        type={toast.type}
        message={toast.message}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      />
    </div>
  );
}

/* ==========================================================
   STAT TILE
========================================================== */
function Stat({ label, value, color, active, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        cursor: "pointer",
        padding: 14,
        borderRadius: 14,
        border: `1px solid ${color || "rgba(51,65,85,0.5)"}`,
        background: active ? "rgba(255,255,255,0.05)" : "transparent",
      }}
    >
      <div style={{ fontSize: 11, opacity: 0.7 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
    </div>
  );
}
