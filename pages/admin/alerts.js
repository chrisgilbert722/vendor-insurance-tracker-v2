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
  const [error, setError] = useState("");
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
    if (loadingOrgs) return;
    if (!orgId) return;

    loadAlerts();
  }, [orgId, loadingOrgs]);

  async function loadAlerts() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/alerts?orgId=${orgId}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed to load alerts");

      const data = json.alerts || [];
      setAlerts(data);

      if (data.length) {
        setSelectedAlertId(data[0].id);
      } else {
        setSelectedAlertId(null);
      }
    } catch (err) {
      setError(err.message);
      setToast({
        open: true,
        type: "error",
        message: err.message || "Error loading alerts",
      });
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

  async function handleUpdateStatus(alertId, nextStatus) {
    if (!canEdit) return;

    // optimistic update
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId ? { ...a, status: nextStatus } : a
      )
    );

    try {
      setSaving(true);
      const res = await fetch("/api/alerts/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: alertId, status: nextStatus }),
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error);

      setToast({
        open: true,
        type: "success",
        message: "Status updated.",
      });
    } catch (err) {
      setToast({
        open: true,
        type: "error",
        message: err.message,
      });
      loadAlerts(); // revert
    } finally {
      setSaving(false);
    }
  }

  async function handleAiExplain(alert) {
    if (!alert) return;

    try {
      setAiExplainingId(alert.id);

      const res = await fetch("/api/alerts/ai-explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId: alert.id }),
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error);

      setAlerts((prev) =>
        prev.map((a) =>
          a.id === alert.id
            ? { ...a, ai_explanation: json.explanation }
            : a
        )
      );

      setToast({
        open: true,
        type: "success",
        message: "AI explanation added.",
      });
    } catch (err) {
      setToast({
        open: true,
        type: "error",
        message: err.message,
      });
    } finally {
      setAiExplainingId(null);
    }
  }
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
        <div
          style={{
            display: "inline-flex",
            gap: 8,
            padding: "4px 12px",
            borderRadius: 999,
            border: "1px solid rgba(148,163,184,0.4)",
            background:
              "linear-gradient(120deg,rgba(15,23,42,0.9),rgba(15,23,42,0.6))",
            marginBottom: 8,
          }}
        >
          <span
            style={{
              fontSize: 10,
              color: "#9ca3af",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
            }}
          >
            Alerts Cockpit V3
          </span>
          <span
            style={{
              fontSize: 10,
              color: "#38bdf8",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Threat • Risk • Compliance
          </span>
        </div>

        <h1
          style={{
            fontSize: 28,
            fontWeight: 600,
            margin: 0,
            letterSpacing: 0.4,
          }}
        >
          Real-time{" "}
          <span
            style={{
              background:
                "linear-gradient(90deg,#38bdf8,#818cf8,#e5e7eb)",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            risk detection
          </span>{" "}
          and compliance monitoring.
        </h1>

        <p
          style={{
            marginTop: 6,
            maxWidth: 640,
            fontSize: 13,
            color: "#cbd5f5",
          }}
        >
          Powered by the Requirements Engine V3 and auto-evaluated on every
          vendor policy update.
        </p>
      </div>

      {/* MAIN GRID */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "grid",
          gridTemplateColumns: "240px 1.4fr 1.2fr",
          gap: 22,
          marginTop: 20,
        }}
      >
        {/* LEFT PANEL — FILTERS + SEVERITY RADAR */}
        <FiltersPanel
          severityFilter={severityFilter}
          setSeverityFilter={setSeverityFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          severityCounts={severityCounts}
        />

        {/* MIDDLE PANEL — LIST */}
        <AlertListPanel
          filteredAlerts={filteredAlerts}
          selectedId={selectedAlertId}
          onSelect={setSelectedAlertId}
        />

        {/* RIGHT PANEL — DETAILS */}
        <AlertDetailsPanel
          alert={selectedAlert}
          canEdit={canEdit}
          handleUpdateStatus={handleUpdateStatus}
          handleAiExplain={handleAiExplain}
          aiExplainingId={aiExplainingId}
        />
      </div>

      {/* Toast + Saving */}
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
            color: "#e5e7eb",
            fontSize: 12,
            boxShadow: "0 0 10px rgba(59,130,246,0.4)",
          }}
        >
          Updating…
        </div>
      )}

      <ToastV2
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() =>
          setToast((p) => ({
            ...p,
            open: false,
          }))
        }
      />
    </div>
  );
}
/* =======================================================
   FILTER PANEL — left column (filters + severity radar)
   ======================================================= */

function FiltersPanel({
  severityFilter,
  setSeverityFilter,
  statusFilter,
  setStatusFilter,
  severityCounts,
}) {
  return (
    <div
      style={{
        position: "relative",
        borderRadius: 20,
        padding: 18,
        background:
          "linear-gradient(145deg, rgba(11,20,40,0.97), rgba(7,12,26,0.9))",
        border: "1px solid rgba(80,120,255,0.32)",
        boxShadow:
          "0 0 28px rgba(54,88,255,0.22), inset 0 0 22px rgba(10,20,40,0.55)",
        backdropFilter: "blur(8px)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: 1.5,
          marginBottom: 14,
          color: "#9ca3af",
        }}
      >
        Filters
      </div>

      {/* STATUS */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, marginBottom: 4, color: "#cbd5f5" }}>
          Status
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: 12,
            border: "1px solid rgba(51,65,85,0.8)",
            background:
              "linear-gradient(120deg, rgba(17,25,45,0.95), rgba(15,23,42,0.88))",
            color: "#e5e7eb",
            fontSize: 13,
          }}
        >
          <option value="open">Open</option>
          <option value="in_review">In Review</option>
          <option value="resolved">Resolved</option>
          <option value="all">All</option>
        </select>
      </div>

      {/* SEVERITY */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, marginBottom: 6, color: "#cbd5f5" }}>
          Severity
        </div>

        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: 12,
            border: "1px solid rgba(51,65,85,0.8)",
            background:
              "linear-gradient(120deg, rgba(17,25,45,0.95), rgba(15,23,42,0.88))",
            color: "#e5e7eb",
            fontSize: 13,
          }}
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* SEVERITY RADAR */}
      <div>
        <div
          style={{
            fontSize: 12,
            textTransform: "uppercase",
            color: "#9ca3af",
            letterSpacing: 1.3,
            marginBottom: 8,
          }}
        >
          Severity Radar
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
          }}
        >
          {["critical", "high", "medium", "low"].map((sev) => (
            <div
              key={sev}
              style={{
                borderRadius: 12,
                padding: "10px",
                border: `1px solid ${SEVERITY_META[sev].border}`,
                background: SEVERITY_META[sev].bg,
                color: SEVERITY_META[sev].color,
                textAlign: "center",
                boxShadow: `0 0 12px ${SEVERITY_META[sev].border}`,
                fontSize: 12,
              }}
            >
              {SEVERITY_META[sev].label} — {severityCounts[sev]}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
/* =======================================================
   ALERT LIST PANEL — middle column
   ======================================================= */

function AlertListPanel({ filteredAlerts, selectedId, onSelect }) {
  return (
    <div
      style={{
        borderRadius: 20,
        padding: 18,
        background:
          "linear-gradient(150deg, rgba(12,22,42,0.97), rgba(5,10,25,0.94))",
        border: "1px solid rgba(80,120,255,0.28)",
        boxShadow:
          "0 0 25px rgba(64,106,255,0.25), inset 0 0 25px rgba(10,20,45,0.6)",
        backdropFilter: "blur(10px)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          fontSize: 12,
          textTransform: "uppercase",
          color: "#9ca3af",
          marginBottom: 10,
          letterSpacing: 1.3,
        }}
      >
        Alerts ({filteredAlerts.length})
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          maxHeight: 600,
          overflowY: "auto",
          paddingRight: 6,
        }}
      >
        {filteredAlerts.length === 0 ? (
          <div
            style={{
              padding: 12,
              borderRadius: 12,
              border: "1px dashed rgba(148,163,184,0.4)",
              color: "#9ca3af",
              fontSize: 12,
            }}
          >
            No alerts found.
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              active={selectedId === alert.id}
              onSelect={() => onSelect(alert.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
/* =======================================================
   RIGHT PANEL — ALERT DETAILS
   ======================================================= */

function AlertDetailsPanel({
  alert,
  canEdit,
  handleUpdateStatus,
  handleAiExplain,
  aiExplainingId,
}) {
  if (!alert)
    return (
      <div
        style={{
          borderRadius: 20,
          padding: 18,
          background:
            "linear-gradient(150deg, rgba(9,15,30,0.97), rgba(4,9,20,0.94))",
          border: "1px solid rgba(80,120,255,0.28)",
          boxShadow:
            "0 0 25px rgba(64,106,255,0.25), inset 0 0 25px rgba(10,20,45,0.6)",
          color: "#9ca3af",
        }}
      >
        Select an alert to view details.
      </div>
    );

  const meta = SEVERITY_META[alert.severity] || SEVERITY_META.medium;

  return (
    <div
      style={{
        borderRadius: 20,
        padding: 18,
        background:
          "linear-gradient(150deg, rgba(9,15,30,0.97), rgba(4,9,20,0.94))",
        border: "1px solid rgba(80,120,255,0.28)",
        boxShadow:
          "0 0 25px rgba(64,106,255,0.25), inset 0 0 25px rgba(10,20,45,0.6)",
        backdropFilter: "blur(10px)",
        overflow: "hidden",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          fontSize: 12,
          textTransform: "uppercase",
          marginBottom: 12,
          letterSpacing: 1.4,
          color: "#cbd5f5",
        }}
      >
        Alert Details
      </div>

      {/* VENDOR */}
      <div
        style={{
          fontSize: 16,
          fontWeight: 600,
          marginBottom: 4,
        }}
      >
        {alert.vendor_name}
      </div>

      <div
        style={{
          fontSize: 12,
          color: "#9ca3af",
          marginBottom: 12,
        }}
      >
        Rule: {alert.rule_name} • Group: {alert.group_name}
      </div>

      {/* SEVERITY */}
      <div
        style={{
          borderRadius: 12,
          padding: "6px 10px",
          border: `1px solid ${meta.border}`,
          background: meta.bg,
          color: meta.color,
          display: "inline-block",
          fontSize: 12,
          fontWeight: 600,
          marginBottom: 14,
          boxShadow: `0 0 12px ${meta.border}`,
        }}
      >
        {meta.label}
      </div>

      {/* EXPECTED VS ACTUAL */}
      <div style={{ fontSize: 13, marginBottom: 14 }}>
        <strong>Expected:</strong>{" "}
        <code style={{ color: "#a5b4fc" }}>{alert.expected_value}</code>
        <br />
        <strong>Actual:</strong>{" "}
        <code style={{ color: "#93c5fd" }}>
          {alert.actual_value ?? "N/A"}
        </code>
      </div>

      {/* REQUIREMENT TEXT */}
      {alert.requirement_text && (
        <div
          style={{
            fontSize: 12,
            color: "#cbd5f5",
            marginBottom: 20,
          }}
        >
          {alert.requirement_text}
        </div>
      )}

      {/* AI EXPLANATION */}
      <div style={{ marginBottom: 18 }}>
        {alert.ai_explanation ? (
          <div
            style={{
              padding: 10,
              borderRadius: 12,
              border: "1px solid rgba(129,140,248,0.4)",
              background:
                "linear-gradient(150deg,rgba(30,41,59,0.65),rgba(30,41,59,0.45))",
              color: "#e0e7ff",
              fontSize: 12,
              lineHeight: 1.4,
            }}
          >
            {alert.ai_explanation}
          </div>
        ) : (
          <button
            disabled={aiExplainingId === alert.id}
            onClick={() => handleAiExplain(alert)}
            style={{
              borderRadius: 12,
              padding: "8px 14px",
              border: "1px solid rgba(129,140,248,0.6)",
              background:
                "linear-gradient(120deg,rgba(129,140,248,0.4),rgba(88,28,135,0.35))",
              color: "#e0e7ff",
              fontSize: 12,
              boxShadow: "0 0 12px rgba(129,140,248,0.4)",
              cursor: aiExplainingId === alert.id ? "not-allowed" : "pointer",
            }}
          >
            {aiExplainingId === alert.id ? "Explaining…" : "Explain with AI"}
          </button>
        )}
      </div>

      {/* STATUS UPDATE */}
      <div>
        <div style={{ fontSize: 12, marginBottom: 6, color: "#9ca3af" }}>
          Update Status
        </div>

        <select
          value={alert.status}
          onChange={(e) =>
            handleUpdateStatus(alert.id, e.target.value)
          }
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: 12,
            border: "1px solid rgba(51,65,85,0.8)",
            background:
              "linear-gradient(120deg, rgba(17,25,45,0.95), rgba(15,23,42,0.88))",
            color: "#e5e7eb",
            fontSize: 13,
          }}
        >
          <option value="open">Open</option>
          <option value="in_review">In Review</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>
    </div>
  );
}
/* =======================================================
   ALERTCARD — ELITE TACTICAL HOLOGRAM EDITION
   ======================================================= */

function AlertCard({ alert, active, onSelect }) {
  const meta = SEVERITY_META[alert.severity] || SEVERITY_META.medium;

  return (
    <div
      onClick={onSelect}
      className="alertcard"
      style={{
        position: "relative",
        borderRadius: 18,
        padding: "14px 16px",
        cursor: "pointer",
        background:
          active
            ? "linear-gradient(145deg, rgba(15,23,42,0.96), rgba(8,14,30,0.92))"
            : "linear-gradient(145deg, rgba(12,22,45,0.85), rgba(6,12,28,0.82))",
        border: active
          ? `1px solid ${meta.border}`
          : "1px solid rgba(51,65,85,0.7)",
        boxShadow: active
          ? `0 0 18px ${meta.border}`
          : "0 0 12px rgba(0,0,0,0.35)",
        transition: "0.25s ease",
        transform: active ? "translateY(-2px)" : "translateY(0px)",
        overflow: "hidden",
      }}
    >
      {/* Hover wash */}
      <div
        className="alertcard-hover"
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 18,
          background:
            "linear-gradient(120deg, rgba(80,120,255,0.15), rgba(120,60,255,0.15))",
          opacity: 0,
          transition: "opacity 0.25s ease",
        }}
      />

      <style>{`
        .alertcard:hover .alertcard-hover {
          opacity: 1 !important;
        }
      `}</style>

      {/* severity halo */}
      <div
        style={{
          position: "absolute",
          top: -10,
          right: -10,
          width: 42,
          height: 42,
          borderRadius: "50%",
          background: meta.bg,
          border: `2px solid ${meta.border}`,
          boxShadow: `0 0 14px ${meta.border}`,
          opacity: 0.35,
          filter: "blur(2px)",
        }}
      />

      {/* vendor */}
      <div
        style={{
          fontSize: 15,
          fontWeight: 600,
          marginBottom: 4,
        }}
      >
        {alert.vendor_name}
      </div>

      {/* rule summary */}
      <div
        style={{
          fontSize: 12,
          color: "#94a3b8",
          marginBottom: 10,
          lineHeight: 1.3,
        }}
      >
        {alert.rule_name}
        <br />
        <span style={{ color: "#64748b" }}>Group: {alert.group_name}</span>
      </div>

      {/* severity chip */}
      <div
        style={{
          display: "inline-block",
          padding: "4px 8px",
          borderRadius: 10,
          color: meta.color,
          background: meta.bg,
          border: `1px solid ${meta.border}`,
          boxShadow: `0 0 8px ${meta.border}`,
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: 0.3,
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        {meta.label}
      </div>

      {/* timestamp */}
      <div
        style={{
          marginTop: 6,
          fontSize: 11,
          color: "#74809a",
        }}
      >
        Last seen: {formatDate(alert.last_seen_at)}
      </div>
    </div>
  );
}
/* =======================================================
   HELPERS
   ======================================================= */
function formatDate(dt) {
  if (!dt) return "—";
  try {
    const d = new Date(dt);
    return (
      d.toLocaleDateString() +
      " • " +
      d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  } catch {
    return dt;
  }
}

function truncate(text, max = 80) {
  if (!text) return "";
  return text.length > max ? text.slice(0, max) + "…" : text;
}

function statusColor(status) {
  const meta = STATUS_META[status] || STATUS_META.open;
  return meta.color;
}

/* =======================================================
   END OF FILE — AlertsCockpitV3
   ======================================================= */

