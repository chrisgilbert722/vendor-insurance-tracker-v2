import { useEffect, useMemo, useState } from "react";
import { useRole } from "../../lib/useRole";
import { useOrg } from "../../context/OrgContext";
import ToastV2 from "../../components/ToastV2";
import CommandShell from "../../components/v5/CommandShell";
import { V5 } from "../../components/v5/v5Theme";

/* ==========================================================
   ALERTS V5 — INCIDENT COMMAND (SHELL-DRIVEN)
========================================================== */

const SEVERITY = {
  critical: { label: "CRITICAL", color: V5.red },
  high: { label: "HIGH", color: V5.yellow },
  medium: { label: "MEDIUM", color: V5.blue },
  low: { label: "LOW", color: V5.green },
};

function getSlaState(alert) {
  if (!alert?.sla_due_at) return null;
  const diff = new Date(alert.sla_due_at) - new Date();
  if (diff <= 0) return { label: "SLA BREACHED", color: V5.red };
  const h = Math.floor(diff / 3600000);
  return { label: `${h}h remaining`, color: h <= 24 ? V5.yellow : V5.green };
}

function ActionButton({ label, color, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 14px",
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

  const system =
    counts.critical || counts.sla
      ? { label: "CRITICAL", color: V5.red }
      : counts.high
      ? { label: "ELEVATED", color: V5.yellow }
      : { label: "STABLE", color: V5.green };

  return (
    <CommandShell
      tag="INCIDENT COMMAND"
      title="Alerts & Compliance"
      subtitle="Real-time compliance incidents, SLA exposure, and escalation control"
      status={system.label}
      statusColor={system.color}
      actions={[
        <ActionButton key="csv" label="Export CSV" color={V5.blue} />,
        <ActionButton key="pdf" label="Export PDF" color={V5.yellow} />,
        <ActionButton key="timeline" label="Timeline" color={V5.green} />,
      ]}
    >
      {/* KPI STRIP */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
          gap: 12,
          marginBottom: 22,
        }}
      >
        {[
          ["all", "All", V5.blue],
          ["critical", "Critical", V5.red],
          ["high", "High", V5.yellow],
          ["medium", "Medium", V5.blue],
          ["low", "Low", V5.green],
          ["sla", "SLA Breached", V5.red],
        ].map(([k, label, color]) => (
          <div
            key={k}
            onClick={() => setFilter(k)}
            style={{
              padding: 14,
              borderRadius: 16,
              border: `1px solid ${color}55`,
              cursor: "pointer",
            }}
          >
            <div style={{ fontSize: 11, color }}>{label}</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{counts[k]}</div>
          </div>
        ))}
      </div>

      {/* INCIDENT STREAM */}
      {loading ? (
        <div style={{ color: V5.soft }}>Loading incidents…</div>
      ) : filtered.length === 0 ? (
        <div style={{ color: V5.green, fontWeight: 600 }}>
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
                  background: V5.panel,
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
                    <div style={{ color: V5.soft }}>{a.message}</div>
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
                      color={V5.blue}
                      onClick={() =>
                        (window.location.href = `/admin/vendor/${a.vendor_id}/fix?alertId=${a.id}`)
                      }
                    />
                    <ActionButton
                      label="Resolve"
                      color={V5.green}
                      onClick={() => resolveAlert(a)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ToastV2
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      />
    </CommandShell>
  );
}
