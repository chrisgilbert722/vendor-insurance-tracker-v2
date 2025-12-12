// pages/admin/alerts.js
import { useEffect, useMemo, useState } from "react";
import { useRole } from "../../lib/useRole";
import { useOrg } from "../../context/OrgContext";
import ToastV2 from "../../components/ToastV2";

/* ==========================================================
   ALERTS COCKPIT V3 — ELITE HUD MODE
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
  const [selectedAlertId, setSelectedAlertId] = useState(null);

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

  const selectedAlert = useMemo(
    () => alerts.find((a) => a.id === selectedAlertId) || null,
    [alerts, selectedAlertId]
  );

  /* =======================
     ACTIONS
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

      // Optimistic UI update
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

      // Revert on failure
      loadAlerts();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: 40, color: "#e5e7eb" }}>
      <h1 style={{ fontSize: 26, marginBottom: 20 }}>Alerts</h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 24 }}>
        {/* LIST */}
        <div>
          {loading ? (
            <div>Loading…</div>
          ) : alerts.length === 0 ? (
            <div>No alerts.</div>
          ) : (
            alerts.map((a) => (
              <div
                key={a.id}
                onClick={() => setSelectedAlertId(a.id)}
                style={{
                  padding: 14,
                  marginBottom: 10,
                  borderRadius: 14,
                  cursor: "pointer",
                  border:
                    selectedAlertId === a.id
                      ? `1px solid ${SEVERITY_META[a.severity].border}`
                      : "1px solid rgba(51,65,85,0.6)",
                }}
              >
                <strong>{a.vendor_name}</strong>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>
                  {a.rule_name}
                </div>
              </div>
            ))
          )}
        </div>

        {/* DETAILS */}
        <div>
          {!selectedAlert ? (
            <div>Select an alert.</div>
          ) : (
            <>
              <h2>{selectedAlert.vendor_name}</h2>
              <p>{selectedAlert.rule_name}</p>

              {/* FIX RECOMMENDATION */}
              {selectedAlert.fix && (
                <div
                  style={{
                    marginTop: 20,
                    padding: 16,
                    borderRadius: 16,
                    border: "1px solid rgba(148,163,184,0.4)",
                    background: "rgba(15,23,42,0.85)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: "#9ca3af",
                      marginBottom: 6,
                    }}
                  >
                    Recommended Fix
                  </div>

                  <div style={{ fontSize: 16, fontWeight: 600 }}>
                    {selectedAlert.fix.title}
                  </div>

                  <div style={{ fontSize: 13, marginTop: 6 }}>
                    {selectedAlert.fix.description}
                  </div>

                  {selectedAlert.fix.required_document && (
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 12,
                        color: "#38bdf8",
                      }}
                    >
                      Required: {selectedAlert.fix.required_document}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                    {selectedAlert.fix.action === "request_coi" && (
                      <button
                        disabled={saving}
                        style={{
                          padding: "8px 14px",
                          borderRadius: 999,
                          border: "1px solid rgba(34,197,94,0.6)",
                          background: "rgba(15,23,42,0.9)",
                          color: "#bbf7d0",
                          opacity: saving ? 0.6 : 1,
                          cursor: saving ? "not-allowed" : "pointer",
                        }}
                        onClick={() => handleRequestCoi(selectedAlert)}
                      >
                        Request COI
                      </button>
                    )}

                    <button
                      disabled={saving}
                      style={{
                        padding: "8px 14px",
                        borderRadius: 999,
                        border: "1px solid rgba(148,163,184,0.4)",
                        background: "transparent",
                        color: "#e5e7eb",
                        opacity: saving ? 0.6 : 1,
                      }}
                      onClick={() => handleResolve(selectedAlert)}
                    >
                      Mark Resolved
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {saving && <div style={{ marginTop: 10 }}>Updating…</div>}

      <ToastV2
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      />
    </div>
  );
}
