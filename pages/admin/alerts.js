import { useEffect, useMemo, useState } from "react";
import { useOrg } from "../../context/OrgContext";
import { useRole } from "../../lib/useRole";

/* ==========================================================
   ALERTS V5 — ENTERPRISE INCIDENT COMMAND
   Canonical rebuild — UI + wiring locked
========================================================== */

const UI = {
  bg: "#020617",
  panel: "rgba(15,23,42,0.97)",
  panelSoft: "rgba(15,23,42,0.75)",
  border: "rgba(51,65,85,0.8)",
  text: "#e5e7eb",
  textSoft: "#9ca3af",
  blue: "#38bdf8",
  green: "#22c55e",
  gold: "#facc15",
  red: "#fb7185",
};

const SEV = {
  critical: { label: "Critical", color: UI.red },
  high: { label: "High", color: UI.gold },
  medium: { label: "Medium", color: UI.blue },
  low: { label: "Low", color: UI.green },
};

function isBreached(a) {
  if (!a?.sla_due_at) return false;
  return new Date(a.sla_due_at) < new Date();
}

export default function AlertsV5() {
  const { activeOrgId: orgId, loadingOrgs } = useOrg();
  const { isAdmin, isManager } = useRole();
  const canResolve = isAdmin || isManager;

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState("grid");

  /* ---------------- LOAD ALERTS ---------------- */
  useEffect(() => {
    if (!orgId || loadingOrgs) return;

    let alive = true;

    (async () => {
      try {
        setLoading(true);
        const r = await fetch(`/api/alerts-v2/list?orgId=${orgId}`);
        const j = await r.json();
        if (!alive) return;
        setAlerts(j?.items || []);
      } catch {
        if (!alive) return;
        setAlerts([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [orgId, loadingOrgs]);

  /* ---------------- COUNTS ---------------- */
  const counts = useMemo(() => {
    const c = { all: alerts.length, critical: 0, high: 0, medium: 0, low: 0, sla: 0 };
    alerts.forEach((a) => {
      if (c[a.severity] !== undefined) c[a.severity]++;
      if (isBreached(a)) c.sla++;
    });
    return c;
  }, [alerts]);

  const filtered = useMemo(() => {
    if (filter === "all") return alerts;
    if (filter === "sla") return alerts.filter(isBreached);
    return alerts.filter((a) => a.severity === filter);
  }, [alerts, filter]);

  /* ---------------- ACTIONS ---------------- */
  function openFix(a) {
    if (!a?.vendor_id || !a?.id) return;
    window.location.href = `/admin/vendor/${a.vendor_id}/fix?alertId=${a.id}`;
  }

  function exportCSV() {
    if (!orgId) return;
    window.open(`/api/admin/timeline/export.csv?orgId=${orgId}`, "_blank");
  }

  function exportPDF() {
    if (!orgId) return;
    window.open(`/api/admin/timeline/export.pdf?orgId=${orgId}`, "_blank");
  }

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left,#020617 0%,#020617 40%,#000 100%)",
        padding: "36px 48px 80px",
        color: UI.text,
      }}
    >
      {/* ================= HEADER ================= */}
      <div
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          borderRadius: 24,
          padding: "30px 34px",
          background: UI.panel,
          border: `1px solid ${UI.border}`,
          boxShadow: "0 40px 90px rgba(0,0,0,0.6)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 24 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: "0.2em", color: UI.textSoft }}>
              INCIDENT COMMAND
            </div>
            <h1 style={{ fontSize: 34, marginTop: 6 }}>
              Alerts & Compliance
            </h1>
            <p style={{ marginTop: 8, color: UI.textSoft, maxWidth: 640 }}>
              Live compliance incidents, SLA exposure, and operational escalation.
            </p>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <ActionBtn label="Export CSV" color={UI.blue} onClick={exportCSV} />
            <ActionBtn label="Export PDF" color={UI.gold} onClick={exportPDF} />
            <ActionBtn
              label={view === "grid" ? "Timeline View" : "Grid View"}
              color={UI.green}
              onClick={() => setView(view === "grid" ? "timeline" : "grid")}
            />
          </div>
        </div>

        {/* ================= COUNTERS ================= */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
            gap: 14,
            marginTop: 24,
          }}
        >
          <Stat label="All" value={counts.all} color={UI.blue} onClick={() => setFilter("all")} active={filter === "all"} />
          <Stat label="Critical" value={counts.critical} color={UI.red} onClick={() => setFilter("critical")} active={filter === "critical"} />
          <Stat label="High" value={counts.high} color={UI.gold} onClick={() => setFilter("high")} active={filter === "high"} />
          <Stat label="Medium" value={counts.medium} color={UI.blue} onClick={() => setFilter("medium")} active={filter === "medium"} />
          <Stat label="Low" value={counts.low} color={UI.green} onClick={() => setFilter("low")} active={filter === "low"} />
          <Stat label="SLA Breached" value={counts.sla} color={UI.red} onClick={() => setFilter("sla")} active={filter === "sla"} />
        </div>

        {!loading && counts.all === 0 && (
          <div
            style={{
              marginTop: 20,
              padding: "14px 16px",
              borderRadius: 14,
              background: "rgba(34,197,94,0.12)",
              border: "1px solid rgba(34,197,94,0.4)",
              color: UI.green,
              fontWeight: 700,
            }}
          >
            ✓ No active compliance incidents.
          </div>
        )}
      </div>

      {/* ================= BODY ================= */}
      <div style={{ maxWidth: 1240, margin: "28px auto 0" }}>
        {loading ? (
          <div style={{ color: UI.textSoft }}>Loading alerts…</div>
        ) : filtered.length === 0 ? (
          <div style={{ color: UI.textSoft }}>
            No alerts in this filter.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill,minmax(360px,1fr))",
              gap: 16,
            }}
          >
            {filtered.map((a) => {
              const meta = SEV[a.severity] || SEV.medium;
              return (
                <div
                  key={a.id}
                  onClick={() => openFix(a)}
                  style={{
                    background: UI.panelSoft,
                    border: `1px solid ${meta.color}55`,
                    borderRadius: 18,
                    padding: 18,
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontSize: 11, color: meta.color }}>
                    {meta.label}
                    {isBreached(a) && (
                      <span style={{ marginLeft: 8, color: UI.red }}>
                        SLA BREACHED
                      </span>
                    )}
                  </div>

                  <div style={{ marginTop: 6, fontWeight: 800 }}>
                    {a.vendor_name || "Vendor"}
                  </div>

                  <div style={{ marginTop: 6, color: UI.textSoft }}>
                    {a.message || a.rule_name}
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <ActionBtn
                      label="Open Fix →"
                      color={UI.blue}
                      onClick={(e) => {
                        e.stopPropagation();
                        openFix(a);
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= SUB COMPONENTS ================= */

function ActionBtn({ label, color, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "10px 16px",
        borderRadius: 999,
        border: `1px solid ${color}`,
        background: `${color}22`,
        color,
        fontWeight: 800,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function Stat({ label, value, color, onClick, active }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: 16,
        borderRadius: 16,
        border: `1px solid ${color}55`,
        background: active ? `${color}22` : "transparent",
        cursor: "pointer",
      }}
    >
      <div style={{ fontSize: 11, color }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800 }}>{value}</div>
    </div>
  );
}
