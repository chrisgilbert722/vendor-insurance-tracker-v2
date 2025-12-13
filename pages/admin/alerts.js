// pages/admin/alerts.js
import { useEffect, useMemo, useState } from "react";
import { useRole } from "../../lib/useRole";
import { useOrg } from "../../context/OrgContext";
import ToastV2 from "../../components/ToastV2";

/* ==========================================================
   ALERTS — DASHBOARD FOCUS MODE
   + SLA COUNTDOWN + ESCALATION + EXCEPTIONS
========================================================== */

const GP = {
  bg: "#020617",
  panel: "rgba(15,23,42,0.98)",
  borderSoft: "rgba(51,65,85,0.9)",
  neonRed: "#fb7185",
  neonGold: "#facc15",
  neonBlue: "#38bdf8",
  neonGreen: "#22c55e",
  neonPurple: "#a855f7",
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
   SLA + ESCALATION HELPERS
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
      escalation: "escalated",
    };
  }

  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(hours / 24);

  const totalMs =
    new Date(alert.sla_due_at).getTime() -
    new Date(alert.created_at).getTime();

  const elapsedRatio = 1 - diffMs / Math.max(totalMs, 1);

  let escalation = "on_track";
  if (elapsedRatio >= 0.5) escalation = "at_risk";

  return {
    label:
      days > 0
        ? `${days}d left`
        : hours > 0
        ? `${hours}h left`
        : `${Math.floor(diffMs / 60000)}m left`,
    color:
      escalation === "on_track"
        ? GP.neonGreen
        : GP.neonGold,
    bg:
      escalation === "on_track"
        ? "rgba(34,197,94,0.15)"
        : "rgba(250,204,21,0.15)",
    escalation,
  };
}

function escalationBadge(escalation) {
  switch (escalation) {
    case "on_track":
      return { label: "On Track", color: GP.neonGreen };
    case "at_risk":
      return { label: "At Risk", color: GP.neonGold };
    case "escalated":
      return { label: "Escalated", color: GP.neonRed };
    default:
      return null;
  }
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

      setToast({ open: true, type: "success", message: "Alert resolved." });
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
      <h1 style={{ fontSize: 30, fontWeight: 600 }}>
        Alerts — Compliance Focus
      </h1>

      <div style={{ marginTop: 24 }}>
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
              const esc =
                !alert.exception ? escalationBadge(sla?.escalation) : null;

              return (
                <div
                  key={alert.id}
                  onClick={() => openFixCockpit(alert)}
                  style={{
                    borderRadius: 18,
                    padding: 16,
                    border: `1px solid ${
                      alert.exception
                        ? GP.neonPurple
                        : sla?.escalation === "escalated"
                        ? GP.neonRed
                        : sev.color
                    }55`,
                    background: GP.panel,
                    cursor: "pointer",
                  }}
                >
                  {/* HEADER */}
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

                  {/* EXCEPTION INDICATOR */}
                  {alert.exception && (
                    <div
                      style={{
                        marginTop: 10,
                        fontSize: 11,
                        fontWeight: 700,
                        color: GP.neonPurple,
                      }}
                    >
                      Exception until{" "}
                      {new Date(
                        alert.exception.expires_at
                      ).toLocaleDateString()}
                    </div>
                  )}

                  {/* ESCALATION INDICATOR */}
                  {esc && (
                    <div
                      style={{
                        marginTop: 8,
                        fontSize: 11,
                        color: esc.color,
                        fontWeight: 700,
                      }}
                    >
                      {esc.label}
                    </div>
                  )}

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
      </div>

      <ToastV2
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      />
    </div>
  );
}
