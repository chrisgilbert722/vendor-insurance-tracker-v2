import { useEffect, useMemo, useState } from "react";
import { useOrg } from "../../context/OrgContext";
import { useRole } from "../../lib/useRole";
import ToastV2 from "../../components/ToastV2";

/* =========================================================
   ALERTS V5 — INCIDENT COMMAND (ENTERPRISE)
========================================================= */

const UI = {
  bg: "#020617",
  panel: "rgba(15,23,42,0.98)",
  border: "rgba(51,65,85,0.9)",
  text: "#e5e7eb",
  textSoft: "#9ca3af",

  blue: "#38bdf8",
  red: "#fb7185",
  gold: "#facc15",
  green: "#22c55e",
};

const SEVERITY = {
  critical: { label: "Critical", color: UI.red },
  high: { label: "High", color: UI.gold },
  medium: { label: "Medium", color: UI.blue },
  low: { label: "Low", color: UI.green },
};

export default function AlertsAdmin() {
  const { activeOrgId: orgId, loadingOrgs } = useOrg();
  const { isAdmin, isManager } = useRole();
  const canResolve = isAdmin || isManager;

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState("all");

  const [toast, setToast] = useState({
    open: false,
    type: "success",
    message: "",
  });

  /* ============================
     LOAD ALERTS
  ============================ */
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

  /* ============================
     FILTERING
  ============================ */
  const filtered = useMemo(() => {
    if (severityFilter === "all") return alerts;
    return alerts.filter((a) => a.severity === severityFilter);
  }, [alerts, severityFilter]);

  const counts = useMemo(() => {
    const c = { all: alerts.length, critical: 0, high: 0, medium: 0, low: 0 };
    alerts.forEach((a) => {
      if (c[a.severity] !== undefined) c[a.severity]++;
    });
    return c;
  }, [alerts]);

  /* ============================
     ACTIONS
  ============================ */
  function openFixCockpit(alert) {
    if (!alert?.vendor_id || !alert?.id) return;
    window.location.href = `/admin/vendor/${alert.vendor_id}/fix?alertId=${alert.id}`;
  }

  async function resolveAlert(alert) {
    if (!canResolve) return;
    try {
      const res = await fetch("/api/alerts-v2/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId: alert.id }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed to resolve alert");
      setAlerts((prev) => prev.filter((a) => a.id !== alert.id));
      setToast({ open: true, type: "success", message: "Alert resolved" });
    } catch (err) {
      setToast({ open: true, type: "error", message: err.message });
    }
  }

  /* ============================
     EXPORTS
  ============================ */
  function exportCSV() {
    window.open(`/api/admin/timeline/export.csv?orgId=${orgId}`, "_blank");
  }

  function exportPDF() {
    window.open(`/api/admin/timeline/export.pdf?orgId=${orgId}`, "_blank");
  }

  /* ============================
     RENDER
  ============================ */
  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left,#020617 0,#020617 45%,#000 100%)",
        padding: "36px 48px",
        color: UI.text,
      }}
    >
      {/* HEADER */}
      <div
        style={{
          background: UI.panel,
          border: `1px solid ${UI.border}`,
          borderRadius: 22,
          padding: 28,
          marginBottom: 28,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 24,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                letterSpacing: "0.16em",
                color: UI.textSoft,
              }}
            >
              INCIDENT COMMAND
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>
              Alerts & Compliance
            </h1>
            <p style={{ color: UI.textSoft, marginTop: 6, maxWidth: 560 }}>
              Real-time compliance incidents, SLA exposure, and automated
              escalation across your organization.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <EnterpriseButton label="Export CSV" onClick={exportCSV} />
            <EnterpriseButton label="Export PDF" onClick={exportPDF} />
          </div>
        </div>

        {/* COUNTERS */}
        <div
          style={{
            marginTop: 22,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
            gap: 12,
          }}
        >
          <Counter label="All" value={counts.all} color={UI.blue} active={severityFilter === "all"} onClick={() => setSeverityFilter("all")} />
          <Counter label="Critical" value={counts.critical} color={UI.red} active={severityFilter === "critical"} onClick={() => setSeverityFilter("critical")} />
          <Counter label="High" value={counts.high} color={UI.gold} active={severityFilter === "high"} onClick={() => setSeverityFilter("high")} />
          <Counter label="Medium" value={counts.medium} color={UI.blue} active={severityFilter === "medium"} onClick={() => setSeverityFilter("medium")} />
          <Counter label="Low" value={counts.low} color={UI.green} active={severityFilter === "low"} onClick={() => setSeverityFilter("low")} />
        </div>
      </div>

      {/* ALERT GRID */}
      {loading ? (
        <div style={{ color: UI.textSoft }}>Loading alerts…</div>
      ) : filtered.length === 0 ? (
        <div style={{ color: UI.green, fontWeight: 600 }}>
          ✓ No active compliance incidents.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(360px,1fr))",
            gap: 16,
          }}
        >
          {filtered.map((a) => {
            const sev = SEVERITY[a.severity] || {};
            return (
              <div
                key={a.id}
                onClick={() => openFixCockpit(a)}
                style={{
                  background: UI.panel,
                  border: `1px solid ${sev.color || UI.border}55`,
                  borderRadius: 18,
                  padding: 18,
                  cursor: a.vendor_id ? "pointer" : "default",
                  transition: "transform 0.15s ease",
                }}
              >
                <div style={{ fontSize: 11, color: sev.color }}>
                  {sev.label}
                </div>

                <div style={{ fontWeight: 700, marginTop: 6 }}>
                  {a.vendor_name || "Vendor"}
                </div>

                <div style={{ color: UI.textSoft, marginTop: 6 }}>
                  {a.message}
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    marginTop: 14,
                  }}
                >
                  <EnterpriseButton
                    label="Open Fix"
                    onClick={(e) => {
                      e.stopPropagation();
                      openFixCockpit(a);
                    }}
                  />

                  {canResolve && (
                    <EnterpriseButton
                      label="Resolve"
                      danger
                      onClick={(e) => {
                        e.stopPropagation();
                        resolveAlert(a);
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ToastV2
        open={toast.open}
        type={toast.type}
        message={toast.message}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      />
    </div>
  );
}

/* =========================================================
   COMPONENTS
========================================================= */

function Counter({ label, value, color, active, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: 14,
        borderRadius: 14,
        border: `1px solid ${color}55`,
        background: active ? `${color}22` : "transparent",
        cursor: "pointer",
      }}
    >
      <div style={{ fontSize: 11, color }}>{label.toUpperCase()}</div>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function EnterpriseButton({ label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 14px",
        borderRadius: 12,
        border: `1px solid ${danger ? UI.red : UI.blue}`,
        background: danger
          ? "rgba(251,113,133,0.15)"
          : "rgba(56,189,248,0.15)",
        color: danger ? UI.red : UI.blue,
        fontWeight: 700,
        fontSize: 12,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}
