// pages/admin/alerts.js
import { useEffect, useMemo, useState } from "react";
import { useRole } from "../../lib/useRole";
import { useOrg } from "../../context/OrgContext";
import ToastV2 from "../../components/ToastV2";

/* ==========================================================
   ALERTS — DASHBOARD FOCUS MODE
   + SLA COUNTDOWN BADGES
========================================================== */

const GP = {
  bg: "#020617",
  panel: "rgba(15,23,42,0.98)",
  borderSoft: "rgba(51,65,85,0.9)",
  neonRed: "#fb7185",
  neonGold: "#facc15",
  neonBlue: "#38bdf8",
  neonGreen: "#22c55e",
  text: "#e5e7eb",
  textSoft: "#9ca3af",
};

const SEVERITY_META = {
  critical: { label: "Critical", color: GP.neonRed },
  high: { label: "High", color: GP.neonGold },
  medium: { label: "Medium", color: GP.neonBlue },
  low: { label: "Low", color: GP.neonGreen },
};

/* ==========================================================
   SLA HELPERS
========================================================== */

function getSlaState(alert) {
  if (!alert.sla_due_at) return null;

  const due = new Date(alert.sla_due_at);
  const now = new Date();
  const diffMs = due - now;

  if (diffMs <= 0) {
    return {
      label: "BREACHED",
      color: GP.neonRed,
      bg: "rgba(251,113,133,0.15)",
    };
  }

  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return {
      label: `${days}d left`,
      color: GP.neonGreen,
      bg: "rgba(34,197,94,0.15)",
    };
  }

  if (hours > 0) {
    return {
      label: `${hours}h left`,
      color: GP.neonGold,
      bg: "rgba(250,204,21,0.15)",
    };
  }

  const minutes = Math.floor(diffMs / 60000);
  return {
    label: `${minutes}m left`,
    color: GP.neonRed,
    bg: "rgba(251,113,133,0.15)",
  };
}

export default function AlertsCockpit() {
  const { isAdmin, isManager } = useRole();
  const { activeOrgId: orgId, loadingOrgs } = useOrg();
  const canEdit = isAdmin || isManager;

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [severityFilter, setSeverityFilter] = useState("all");

  const [toast, setToast] = useState({
    open: false,
    message: "",
    type: "success",
  });

  /* =======================
     Load Alerts
  ======================= */
  useEffect(() => {
    if (!orgId || loadingOrgs) return;
    loadAlerts();
  }, [orgId, loadingOrgs]);

  async function loadAlerts() {
    try {
      setLoading(true);
      const res = await fetch(`/api/alerts-v2/list?orgId=${orgId}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setAlerts(json.alerts || []);
    } catch (err) {
      setToast({ open: true, type: "error", message: err.message });
    } finally {
      setLoading(false);
    }
  }

  const filteredAlerts = useMemo(() => {
    if (severityFilter === "all") return alerts;
    return alerts.filter((a) => a.severity === severityFilter);
  }, [alerts, severityFilter]);

  async function handleResolve(alert) {
    if (!canEdit) return;

    try {
      setSaving(true);
      const res = await fetch("/api/alerts-v2/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alertId: alert.id,
          resolvedBy: "admin",
          resolutionNote: "Resolved from Alerts Focus",
        }),
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error);

      setAlerts((prev) => prev.filter((a) => a.id !== alert.id));
      window.dispatchEvent(new CustomEvent("alerts:changed"));
      localStorage.setItem("alerts:changed", Date.now());

      setToast({
        open: true,
        type: "success",
        message: "Alert resolved.",
      });
    } catch (err) {
      setToast({ open: true, type: "error", message: err.message });
    } finally {
      setSaving(false);
    }
  }

  function openFixCockpit(alert) {
    if (!alert?.vendor_id || !alert?.id) return;
    window.location.href = `/admin/vendor/${alert.vendor_id}/fix?alertId=${alert.id}`;
  }

  /* =======================
     RENDER
  ======================= */
  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left,#020617 0,#020617 45%,#000 100%)",
        padding: "32px 40px 60px",
        color: GP.text,
      }}
    >
      {/* HEADER */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 30, fontWeight: 600 }}>
          Alerts — Compliance Focus
        </h1>
        <p style={{ color: GP.textSoft, fontSize: 13, maxWidth: 640 }}>
          These alerts are enforced with SLA timers and escalation rules.
        </p>
      </div>

      {/* FILTER STRIP */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        {["all", "critical", "high", "medium", "low"].map((sev) => (
          <button
            key={sev}
            onClick={() => setSeverityFilter(sev)}
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              border:
                severityFilter === sev
                  ? `1px solid ${GP.neonBlue}`
                  : `1px solid ${GP.borderSoft}`,
              background:
                severityFilter === sev
                  ? "rgba(56,189,248,0.15)"
                  : GP.panel,
              color:
                sev === "all"
                  ? GP.text
                  : SEVERITY_META[sev]?.color,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {sev === "all" ? "All" : SEVERITY_META[sev].label}
          </button>
        ))}
      </div>

      {/* ALERTS GRID */}
      {loading ? (
        <div style={{ color: GP.textSoft }}>Loading alerts…</div>
      ) : filteredAlerts.length === 0 ? (
        <div style={{ color: GP.textSoft }}>No active alerts.</div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))",
            gap: 16,
          }}
        >
          {filteredAlerts.map((alert) => {
            const sev = SEVERITY_META[alert.severity] || {};
            const sla = getSlaState(alert);

            return (
              <div
                key={alert.id}
                onClick={() => openFixCockpit(alert)}
                style={{
                  borderRadius: 18,
                  padding: 16,
                  border: `1px solid ${sev.color}55`,
                  background: GP.panel,
                  cursor: "pointer",
                  transition: "transform .15s ease, box-shadow .15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow =
                    "0 0 22px rgba(56,189,248,0.35)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "none";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {/* HEADER ROW */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: sev.color,
                      textTransform: "uppercase",
                      letterSpacing: "0.14em",
                    }}
                  >
                    {sev.label}
                  </div>

                  {sla && (
                    <div
                      style={{
                        fontSize: 11,
                        padding: "4px 10px",
                        borderRadius: 999,
                        color: sla.color,
                        background: sla.bg,
                        border: `1px solid ${sla.color}55`,
                        fontWeight: 700,
                      }}
                    >
                      {sla.label}
                    </div>
                  )}
                </div>

                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {alert.vendor_name}
                </div>

                <div
                  style={{
                    fontSize: 12,
                    color: GP.textSoft,
                    marginTop: 4,
                  }}
                >
                  {alert.rule_name || alert.message}
                </div>

                {canEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleResolve(alert);
                    }}
                    style={{
                      marginTop: 12,
                      padding: "6px 12px",
                      borderRadius: 10,
                      border: `1px solid ${GP.neonGreen}`,
                      background: "rgba(34,197,94,0.15)",
                      color: GP.neonGreen,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Resolve
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {saving && (
        <div
          style={{
            position: "fixed",
            right: 24,
            bottom: 24,
            padding: "8px 14px",
            borderRadius: 999,
            background: GP.panel,
            border: `1px solid ${GP.borderSoft}`,
            fontSize: 12,
          }}
        >
          Updating…
        </div>
      )}

      <ToastV2
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      />
    </div>
  );
}
