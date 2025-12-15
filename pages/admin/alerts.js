import { useEffect, useMemo, useState } from "react";
import { useRole } from "../../lib/useRole";
import { useOrg } from "../../context/OrgContext";

/* ==========================================================
   ALERTS — ENTERPRISE CINEMATIC V5
   Incident Command / Compliance Operations
========================================================== */

const UI = {
  bg: "#020617",
  panel: "rgba(15,23,42,0.96)",
  border: "rgba(51,65,85,0.9)",
  text: "#e5e7eb",
  textSoft: "#9ca3af",
  red: "#fb7185",
  gold: "#facc15",
  blue: "#38bdf8",
  green: "#22c55e",
  purple: "#a855f7",
};

export default function AlertsV5() {
  const { activeOrgId: orgId, loadingOrgs } = useOrg();
  const { isAdmin, isManager } = useRole();
  const canEdit = isAdmin || isManager;

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  /* ----------------------------------------------------------
     LOAD ALERTS
  ---------------------------------------------------------- */
  useEffect(() => {
    if (!orgId || loadingOrgs) return;

    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/alerts-v2/list?orgId=${orgId}`);
        const json = await res.json();
        setAlerts(json.items || []);
      } catch {
        setAlerts([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [orgId, loadingOrgs]);

  /* ----------------------------------------------------------
     DERIVED STATS
  ---------------------------------------------------------- */
  const stats = useMemo(() => {
    const base = {
      all: alerts.length,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      sla: 0,
    };

    for (const a of alerts) {
      if (a.severity && base[a.severity] !== undefined) {
        base[a.severity]++;
      }
      if (a.sla_due_at && new Date(a.sla_due_at) < new Date()) {
        base.sla++;
      }
    }
    return base;
  }, [alerts]);

  const filtered = useMemo(() => {
    if (filter === "all") return alerts;
    if (filter === "sla") {
      return alerts.filter(
        (a) => a.sla_due_at && new Date(a.sla_due_at) < new Date()
      );
    }
    return alerts.filter((a) => a.severity === filter);
  }, [alerts, filter]);

  /* ----------------------------------------------------------
     EXPORTS
  ---------------------------------------------------------- */
  function exportCSV() {
    window.open(
      `/api/admin/timeline/export.csv?orgId=${orgId}`,
      "_blank"
    );
  }

  function exportPDF() {
    window.open(
      `/api/admin/timeline/export.pdf?orgId=${orgId}`,
      "_blank"
    );
  }

  /* ----------------------------------------------------------
     UI
  ---------------------------------------------------------- */
  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left,#020617 0,#020617 40%,#000 100%)",
        padding: "32px 40px 60px",
        color: UI.text,
      }}
    >
      {/* HEADER */}
      <div
        style={{
          background: UI.panel,
          border: `1px solid ${UI.border}`,
          borderRadius: 20,
          padding: 28,
          marginBottom: 28,
        }}
      >
        <div style={{ fontSize: 12, letterSpacing: "0.18em", color: UI.textSoft }}>
          INCIDENT COMMAND
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginTop: 8,
          }}
        >
          <div>
            <h1 style={{ fontSize: 28, marginBottom: 6 }}>
              Alerts & Compliance
            </h1>
            <p style={{ color: UI.textSoft, maxWidth: 720 }}>
              Real-time compliance incidents, SLA exposure, and automated
              escalation across your organization.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={exportCSV}
              style={exportBtn(UI.blue)}
            >
              Export CSV
            </button>
            <button
              onClick={exportPDF}
              style={exportBtn(UI.purple)}
            >
              Export PDF
            </button>
          </div>
        </div>

        {/* COUNTERS */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6,1fr)",
            gap: 12,
            marginTop: 22,
          }}
        >
          <Stat label="All" value={stats.all} active={filter === "all"} onClick={() => setFilter("all")} />
          <Stat label="Critical" value={stats.critical} color={UI.red} onClick={() => setFilter("critical")} />
          <Stat label="High" value={stats.high} color={UI.gold} onClick={() => setFilter("high")} />
          <Stat label="Medium" value={stats.medium} color={UI.blue} onClick={() => setFilter("medium")} />
          <Stat label="Low" value={stats.low} color={UI.green} onClick={() => setFilter("low")} />
          <Stat label="SLA Breached" value={stats.sla} color={UI.red} onClick={() => setFilter("sla")} />
        </div>
      </div>

      {/* BODY */}
      {loading ? (
        <div style={{ color: UI.textSoft }}>Loading alerts…</div>
      ) : filtered.length === 0 ? (
        <div style={{ color: UI.green, fontSize: 14 }}>
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
          {filtered.map((a) => (
            <div
              key={a.id}
              style={{
                background: UI.panel,
                border: `1px solid ${UI.border}`,
                borderRadius: 16,
                padding: 16,
              }}
            >
              <div style={{ fontSize: 12, color: UI.textSoft }}>
                {a.vendor_name || "Vendor"}
              </div>
              <div style={{ fontWeight: 600, marginTop: 4 }}>
                {a.message}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ==========================================================
   SUB COMPONENTS
========================================================== */

function exportBtn(color) {
  return {
    padding: "10px 16px",
    borderRadius: 999,
    border: `1px solid ${color}`,
    background: `${color}22`,
    color,
    fontWeight: 700,
    cursor: "pointer",
  };
}

function Stat({ label, value, color = "#e5e7eb", onClick, active }) {
  return (
    <div
      onClick={onClick}
      style={{
        cursor: "pointer",
        borderRadius: 14,
        padding: 14,
        border: `1px solid ${color}55`,
        background: active ? `${color}22` : "rgba(15,23,42,0.6)",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 11, color }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
    </div>
  );
}
