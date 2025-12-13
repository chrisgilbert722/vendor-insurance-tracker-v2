// pages/admin/alerts.js
import { useEffect, useMemo, useState } from "react";
import { useRole } from "../../lib/useRole";
import { useOrg } from "../../context/OrgContext";
import ToastV2 from "../../components/ToastV2";

/* ==========================================================
   ALERTS COCKPIT V3 — ELITE HUD MODE (PRODUCTION)
   Deep-linked to Fix Cockpit
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

export default function AlertsCockpitV3() {
  const { isAdmin, isManager } = useRole();
  const { activeOrgId: orgId, loadingOrgs } = useOrg();
  const canEdit = isAdmin || isManager;

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("open");

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

      // 🔥 notify dashboard + other views
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

  /* =======================
     NAVIGATION (NEW)
     ======================= */
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
          "radial-gradient(circle at 20% 10%, #020617 0%, #020617 40%, #000 100%)",
        padding: "40px 40px 60px",
        color: "#e5e7eb",
      }}
    >
      <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 20 }}>
        Alerts Cockpit — Autonomous Compliance
      </h1>

      {loading ? (
        <div>Loading alerts…</div>
      ) : filteredAlerts.length === 0 ? (
        <div>No alerts found.</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              onClick={() => openFixCockpit(alert)}
              style={{
                padding: 14,
                border: `1px solid ${SEVERITY_META[alert.severity]?.border}`,
                borderRadius: 14,
                cursor: "pointer",
                background: "rgba(15,23,42,0.95)",
                transition: "transform .15s ease, box-shadow .15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow =
                  "0 0 18px rgba(56,189,248,0.35)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                {alert.vendor_name}
              </div>
              <div style={{ fontSize: 12, color: "#9ca3af" }}>
                {alert.rule_name}
              </div>
            </div>
          ))}
        </div>
      )}

      {saving && (
        <div style={{ position: "fixed", right: 20, bottom: 20 }}>
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
