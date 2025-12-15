// pages/admin/alerts.js
import { useEffect, useMemo, useState } from "react";
import { useRole } from "../../lib/useRole";
import { useOrg } from "../../context/OrgContext";
import ToastV2 from "../../components/ToastV2";

/* ==========================================================
   ALERTS — CINEMATIC INCIDENT COMMAND (V5)
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
    color: escalation === "on_track" ? GP.neonGreen : GP.neonGold,
    bg:
      escalation === "on_track"
        ? "rgba(34,197,94,0.15)"
        : "rgba(250,204,21,0.15)",
    escalation,
  };
}

/* ==========================================================
   MAIN COMPONENT
========================================================== */

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
      if (!json.ok) throw new Error(json.error || "Failed to load alerts");
      setAlerts(json.items || []);
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

  const slaBreachedCount = useMemo(() => {
    return alerts.filter(
      (a) => a.sla_due_at && new Date(a.sla_due_at) <= new Date()
    ).length;
  }, [alerts]);

  async function handleResolve(alert) {
    if (!canEdit) return;

    try {
      setSaving(true);
      const res = await fetch("/api/alerts-v2/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId: alert.id }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed to resolve alert");

      setAlerts((prev) => prev.filter((a) => a.id !== alert.id));
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
      {/* ===================== COMMAND HEADER ===================== */}
      <div
        style={{
          borderRadius: 24,
          padding: "28px 32px",
          background:
            "linear-gradient(135deg, rgba(15,23,42,0.98), rgba(2,6,23,0.98))",
          border: `1px solid ${GP.borderSoft}`,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 24,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                color: GP.textSoft,
              }}
            >
              Incident Command
            </div>

            <div style={{ fontSize: 34, fontWeight: 700 }}>
              Alerts & Compliance
            </div>

            <div
              style={{
                marginTop: 6,
                fontSize: 14,
                color: GP.textSoft,
                maxWidth: 520,
              }}
            >
              Real-time compliance incidents, SLA exposure, and automated
              escalation across your organization.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() =>
                orgId &&
                window.open(
                  `/api/admin/timeline/export.csv?orgId=${orgId}`,
                  "_blank"
                )
              }
            >
              Export CSV
            </button>

            <button
              onClick={() =>
                orgId &&
                window.open(
                  `/api/admin/timeline/export.pdf?orgId=${orgId}`,
                  "_blank"
                )
              }
            >
              Export PDF
            </button>
          </div>
        </div>

        {/* ===================== FILTER STRIP ===================== */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
            gap: 16,
            marginTop: 24,
          }}
        >
          <div
            onClick={() => setSeverityFilter("all")}
            style={{
              borderRadius: 16,
              padding: "14px 16px",
              background: GP.panel,
              border:
                severityFilter === "all"
                  ? `2px solid ${GP.neonBlue}`
                  : `1px solid ${GP.borderSoft}`,
              cursor: "pointer",
            }}
          >
            <div style={{ fontSize: 11, color: GP.neonBlue }}>ALL</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>
              {alerts.length}
            </div>
          </div>

          {Object.keys(SEVERITY_META).map((sev) => {
            const meta = SEVERITY_META[sev];
            const count = alerts.filter((a) => a.severity === sev).length;

            return (
              <div
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                style={{
                  borderRadius: 16,
                  padding: "14px 16px",
                  background: GP.panel,
                  border:
                    severityFilter === sev
                      ? `2px solid ${meta.color}`
                      : `1px solid ${meta.color}55`,
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: 11, color: meta.color }}>
                  {meta.label.toUpperCase()}
                </div>
                <div style={{ fontSize: 28, fontWeight: 700 }}>
                  {count}
                </div>
              </div>
            );
          })}

          <div
            style={{
              borderRadius: 16,
              padding: "14px 16px",
              background: "rgba(251,113,133,0.15)",
              border: `1px solid ${GP.neonRed}`,
            }}
          >
            <div style={{ fontSize: 11, color: GP.neonRed }}>
              SLA BREACHED
            </div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>
              {slaBreachedCount}
            </div>
          </div>
        </div>
      </div>

      {/* ===================== ALERT GRID ===================== */}
      <div style={{ marginTop: 28 }}>
        {loading ? (
          <div style={{ color: GP.textSoft }}>Loading alerts…</div>
        ) : filteredAlerts.length === 0 ? (
          <div style={{ color: GP.textSoft }}>
            ✅ No active compliance incidents.
          </div>
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
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 6,
                    }}
                  >
                    <div style={{ fontSize: 11, color: sev.color }}>
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
