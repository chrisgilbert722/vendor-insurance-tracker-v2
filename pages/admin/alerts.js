import { useEffect, useMemo, useState } from "react";
import { useRole } from "../../lib/useRole";
import { useOrg } from "../../context/OrgContext";
import ToastV2 from "../../components/ToastV2";

import CommandShell from "../../components/v5/CommandShell";
import { V5 } from "../../components/v5/v5Theme";

/* ==========================================================
   ALERTS V5 — INCIDENT COMMAND (Shell-driven)
========================================================== */

const SEVERITY = {
  critical: { label: "CRITICAL", color: V5.red },
  high: { label: "HIGH", color: V5.yellow },
  medium: { label: "MEDIUM", color: V5.blue },
  low: { label: "LOW", color: V5.green },
};

function getSlaState(alert) {
  if (!alert?.sla_due_at) return null;
  const due = new Date(alert.sla_due_at);
  const now = new Date();
  const diff = due - now;

  if (diff <= 0) {
    return { label: "SLA BREACHED", color: V5.red };
  }

  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(hours / 24);

  return {
    label: days > 0 ? `${days}d remaining` : `${hours}h remaining`,
    color: days <= 1 ? V5.yellow : V5.green,
  };
}

function ActionButton({ label, onClick, color }) {
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
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function CountCard({ label, value, color, active, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: 14,
        borderRadius: 18,
        border: `1px solid ${color}55`,
        background: active ? "rgba(2,6,23,0.55)" : V5.panel,
        cursor: "pointer",
        boxShadow: active ? `0 0 18px ${color}22` : "none",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color,
          fontWeight: 800,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 900, color: V5.text }}>
        {value}
      </div>
    </div>
  );
}

export default function AlertsV5() {
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

  useEffect(() => {
    if (!orgId || loadingOrgs) return;
    loadAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, loadingOrgs]);

  async function loadAlerts() {
    try {
      setLoading(true);
      const res = await fetch(`/api/alerts-v2/list?orgId=${orgId}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed to load alerts");
      setAlerts(Array.isArray(json.items) ? json.items : []);
    } catch (e) {
      setToast({ open: true, type: "error", message: e.message });
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }

  const counts = useMemo(() => {
    const c = { all: 0, critical: 0, high: 0, medium: 0, low: 0, sla: 0 };
    (Array.isArray(alerts) ? alerts : []).forEach((a) => {
      c.all++;
      if (c[a.severity] !== undefined) c[a.severity]++;
      if (getSlaState(a)?.label === "SLA BREACHED") c.sla++;
    });
    return c;
  }, [alerts]);

  const filtered = useMemo(() => {
    const safe = Array.isArray(alerts) ? alerts : [];
    if (filter === "all") return safe;
    if (filter === "sla")
      return safe.filter((a) => getSlaState(a)?.label === "SLA BREACHED");
    return safe.filter((a) => a.severity === filter);
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
      if (!json.ok) throw new Error(json.error || "Resolve failed");

      setAlerts((prev) => (Array.isArray(prev) ? prev : []).filter((a) => a.id !== alert.id));
      setToast({ open: true, type: "success", message: "Incident resolved" });
    } catch (e) {
      setToast({ open: true, type: "error", message: e.message });
    }
  }

  const system =
    counts.critical > 0 || counts.sla > 0
      ? { label: "CRITICAL", color: V5.red }
      : counts.high > 0
      ? { label: "ELEVATED", color: V5.yellow }
      : { label: "STABLE", color: V5.green };

  return (
    <CommandShell
      tag="INCIDENT COMMAND"
      title="Alerts & Compliance"
      subtitle="Real-time compliance incidents, SLA exposure, and escalation control across your org."
      status={loading ? "SYNCING" : system.label}
      statusColor={loading ? V5.blue : system.color}
      actions={[
        <ActionButton
          key="csv"
          label="Export CSV"
          color={V5.blue}
          onClick={() => window.open(`/api/admin/timeline/export.csv?orgId=${orgId}`)}
        />,
        <ActionButton
          key="pdf"
          label="Export PDF"
          color={V5.yellow}
          onClick={() => window.open(`/api/admin/timeline/export.pdf?orgId=${orgId}`)}
        />,
        <ActionButton
          key="timeline"
          label="Timeline"
          color={V5.green}
          onClick={() => (window.location.href = "/admin/timeline")}
        />,
      ]}
    >
      {/* COUNTS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <CountCard
          label="All"
          value={counts.all}
          color={V5.blue}
          active={filter === "all"}
          onClick={() => setFilter("all")}
        />
        <CountCard
          label="Critical"
          value={counts.critical}
          color={V5.red}
          active={filter === "critical"}
          onClick={() => setFilter("critical")}
        />
        <CountCard
          label="High"
          value={counts.high}
          color={V5.yellow}
          active={filter === "high"}
          onClick={() => setFilter("high")}
        />
        <CountCard
          label="Medium"
          value={counts.medium}
          color={V5.blue}
          active={filter === "medium"}
          onClick={() => setFilter("medium")}
        />
        <CountCard
          label="Low"
          value={counts.low}
          color={V5.green}
          active={filter === "low"}
          onClick={() => setFilter("low")}
        />
        <CountCard
          label="SLA Breached"
          value={counts.sla}
          color={V5.red}
          active={filter === "sla"}
          onClick={() => setFilter("sla")}
        />
      </div>

      {/* INCIDENT STREAM */}
      {loading ? (
        <div style={{ color: V5.soft }}>Loading incidents…</div>
      ) : filtered.length === 0 ? (
        <div style={{ color: V5.green, fontWeight: 700 }}>
          ✓ No active compliance incidents
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {filtered.map((a) => {
            const sev = SEVERITY[a.severity] || { label: "UNKNOWN", color: V5.soft };
            const sla = getSlaState(a);

            return (
              <div
                key={a.id}
                style={{
                  padding: 18,
                  borderRadius: 20,
                  background: V5.panel,
                  border: `1px solid ${sev.color}77`,
                  boxShadow: `0 0 24px ${sev.color}22, inset 0 0 22px rgba(0,0,0,0.6)`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 14 }}>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 900,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: sev.color,
                        marginBottom: 6,
                      }}
                    >
                      {sev.label}
                    </div>

                    <div style={{ fontSize: 16, fontWeight: 800 }}>
                      {a.vendor_name || "Unknown Vendor"}
                    </div>

                    <div style={{ marginTop: 4, fontSize: 13, color: V5.soft }}>
                      {a.message || "No message"}
                    </div>
                  </div>

                  {sla ? (
                    <div
                      style={{
                        padding: "6px 10px",
                        borderRadius: 999,
                        border: `1px solid ${sla.color}99`,
                        color: sla.color,
                        fontSize: 11,
                        fontWeight: 900,
                        letterSpacing: "0.10em",
                        textTransform: "uppercase",
                        whiteSpace: "nowrap",
                        height: "fit-content",
                      }}
                    >
                      {sla.label}
                    </div>
                  ) : null}
                </div>

                {canEdit && (
                  <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                    <ActionButton label="Fix" color={V5.blue} onClick={() => openFix(a)} />
                    <ActionButton label="Resolve" color={V5.green} onClick={() => resolveAlert(a)} />
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
