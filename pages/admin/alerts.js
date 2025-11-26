// pages/admin/alerts.js
import { useEffect, useMemo, useState } from "react";
import { useRole } from "../../lib/useRole";
import { useOrg } from "../../context/OrgContext";
import ToastV2 from "../../components/ToastV2";

/* ==========================================================
   ALERTS COCKPIT V3 — ELITE HUD MODE
   - Cinematic alerts view
   - Severity radar + filters
   - Live rule failure preview
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

/**
 * Shape we expect for each alert:
 * {
 *   id,
 *   vendor_name,
 *   vendor_id,
 *   severity: "critical"|"high"|"medium"|"low",
 *   status: "open"|"in_review"|"resolved",
 *   rule_name,
 *   group_name,
 *   field_key,
 *   expected_value,
 *   actual_value,
 *   requirement_text,
 *   created_at,
 *   last_seen_at
 * }
 */

export default function AlertsCockpitV3() {
  const { isAdmin, isManager } = useRole();
  const { activeOrgId: orgId, loadingOrgs } = useOrg();

  const canEdit = isAdmin || isManager;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [alerts, setAlerts] = useState([]);
  const [selectedAlertId, setSelectedAlertId] = useState(null);
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("open");

  // For future AI explain + bulk actions
  const [aiExplainingId, setAiExplainingId] = useState(null);

  const [toast, setToast] = useState({
    open: false,
    message: "",
    type: "success",
  });

  /* ===========================
       DERIVED DATA
     =========================== */
  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      if (severityFilter !== "all" && a.severity !== severityFilter) return false;
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      return true;
    });
  }, [alerts, severityFilter, statusFilter]);

  const selectedAlert = useMemo(
    () => filteredAlerts.find((a) => a.id === selectedAlertId) || filteredAlerts[0] || null,
    [filteredAlerts, selectedAlertId]
  );

  const severityCounts = useMemo(() => {
    const base = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const a of alerts) {
      if (a.severity && base[a.severity] !== undefined) {
        base[a.severity] += 1;
      }
    }
    return base;
  }, [alerts]);

  /* ===========================
       DATA LOADING
     =========================== */
  useEffect(() => {
    if (loadingOrgs) return;
    if (!orgId) {
      setLoading(false);
      return;
    }
    loadAlerts();
  }, [orgId, loadingOrgs]);

  async function loadAlerts() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/alerts?orgId=${encodeURIComponent(orgId)}`);
      const json = await res.json();

      if (!json.ok) {
        throw new Error(json.error || "Failed to load alerts");
      }

      const list = json.alerts || [];
      setAlerts(list);
      if (list.length) {
        setSelectedAlertId(list[0].id);
      } else {
        setSelectedAlertId(null);
      }
    } catch (err) {
      console.error("loadAlerts error:", err);
      setError(err.message || "Failed to load alerts.");
      setToast({
        open: true,
        type: "error",
        message: err.message || "Failed to load alerts.",
      });
    } finally {
      setLoading(false);
    }
  }

  /* ===========================
       STATUS / ACTIONS
     =========================== */
  async function handleUpdateStatus(alertId, nextStatus) {
    if (!canEdit || !alertId) return;
    // optimistic
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, status: nextStatus } : a))
    );

    try {
      setSaving(true);
      const res = await fetch("/api/alerts/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: alertId, status: nextStatus }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed to update status");

      setToast({
        open: true,
        type: "success",
        message: "Alert status updated.",
      });
    } catch (err) {
      console.error("status update error:", err);
      setToast({
        open: true,
        type: "error",
        message: err.message || "Failed to update status.",
      });
      // revert on failure
      await loadAlerts();
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
      if (!json.ok) throw new Error(json.error || "Failed to explain alert");

      setAlerts((prev) =>
        prev.map((a) =>
          a.id === alert.id ? { ...a, ai_explanation: json.explanation } : a
        )
      );
      setToast({
        open: true,
        type: "success",
        message: "AI explanation updated.",
      });
    } catch (err) {
      console.error("ai explain error:", err);
      setToast({
        open: true,
        type: "error",
        message: err.message || "Failed to explain alert.",
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
        padding: "40px 40px 60px",
        background:
          "radial-gradient(circle at 20% 10%, #020617 0%, #020617 40%, #000 100%)",
        color: "#e5e7eb",
        overflow: "hidden",
      }}
    >
      {/* GLOBAL SCANLINES */}
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

      {/* HEADER */}
      <div style={{ position: "relative", zIndex: 2, marginBottom: 25 }}>
        <div
          style={{
            display: "inline-flex",
            gap: 8,
            padding: "4px 12px",
            borderRadius: 999,
            border: "1px solid rgba(148,163,184,0.4)",
            background:
              "linear-gradient(120deg,rgba(15,23,42,0.9),rgba(15,23,42,0.65))",
            marginBottom: 6,
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
            letterSpacing: 0.5,
          }}
        >
          Live{" "}
          <span
            style={{
              background:
                "linear-gradient(90deg,#38bdf8,#818cf8,#e5e7eb)",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            threat detection
          </span>{" "}
          and compliance alerts.
        </h1>

        <p
          style={{
            marginTop: 8,
            maxWidth: 620,
            fontSize: 13,
            color: "#cbd5f5",
          }}
        >
          This cockpit monitors vendor documents, insurance policies, rule
          violations, and risk thresholds in real time. Powered by the Elite Rule
          Engine V3.
        </p>
      </div>

      {/* ERRORS */}
      {error && (
        <div
          style={{
            position: "relative",
            zIndex: 2,
            marginBottom: 12,
            padding: "8px 12px",
            borderRadius: 10,
            background: "rgba(127,29,29,0.9)",
            border: "1px solid rgba(248,113,113,0.9)",
            color: "#fecaca",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {/* MAIN GRID */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          marginTop: 20,
          display: "grid",
          gridTemplateColumns: "240px 1.4fr 1.2fr",
          gap: 22,
        }}
      >
        {/* =============================
            LEFT PANEL — FILTERS / RADAR
           ============================= */}
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
          {/* TOP GLOW */}
          <div
            style={{
              position: "absolute",
              top: -2,
              left: -2,
              right: -2,
              height: 2,
              background:
                "linear-gradient(90deg, transparent, #3b82f6, #8b5cf6, transparent)",
              opacity: 0.6,
              filter: "blur(1.2px)",
            }}
          />

          {/* FILTER HEADER */}
          <div
            style={{
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: 1.5,
              marginBottom: 12,
              color: "#9ca3af",
            }}
          >
            Filters
          </div>

          {/* STATUS FILTER */}
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

          {/* SEVERITY FILTER */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11, marginBottom: 4, color: "#cbd5f5" }}>
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
              <option value="critical">Critical Only</option>
              <option value="high">High Only</option>
              <option value="medium">Medium Only</option>
              <option value="low">Low Only</option>
            </select>
          </div>

          {/* SEVERITY RADAR */}
          <div style={{ marginTop: 20, marginBottom: 12 }}>
            <div
              style={{
                fontSize: 12,
                textTransform: "uppercase",
                marginBottom: 6,
                color: "#9ca3af",
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
                    padding: "10px 10px",
                    border: `1px solid ${SEVERITY_META[sev].border}`,
                    background: SEVERITY_META[sev].bg,
                    color: SEVERITY_META[sev].color,
                    fontSize: 12,
                    fontWeight: 500,
                    textAlign: "center",
                    boxShadow: `0 0 10px ${SEVERITY_META[sev].border}`,
                  }}
                >
                  {SEVERITY_META[sev].label} — {severityCounts[sev] || 0}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* =============================
            MIDDLE PANEL — ALERT LIST
           ============================= */}
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
              letterSpacing: 1.5,
            }}
          >
            Alerts ({filteredAlerts.length})
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              maxHeight: "620px",
              overflowY: "auto",
              paddingRight: 6,
            }}
          >
            {filteredAlerts.length === 0 ? (
              <div
                style={{
                  padding: 12,
                  borderRadius: 12,
                  border: "1px dashed rgba(148,163,184,0.5)",
                  color: "#9ca3af",
                  fontSize: 12,
                }}
              >
                No alerts match your filters.
              </div>
            ) : (
              filteredAlerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  active={selectedAlertId === alert.id}
                  onSelect={() => setSelectedAlertId(alert.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* =============================
            RIGHT PANEL — ALERT DETAILS
           ============================= */}
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
          {!selectedAlert ? (
            <div style={{ color: "#9ca3af", fontSize: 13 }}>
              Select an alert to see details.
            </div>
          ) : (
            <>
              <div
                style={{
                  fontSize: 12,
                  textTransform: "uppercase",
                  marginBottom: 12,
                  letterSpacing: 1.5,
                  color: "#cbd5f5",
                }}
              >
                Alert Details
              </div>

              {/* VENDOR NAME */}
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                {selectedAlert.vendor_name}
              </div>

              <div
                style={{
                  fontSize: 12,
                  color: "#9ca3af",
                  marginBottom: 10,
                }}
              >
                Rule: {selectedAlert.rule_name} • Group:{" "}
                {selectedAlert.group_name}
              </div>

              {/* SEVERITY CHIP */}
              <div
                style={{
                  display: "inline-block",
                  borderRadius: 12,
                  padding: "6px 10px",
                  border: `1px solid ${SEVERITY_META[selectedAlert.severity].border}`,
                  background: SEVERITY_META[selectedAlert.severity].bg,
                  color: SEVERITY_META[selectedAlert.severity].color,
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 16,
                  boxShadow: `0 0 10px ${SEVERITY_META[selectedAlert.severity].border}`,
                }}
              >
                {SEVERITY_META[selectedAlert.severity].label}
              </div>

              {/* EXPECTED VS ACTUAL */}
              <div
                style={{
                  fontSize: 13,
                  marginBottom: 10,
                  color: "#e5e7eb",
                }}
              >
                <strong>Expected:</strong>{" "}
                <code style={{ color: "#a5b4fc" }}>
                  {selectedAlert.expected_value}
                </code>
                <br />
                <strong>Actual:</strong>{" "}
                <code style={{ color: "#93c5fd" }}>
                  {selectedAlert.actual_value ?? "N/A"}
                </code>
              </div>

              {/* HUMAN TEXT */}
              {selectedAlert.requirement_text && (
                <div
                  style={{
                    fontSize: 12,
                    color: "#cbd5f5",
                    marginBottom: 16,
                  }}
                >
                  {selectedAlert.requirement_text}
                </div>
              )}

              {/* AI EXPLANATION */}
              <div style={{ marginBottom: 18 }}>
                {selectedAlert.ai_explanation ? (
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
                    {selectedAlert.ai_explanation}
                  </div>
                ) : (
                  <button
                    onClick={() => handleAiExplain(selectedAlert)}
                    disabled={aiExplainingId === selectedAlert.id}
                    style={{
                      borderRadius: 12,
                      padding: "8px 14px",
                      border: "1px solid rgba(129,140,248,0.6)",
                      background:
                        "linear-gradient(120deg,rgba(129,140,248,0.4),rgba(88,28,135,0.35))",
                      color: "#e0e7ff",
                      fontSize: 12,
                      boxShadow: "0 0 12px rgba(129,140,248,0.4)",
                      cursor:
                        aiExplainingId === selectedAlert.id
                          ? "not-allowed"
                          : "pointer",
                    }}
                  >
                    {aiExplainingId === selectedAlert.id
                      ? "Explaining…"
                      : "Explain with AI"}
                  </button>
                )}
              </div>

              {/* STATUS UPDATE */}
              <div>
                <label
                  style={{
                    fontSize: 12,
                    color: "#9ca3af",
                    marginBottom: 4,
                    display: "block",
                  }}
                >
                  Status
                </label>

                <select
                  value={selectedAlert.status}
                  onChange={(e) =>
                    handleUpdateStatus(selectedAlert.id, e.target.value)
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
            </>
          )}
        </div>
      </div>

      {/* TOAST + SAVING */}
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
        onClose={() => setToast((p) => ({ ...p, open: false }))}
      />
    </div>
  );
}
/* =======================================================
   ALERTCARD — ELITE TACTICAL HOLOGRAM EDITION
   ======================================================= */

function AlertCard({ alert, active, onSelect }) {
  const sev = alert.severity;
  const meta = SEVERITY_META[sev] || SEVERITY_META.medium;

  return (
    <div
      onClick={onSelect}
      className="alertcard"
      style={{
        position: "relative",
        borderRadius: 16,
        padding: "14px 16px",
        cursor: "pointer",
        background:
          active
            ? "linear-gradient(145deg, rgba(15,23,42,0.95), rgba(8,14,30,0.92))"
            : "linear-gradient(145deg, rgba(12,22,45,0.85), rgba(6,12,28,0.82))",
        border: active
          ? `1px solid ${meta.border}`
          : "1px solid rgba(51,65,85,0.7)",
        boxShadow: active
          ? `0 0 18px ${meta.border}`
          : "0 0 12px rgba(0,0,0,0.35)",
        transition: "all 0.25s ease",
        transform: active ? "translateY(-2px)" : "translateY(0px)",
        overflow: "hidden",
      }}
    >
      {/* Hover Hologram Wash */}
      <div
        className="alertcard-hover"
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 16,
          background:
            "linear-gradient(120deg, rgba(80,120,255,0.15), rgba(120,60,255,0.15))",
          opacity: 0,
          transition: "opacity 0.25s ease",
          pointerEvents: "none",
        }}
      />
      <style>{`
        .alertcard:hover .alertcard-hover {
          opacity: 1 !important;
        }
      `}</style>

      {/* SEVERITY BADGE */}
      <div
        style={{
          position: "absolute",
          top: -10,
          right: -10,
          width: 45,
          height: 45,
          borderRadius: "50%",
          background: meta.bg,
          border: `2px solid ${meta.border}`,
          boxShadow: `0 0 12px ${meta.border}`,
          opacity: 0.35,
          filter: "blur(2px)",
        }}
      />

      {/* VENDOR NAME */}
      <div
        style={{
          fontSize: 15,
          fontWeight: 600,
          marginBottom: 4,
          color: "#e5e7eb",
          letterSpacing: 0.2,
        }}
      >
        {alert.vendor_name}
      </div>

      {/* RULE SUMMARY */}
      <div
        style={{
          fontSize: 12,
          color: "#9ca3af",
          marginBottom: 8,
          lineHeight: 1.3,
        }}
      >
        {alert.rule_name}
        <br />
        <span style={{ color: "#64748b" }}>
          Group: {alert.group_name}
        </span>
      </div>

      {/* SEVERITY TAG */}
      <div
        style={{
          display: "inline-block",
          marginBottom: 6,
          borderRadius: 10,
          padding: "3px 8px",
          fontSize: 11,
          color: meta.color,
          border: `1px solid ${meta.border}`,
          background: meta.bg,
          boxShadow: `0 0 8px ${meta.border}`,
          textTransform: "uppercase",
          letterSpacing: "0.09em",
          fontWeight: 600,
        }}
      >
        {meta.label}
      </div>

      {/* AGE / LAST SEEN */}
      <div
        style={{
          fontSize: 11,
          color: "#74809a",
          marginTop: 4,
        }}
      >
        Last seen:{" "}
        {new Date(alert.last_seen_at).toLocaleDateString()}{" "}
        {new Date(alert.last_seen_at).toLocaleTimeString()}
      </div>
    </div>
  );
}
/* =======================================================
   HELPER — FORMAT DATE
   ======================================================= */
function formatDate(dt) {
  if (!dt) return "Unknown";
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

/* =======================================================
   HELPER — TRUNCATE TEXT
   ======================================================= */
function truncate(str, max = 80) {
  if (!str) return "";
  return str.length > max ? str.slice(0, max) + "…" : str;
}

/* =======================================================
   HELPER — COLORIZED STATUS LABEL
   ======================================================= */
function statusLabel(status) {
  const meta = STATUS_META[status] || { label: status, color: "#9ca3af" };
  return (
    <span
      style={{
        padding: "3px 8px",
        borderRadius: 8,
        background: "rgba(255,255,255,0.08)",
        color: meta.color,
        fontSize: 11,
        letterSpacing: "0.05em",
      }}
    >
      {meta.label}
    </span>
  );
}

/* =======================================================
   END OF FILE — AlertsCockpitV3
   ======================================================= */
