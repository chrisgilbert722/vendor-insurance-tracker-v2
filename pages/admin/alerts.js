// pages/admin/alerts.js
import { useEffect, useMemo, useState } from "react";
import { useRole } from "../../lib/useRole";
import { useOrg } from "../../context/OrgContext";
import ToastV2 from "../../components/ToastV2";

/* ==========================================================
   ALERTS V5 — ENTERPRISE INCIDENT COMMAND
   Cinematic, consistent with Dashboard / Documents / Vendors
   - Compact enterprise buttons (no bubbles)
   - SLA breach counter
   - Fix Cockpit wiring
   - CSV / PDF / Timeline actions
========================================================== */

const THEME = {
  bg: "#020617",
  panel: "rgba(15,23,42,0.95)",
  border: "rgba(51,65,85,0.6)",
  text: "#e5e7eb",
  textSoft: "#9ca3af",
  blue: "#38bdf8",
  green: "#22c55e",
  yellow: "#facc15",
  red: "#fb7185",
  purple: "#a855f7",
};

const SEVERITY = {
  critical: { label: "Critical", color: THEME.red },
  high: { label: "High", color: THEME.yellow },
  medium: { label: "Medium", color: THEME.blue },
  low: { label: "Low", color: THEME.green },
};

/* ==========================================================
   SMALL ENTERPRISE BUTTON (REUSABLE)
========================================================== */
function ActionButton({ label, onClick, color }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 14px",
        fontSize: 13,
        fontWeight: 600,
        borderRadius: 999,
        border: `1px solid ${color}`,
        background: "transparent",
        color,
        cursor: "pointer",
        transition: "all .15s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = `${color}22`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      {label}
    </button>
  );
}

/* ==========================================================
   SLA STATE
========================================================== */
function getSlaState(alert) {
  if (!alert?.sla_due_at) return null;
  const due = new Date(alert.sla_due_at);
  const now = new Date();
  const diff = due - now;

  if (diff <= 0) {
    return { label: "BREACHED", color: THEME.red };
  }

  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(hours / 24);

  return {
    label: days > 0 ? `${days}d left` : `${hours}h left`,
    color: days <= 1 ? THEME.yellow : THEME.green,
  };
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

  /* ---------------- LOAD ALERTS ---------------- */
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
    } catch (e) {
      setToast({ open: true, type: "error", message: e.message });
    } finally {
      setLoading(false);
    }
  }

  /* ---------------- COUNTS ---------------- */
  const counts = useMemo(() => {
    const c = { all: 0, critical: 0, high: 0, medium: 0, low: 0, sla: 0 };
    alerts.forEach((a) => {
      c.all += 1;
      if (c[a.severity] !== undefined) c[a.severity] += 1;
      if (getSlaState(a)?.label === "BREACHED") c.sla += 1;
    });
    return c;
  }, [alerts]);

  const filtered = useMemo(() => {
    if (filter === "all") return alerts;
    if (filter === "sla") return alerts.filter((a) => getSlaState(a)?.label === "BREACHED");
    return alerts.filter((a) => a.severity === filter);
  }, [alerts, filter]);

  /* ---------------- ACTIONS ---------------- */
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
      setAlerts((prev) => prev.filter((a) => a.id !== alert.id));
      setToast({ open: true, type: "success", message: "Alert resolved" });
    } catch (e) {
      setToast({ open: true, type: "error", message: e.message });
    }
  }

  /* ==========================================================
     RENDER
  ========================================================== */
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at top,#020617 0,#020617 45%,#000 100%)",
        padding: "32px 40px 60px",
        color: THEME.text,
      }}
    >
      {/* HEADER */}
      <div
        style={{
          border: `1px solid ${THEME.border}`,
          borderRadius: 22,
          padding: 28,
          background: THEME.panel,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: "0.14em", color: THEME.textSoft }}>
              INCIDENT COMMAND
            </div>
            <h1 style={{ fontSize: 28, marginTop: 6 }}>Alerts & Compliance</h1>
            <p style={{ color: THEME.textSoft, maxWidth: 720 }}>
              Real-time compliance incidents, SLA exposure, and automated escalation across your organization.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <ActionButton
              label="Export CSV"
              color={THEME.blue}
              onClick={() => window.open(`/api/admin/timeline/export.csv?orgId=${orgId}`)}
            />
            <ActionButton
              label="Export PDF"
              color={THEME.yellow}
              onClick={() => window.open(`/api/admin/timeline/export.pdf?orgId=${orgId}`)}
            />
            <ActionButton
              label="Timeline View"
              color={THEME.green}
              onClick={() => (window.location.href = "/admin/timeline")}
            />
          </div>
        </div>

        {/* COUNTERS */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
            gap: 12,
            marginTop: 22,
          }}
        >
          {[
            ["all", "All", THEME.blue],
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
                borderRadius: 14,
                border: `1px solid ${color}55`,
                cursor: "pointer",
              }}
            >
              <div style={{ fontSize: 11, color }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{counts[key]}</div>
            </div>
          ))}
        </div>
      </div>

      {/* LIST */}
      <div style={{ marginTop: 28 }}>
        {loading ? (
          <div style={{ color: THEME.textSoft }}>Loading alerts…</div>
        ) : filtered.length === 0 ? (
          <div style={{ color: THEME.green }}>✓ No active compliance incidents.</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {filtered.map((a) => {
              const sev = SEVERITY[a.severity] || {};
              const sla = getSlaState(a);
              return (
                <div
                  key={a.id}
                  style={{
                    border: `1px solid ${sev.color || THEME.border}`,
                    borderRadius: 16,
                    padding: 16,
                    background: THEME.panel,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: 12, color: sev.color }}>{sev.label}</div>
                      <div style={{ fontSize: 15, fontWeight: 600 }}>{a.vendor_name}</div>
                      <div style={{ fontSize: 13, color: THEME.textSoft }}>{a.message}</div>
                    </div>
                    {sla && (
                      <div style={{ color: sla.color, fontWeight: 700 }}>{sla.label}</div>
                    )}
                  </div>

                  {canEdit && (
                    <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
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
