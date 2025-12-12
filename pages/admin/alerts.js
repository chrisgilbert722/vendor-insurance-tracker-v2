// pages/admin/alerts.js
import { useEffect, useMemo, useState } from "react";
import { useRole } from "../../lib/useRole";
import { useOrg } from "../../context/OrgContext";
import ToastV2 from "../../components/ToastV2";

/* ==========================================================
   ALERTS COCKPIT V3 — ELITE HUD MODE (PRODUCTION)
   Fix Engine + Automation merged
   ========================================================== */

const SEVERITY_META = {
  critical: {
    label: "Critical",
    color: "#ff4d6d",
    bg: "rgba(127,29,29,0.45)",
    border: "rgba(239,68,68,0.9)",
  },
  high: {
    label: "High",
    color: "#ffa600",
    bg: "rgba(120,53,15,0.5)",
    border: "rgba(245,158,11,0.9)",
  },
  medium: {
    label: "Medium",
    color: "#facc15",
    bg: "rgba(133,77,14,0.45)",
    border: "rgba(250,204,21,0.9)",
  },
  low: {
    label: "Low",
    color: "#22c55e",
    bg: "rgba(22,101,52,0.45)",
    border: "rgba(34,197,94,0.9)",
  },
};

const STATUS_META = {
  open: { label: "Open", color: "#f97316" },
  in_review: { label: "In Review", color: "#38bdf8" },
  resolved: { label: "Resolved", color: "#22c55e" },
};

export default function AlertsCockpitV3() {
  const { isAdmin, isManager } = useRole();
  const { activeOrgId: orgId, loadingOrgs } = useOrg();
  const canEdit = isAdmin || isManager;

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("open");
  const [selectedAlertId, setSelectedAlertId] = useState(null);
  const [aiExplainingId, setAiExplainingId] = useState(null);

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
      setSelectedAlertId(json.alerts?.[0]?.id || null);
    } catch (err) {
      setToast({ open: true, type: "error", message: err.message });
    } finally {
      setLoading(false);
    }
  }

  /* =======================
     Derived Data
     ======================= */
  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      if (severityFilter !== "all" && a.severity !== severityFilter)
        return false;
      if (statusFilter !== "all" && a.status !== statusFilter)
        return false;
      return true;
    });
  }, [alerts, severityFilter, statusFilter]);

  const selectedAlert = useMemo(
    () =>
      filteredAlerts.find((a) => a.id === selectedAlertId) ||
      filteredAlerts[0] ||
      null,
    [filteredAlerts, selectedAlertId]
  );

  const severityCounts = useMemo(() => {
    const base = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const a of alerts) {
      if (base[a.severity] !== undefined) base[a.severity]++;
    }
    return base;
  }, [alerts]);

  /* =======================
     Actions
     ======================= */

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
          resolutionNote: "Resolved from Alerts Cockpit",
        }),
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error);

      setAlerts((prev) => prev.filter((a) => a.id !== alert.id));
      setSelectedAlertId(null);

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

  async function handleRequestCoi(alert) {
    if (!canEdit) return;

    try {
      setSaving(true);

      // optimistic UI
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === alert.id ? { ...a, status: "in_review" } : a
        )
      );

      const res = await fetch("/api/alerts-v2/request-coi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId: alert.id }),
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error);

      setToast({
        open: true,
        type: "success",
        message: "COI request sent to vendor.",
      });
    } catch (err) {
      setToast({
        open: true,
        type: "error",
        message: err.message || "Failed to request COI",
      });
      loadAlerts(); // revert
    } finally {
      setSaving(false);
    }
  }

  /* =======================
     RENDER
     ======================= */
  return (
    <div
      style={{
        minHeight: "100vh",
        position: "relative",
        background:
          "radial-gradient(circle at 20% 10%, #020617 0%, #020617 40%, #000 100%)",
        padding: "40px 40px 60px",
        color: "#e5e7eb",
        overflow: "hidden",
      }}
    >
      {/* Scanlines */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "100% 3px",
          opacity: 0.3,
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {/* Header */}
      <div style={{ marginBottom: 25, position: "relative", zIndex: 2 }}>
        <h1 style={{ fontSize: 28, fontWeight: 600 }}>
          Alerts Cockpit — Autonomous Compliance
        </h1>
      </div>

      {/* MAIN GRID */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "grid",
          gridTemplateColumns: "240px 1.4fr 1.2fr",
          gap: 22,
        }}
      >
        <FiltersPanel
          severityFilter={severityFilter}
          setSeverityFilter={setSeverityFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          severityCounts={severityCounts}
        />

        <AlertListPanel
          filteredAlerts={filteredAlerts}
          selectedId={selectedAlertId}
          onSelect={setSelectedAlertId}
        />

        <AlertDetailsPanel
          alert={selectedAlert}
          canEdit={canEdit}
          handleResolve={handleResolve}
          handleRequestCoi={handleRequestCoi}
          aiExplainingId={aiExplainingId}
        />
      </div>

      {saving && (
        <div
          style={{
            position: "fixed",
            right: 20,
            bottom: 20,
            padding: "6px 12px",
            borderRadius: 999,
            background: "rgba(15,23,42,0.9)",
            border: "1px solid rgba(148,163,184,0.6)",
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

/* =======================================================
   PANELS (unchanged visually)
   ======================================================= */

function FiltersPanel({
  severityFilter,
  setSeverityFilter,
  statusFilter,
  setStatusFilter,
  severityCounts,
}) {
  return (
    <div style={{ borderRadius: 20, padding: 18 }}>
      <div>Filters</div>
      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
        <option value="open">Open</option>
        <option value="in_review">In Review</option>
        <option value="resolved">Resolved</option>
        <option value="all">All</option>
      </select>
      <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
        <option value="all">All</option>
        <option value="critical">Critical</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>
      <div style={{ marginTop: 10 }}>
        {Object.entries(severityCounts).map(([k, v]) => (
          <div key={k}>
            {k}: {v}
          </div>
        ))}
      </div>
    </div>
  );
}

function AlertListPanel({ filteredAlerts, selectedId, onSelect }) {
  return (
    <div style={{ padding: 18 }}>
      {filteredAlerts.map((alert) => (
        <div
          key={alert.id}
          onClick={() => onSelect(alert.id)}
          style={{
            padding: 12,
            border:
              selectedId === alert.id
                ? `1px solid ${SEVERITY_META[alert.severity].border}`
                : "1px solid rgba(51,65,85,0.7)",
            marginBottom: 10,
            cursor: "pointer",
          }}
        >
          <strong>{alert.vendor_name}</strong>
          <div style={{ fontSize: 12 }}>{alert.rule_name}</div>
        </div>
      ))}
    </div>
  );
}

function AlertDetailsPanel({
  alert,
  canEdit,
  handleResolve,
  handleRequestCoi,
}) {
  if (!alert) return <div>Select an alert</div>;

  return (
    <div style={{ padding: 18 }}>
      <h2>{alert.vendor_name}</h2>
      <p>{alert.rule_name}</p>

      {alert.fix && (
        <div style={{ marginTop: 20 }}>
          <h4>Recommended Fix</h4>
          <strong>{alert.fix.title}</strong>
          <p>{alert.fix.description}</p>

          <div style={{ display: "flex", gap: 10 }}>
            {alert.fix.action === "request_coi" && (
              <button onClick={() => handleRequestCoi(alert)}>
                Request COI
              </button>
            )}
            <button onClick={() => handleResolve(alert)}>Mark Resolved</button>
          </div>
        </div>
      )}
    </div>
  );
}
