import { useEffect, useMemo, useState } from "react";
import { useRole } from "../../lib/useRole";
import { useOrg } from "../../context/OrgContext";
import ToastV2 from "../../components/ToastV2";

/* ==========================================================
   ALERTS V5 — INCIDENT COMMAND
   Executive / Cinematic / Iron-Man HUD
========================================================== */

const THEME = {
  bg: "#020617",
  panel: "rgba(15,23,42,0.96)",
  border: "rgba(51,65,85,0.7)",
  text: "#e5e7eb",
  soft: "#9ca3af",
  blue: "#38bdf8",
  green: "#22c55e",
  yellow: "#facc15",
  red: "#fb7185",
};

const SEVERITY = {
  critical: { label: "CRITICAL", color: THEME.red },
  high: { label: "HIGH", color: THEME.yellow },
  medium: { label: "MEDIUM", color: THEME.blue },
  low: { label: "LOW", color: THEME.green },
};

/* ==========================================================
   SLA STATE
========================================================== */
function getSlaState(alert) {
  if (!alert?.sla_due_at) return null;
  const due = new Date(alert.sla_due_at);
  const now = new Date();
  const diff = due - now;

  if (diff <= 0) {
    return { label: "SLA BREACHED", color: THEME.red };
  }

  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(hours / 24);

  return {
    label: days > 0 ? `${days}d remaining` : `${hours}h remaining`,
    color: days <= 1 ? THEME.yellow : THEME.green,
  };
}

/* ==========================================================
   ACTION BUTTON
========================================================== */
function ActionButton({ label, onClick, color }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "7px 14px",
        borderRadius: 999,
        border: `1px solid ${color}`,
        background: "transparent",
        color,
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

/* ==========================================================
   MAIN PAGE
========================================================== */
export default function AlertsV5() {
  const { isAdmin, isManager } = useRole();
  const { activeOrgId: orgId, loadingOrgs } = useOrg();
  const canEdit = isAdmin || isManager;

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [toast, setToast] = useState({ open: false, type: "success", message: "" });

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
      setAlerts(json.items || []);
    } catch (e) {
      setToast({ open: true, type: "error", message: e.message });
    } finally {
      setLoading(false);
    }
  }

  const counts = useMemo(() => {
    const c = { all: 0, critical: 0, high: 0, medium: 0, low: 0, sla: 0 };
    alerts.forEach((a) => {
      c.all++;
      if (c[a.severity] !== undefined) c[a.severity]++;
      if (getSlaState(a)?.label === "SLA BREACHED") c.sla++;
    });
    return c;
  }, [alerts]);

  const filtered = useMemo(() => {
    if (filter === "all") return alerts;
    if (filter === "sla") return alerts.filter((a) => getSlaState(a)?.label === "SLA BREACHED");
    return alerts.filter((a) => a.severity === filter);
  }, [alerts, filter]);

  function openFix(alert) {
    window.location.href = `/admin/vendor/${alert.vendor_id}/fix?alertId=${alert.id}`;
  }

  async function resolveAlert(alert) {
    try {
      const res = await fetch("/api/alerts-v2/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId: alert.id }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setAlerts((p) => p.filter((a) => a.id !== alert.id));
      setToast({ open: true, type: "success", message: "Incident resolved" });
    } catch (e) {
      setToast({ open: true, type: "error", message: e.message });
    }
  }

  const systemState =
    counts.critical > 0 || counts.sla > 0
      ? { label: "CRITICAL STATE", color: THEME.red }
      : counts.high > 0
      ? { label: "ELEVATED", color: THEME.yellow }
      : { label: "STABLE", color: THEME.green };

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left,#020617 0,#020617 55%,#000 100%)",
        padding: "32px 40px 60px",
        color: THEME.text,
      }}
    >
      {/* COMMAND HEADER */}
      <div
        style={{
          padding: 28,
          borderRadius: 26,
          background: THEME.panel,
          border: `1px solid ${THEME.border}`,
          boxShadow: `0 0 40px ${systemState.color}33`,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: "0.16em", color: THEME.soft }}>
              INCIDENT COMMAND
            </div>
            <h1 style={{ fontSize: 28, margin: "6px 0" }}>Alerts & Compliance</h1>
            <div style={{ color: systemState.color, fontWeight: 700 }}>
              System Status: {systemState.label}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <ActionButton label="Export CSV" color={THEME.blue} />
            <ActionButton label="Export PDF" color={THEME.yellow} />
            <ActionButton label="Timeline" color={THEME.green} />
          </div>
        </div>

        {/* SEVERITY STRIP */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
            gap: 12,
            marginTop: 22,
          }}
        >
          {[
            ["all", "All Incidents", THEME.blue],
            ["critical", "Critical", THEME.red],
            ["high", "High", THEME.yellow],
            ["medium", "Medium", THEME.blue],
            ["low", "Low", THEME.green],
            ["sla", "SLA Breached", THEME.red],
          ].map(([key, label, color]) => (
            <div
              key={key}
              onClick={() => setFilter(key)}
              style={{
                padding: 14,
                borderRadius: 16,
                border: `1px solid ${color}55`,
                cursor: "pointer",
              }}
            >
              <div style={{ fontSize: 11, color }}>{label}</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{counts[key]}</div>
            </div>
          ))}
        </div>
      </div>

      {/* INCIDENT STREAM */}
      <div style={{ marginTop: 28 }}>
        {loading ? (
          <div style={{ color: THEME.soft }}>Loading incidents…</div>
        ) : filtered.length === 0 ? (
          <div style={{ color: THEME.green, fontWeight: 600 }}>
            ✓ No active compliance incidents
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {filtered.map((a) => {
              const sev = SEVERITY[a.severity];
              const sla = getSlaState(a);
              return (
                <div
                  key={a.id}
                  style={{
                    padding: 18,
                    borderRadius: 18,
                    background: THEME.panel,
                    border: `1px solid ${sev.color}`,
                    boxShadow: `0 0 24px ${sev.color}33`,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ color: sev.color, fontSize: 12 }}>
                        {sev.label}
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 600 }}>
                        {a.vendor_name}
                      </div>
                      <div style={{ color: THEME.soft }}>{a.message}</div>
                    </div>
                    {sla && (
                      <div style={{ color: sla.color, fontWeight: 700 }}>
                        {sla.label}
                      </div>
                    )}
                  </div>

                  {canEdit && (
                    <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                      <ActionButton
                        label="Fix"
                        color={THEME.blue}
                        onClick={() => openFix(a)}
                      />
                      <ActionButton
                        label="Resolve"
                        color={THEME.green}
                        onClick={() => resolveAlert(a)}
                      />
                    </div>
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
