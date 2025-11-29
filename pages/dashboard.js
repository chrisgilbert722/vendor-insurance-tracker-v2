// pages/dashboard.js
import { useEffect, useState } from "react";
import VendorDrawer from "../components/VendorDrawer";
import { useRole } from "../lib/useRole";
import { useOrg } from "../context/OrgContext";
import EliteStatusPill from "../components/elite/EliteStatusPill";

// BASE CHARTS
import ComplianceTrajectoryChart from "../components/charts/ComplianceTrajectoryChart";
import PassFailDonutChart from "../components/charts/PassFailDonutChart";
import ExpiringCertsHeatmap from "../components/charts/ExpiringCertsHeatmap";
import SeverityDistributionChart from "../components/charts/SeverityDistributionChart";
import RiskTimelineChart from "../components/charts/RiskTimelineChart";

// WEAPON PACK COMPONENTS
import AlertTimelineChart from "../components/charts/AlertTimelineChart";
import TopAlertTypes from "../components/charts/TopAlertTypes";
import AlertAgingKpis from "../components/kpis/AlertAgingKpis";
import SlaBreachWidget from "../components/kpis/SlaBreachWidget";
import CriticalVendorWatchlist from "../components/panels/CriticalVendorWatchlist";
import AlertHeatSignature from "../components/charts/AlertHeatSignature";

/* ===========================
   ELECTRIC NEON THEME
=========================== */
const GP = {
  bg: "#020617",
  panel: "rgba(15,23,42,0.98)",
  borderSoft: "rgba(51,65,85,0.9)",
  borderStrong: "rgba(148,163,184,0.8)",

  neonBlue: "#38bdf8",
  neonPurple: "#a855f7",
  neonGreen: "#22c55e",
  neonGold: "#facc15",
  neonRed: "#fb7185",

  text: "#e5e7eb",
  textSoft: "#9ca3af",
  textMuted: "#6b7280",
};

/* ===========================
   RISK / HELPER FUNCTIONS
=========================== */
function parseExpiration(dateStr) {
  if (!dateStr) return null;
  const [mm, dd, yyyy] = dateStr.split("/");
  const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function computeDaysLeft(dateStr) {
  const d = parseExpiration(dateStr);
  return d ? Math.floor((d - new Date()) / (1000 * 60 * 60 * 24)) : null;
}

function computeRisk(p) {
  const daysLeft = computeDaysLeft(p.expiration_date);
  const flags = [];

  if (daysLeft === null) {
    return {
      daysLeft: null,
      severity: "unknown",
      score: 0,
      flags: ["Missing expiration date"],
      tier: "Unknown",
    };
  }

  let severity = "ok";
  let score = 95;

  if (daysLeft < 0) {
    severity = "expired";
    score = 20;
    flags.push("Policy expired");
  } else if (daysLeft <= 30) {
    severity = "critical";
    score = 40;
    flags.push("Expires ≤30 days");
  } else if (daysLeft <= 90) {
    severity = "warning";
    score = 70;
    flags.push("Expires ≤90 days");
  }

  const tier =
    severity === "expired"
      ? "Severe Risk"
      : severity === "critical"
      ? "High Risk"
      : severity === "warning"
      ? "Moderate Risk"
      : "Healthy";

  return { daysLeft, severity, score, flags, tier };
}

function badgeStyle(level) {
  switch (level) {
    case "expired":
      return {
        background: "rgba(248,113,113,0.18)",
        color: "#fecaca",
        border: "1px solid rgba(248,113,113,0.9)",
      };
    case "critical":
      return {
        background: "rgba(248,181,82,0.18)",
        color: "#fef3c7",
        border: "1px solid rgba(250,204,21,0.9)",
      };
    case "warning":
      return {
        background: "rgba(56,189,248,0.18)",
        color: "#e0f2fe",
        border: "1px solid rgba(56,189,248,0.9)",
      };
    case "ok":
      return {
        background: "rgba(34,197,94,0.18)",
        color: "#bbf7d0",
        border: "1px solid rgba(34,197,94,0.9)",
      };
    default:
      return {
        background: "rgba(51,65,85,0.8)",
        color: "#e5e7eb",
        border: "1px solid rgba(71,85,105,0.9)",
      };
  }
}

function computeAiRisk({ risk, elite, compliance }) {
  if (!risk) return { score: 0, tier: "Unknown" };

  let base = typeof risk.score === "number" ? risk.score : 0;
  let eliteFactor = 1.0;

  if (elite && !elite.loading && !elite.error) {
    if (elite.overall === "fail") eliteFactor = 0.4;
    else if (elite.overall === "warn") eliteFactor = 0.7;
  }

  let complianceFactor = 1.0;
  if (compliance && compliance.failing?.length > 0) complianceFactor = 0.5;
  else if (compliance && compliance.missing?.length > 0)
    complianceFactor = 0.7;

  let score = Math.round(base * eliteFactor * complianceFactor);
  score = Math.max(0, Math.min(score, 100));

  let tier = "Unknown";
  if (score >= 85) tier = "Elite Safe";
  else if (score >= 70) tier = "Preferred";
  else if (score >= 55) tier = "Watch";
  else if (score >= 35) tier = "High Risk";
  else tier = "Severe";

  return { score, tier };
}

function renderComplianceBadge(vendorId, complianceMap) {
  const data = complianceMap[vendorId];
  const base = {
    display: "inline-flex",
    alignItems: "center",
    padding: "3px 8px",
    borderRadius: "999px",
    fontSize: 11,
    fontWeight: 600,
  };

  if (!data || data.loading)
    return (
      <span
        style={{
          ...base,
          background: "rgba(15,23,42,0.98)",
          color: GP.textSoft,
        }}
      >
        Checking…
      </span>
    );

  if (data.error)
    return (
      <span
        style={{
          ...base,
          background: "rgba(127,29,29,0.5)",
          color: "#fecaca",
          border: "1px solid rgba(127,29,29,0.9)",
        }}
      >
        Error
      </span>
    );

  if (data.missing?.length > 0)
    return (
      <span
        style={{
          ...base,
          background: "rgba(250,204,21,0.2)",
          color: "#fef3c7",
          border: "1px solid rgba(250,204,21,0.9)",
        }}
      >
        Missing
      </span>
    );

  if (data.failing?.length > 0)
    return (
      <span
        style={{
          ...base,
          background: "rgba(248,113,113,0.2)",
          color: "#fecaca",
          border: "1px solid rgba(248,113,113,0.9)",
        }}
      >
        Non-compliant
      </span>
    );

  return (
    <span
      style={{
        ...base,
        background: "rgba(34,197,94,0.2)",
        color: "#bbf7d0",
        border: "1px solid rgba(34,197,94,0.9)",
      }}
    >
      🛡️ Compliant
    </span>
  );
}
/* ===========================
   MAIN DASHBOARD COMPONENT
=========================== */
export default function Dashboard() {
  const { isAdmin, isManager } = useRole();
  const { activeOrgId } = useOrg();

  // Dashboard V3 overview
  const [dashboard, setDashboard] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  // Policies
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterText, setFilterText] = useState("");

  // Compliance / Elite
  const [complianceMap, setComplianceMap] = useState({});
  const [eliteMap, setEliteMap] = useState({});
  const [eliteSummary, setEliteSummary] = useState({ pass: 0, warn: 0, fail: 0 });

  // Alerts
  const [alerts, setAlerts] = useState([]);
  const [showAlerts, setShowAlerts] = useState(false);

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerVendor, setDrawerVendor] = useState(null);
  const [drawerPolicies, setDrawerPolicies] = useState([]);

  /* ===========================
      LOAD DASHBOARD OVERVIEW
  ============================ */
  useEffect(() => {
    if (!activeOrgId) return;

    async function loadDashboard() {
      try {
        setDashboardLoading(true);
        const res = await fetch(`/api/dashboard/overview?orgId=${activeOrgId}`);
        const data = await res.json();
        if (data.ok) setDashboard(data.overview);
      } finally {
        setDashboardLoading(false);
      }
    }

    loadDashboard();
  }, [activeOrgId]);

  /* ===========================
      LOAD POLICIES
  ============================ */
  useEffect(() => {
    async function load() {
      const res = await fetch("/api/get-policies");
      const data = await res.json();
      if (data.ok) setPolicies(data.policies);
      setLoading(false);
    }
    load();
  }, []);

  /* ===========================
      LOAD COMPLIANCE
  ============================ */
  useEffect(() => {
    if (!policies.length || !activeOrgId) return;

    const vendorIds = [...new Set(policies.map((p) => p.vendor_id))];

    vendorIds.forEach((vendorId) => {
      if (complianceMap[vendorId]?.loading === false) return;

      setComplianceMap((prev) => ({ ...prev, [vendorId]: { loading: true } }));

      fetch(`/api/requirements/check?vendorId=${vendorId}&orgId=${activeOrgId}`)
        .then((res) => res.json())
        .then((data) => {
          setComplianceMap((prev) => ({
            ...prev,
            [vendorId]: data.ok
              ? {
                  loading: false,
                  summary: data.summary,
                  missing: data.missing || [],
                  failing: data.failing || [],
                  passing: data.passing || [],
                }
              : { loading: false, error: data.error },
          }));
        })
        .catch(() => {
          setComplianceMap((prev) => ({
            ...prev,
            [vendorId]: { loading: false, error: "Failed to load" },
          }));
        });
    });
  }, [policies, activeOrgId, complianceMap]);

  /* ===========================
      LOAD ELITE ENGINE RESULTS
  ============================ */
  useEffect(() => {
    if (!policies.length) return;

    const vendorIds = [...new Set(policies.map((p) => p.vendor_id))];

    vendorIds.forEach((vendorId) => {
      if (eliteMap[vendorId]?.loading === false) return;

      const primary = policies.find((p) => p.vendor_id === vendorId);
      if (!primary) return;

      const coidata = {
        expirationDate: primary.expiration_date,
        generalLiabilityLimit: primary.limit_each_occurrence,
        autoLimit: primary.auto_limit,
        workCompLimit: primary.work_comp_limit,
        policyType: primary.coverage_type,
      };

      setEliteMap((prev) => ({ ...prev, [vendorId]: { loading: true } }));

      fetch("/api/elite/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coidata }),
      })
        .then((res) => res.json())
        .then((data) => {
          setEliteMap((prev) => ({
            ...prev,
            [vendorId]: data.ok
              ? { loading: false, overall: data.overall, rules: data.rules }
              : { loading: false, error: data.error },
          }));
        })
        .catch(() => {
          setEliteMap((prev) => ({
            ...prev,
            [vendorId]: { loading: false, error: "Failed to load" },
          }));
        });
    });
  }, [policies, eliteMap]);

  /* ===========================
      ELITE SUMMARY COUNTER
  ============================ */
  useEffect(() => {
    let pass = 0,
      warn = 0,
      fail = 0;

    Object.values(eliteMap).forEach((e) => {
      if (!e || e.loading || e.error) return;

      if (e.overall === "pass") pass++;
      else if (e.overall === "warn") warn++;
      else if (e.overall === "fail") fail++;
    });

    setEliteSummary({ pass, warn, fail });
  }, [eliteMap]);


  /* ===========================
      LOAD V2 ALERTS
  ============================ */
  useEffect(() => {
    if (!activeOrgId) return;

    async function loadAlerts() {
      const res = await fetch(`/api/alerts/get?orgId=${activeOrgId}`);
      const data = await res.json();
      if (data.ok) setAlerts(data.alerts);
    }

    loadAlerts();
    const interval = setInterval(loadAlerts, 7000);
    return () => clearInterval(interval);
  }, [activeOrgId]);

  /* ===========================
      COMPUTED KPI VALUES
  ============================ */
  const avgScore = dashboard?.globalScore ?? 0;
  const totalVendors = dashboard?.vendorCount ?? 0;

  const alertsCount =
    (dashboard?.alerts?.expired ?? 0) +
    (dashboard?.alerts?.critical30d ?? 0) +
    (dashboard?.alerts?.warning90d ?? 0) +
    (dashboard?.alerts?.eliteFails ?? 0);

  /* ===========================
      FILTERED POLICIES
  ============================ */
  const filtered = policies.filter((p) => {
    const t = filterText.toLowerCase();
    return (
      !t ||
      p.vendor_name?.toLowerCase().includes(t) ||
      p.policy_number?.toLowerCase().includes(t) ||
      p.carrier?.toLowerCase().includes(t) ||
      p.coverage_type?.toLowerCase().includes(t)
    );
  });
  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left,#020617 0,#020617 45%,#000000 100%)",
        padding: "32px 40px 40px",
        color: GP.text,
      }}
    >
      {/* =======================================
          HERO COMMAND PANEL
      ======================================= */}
      <div
        className="cockpit-hero cockpit-pulse"
        style={{
          borderRadius: 28,
          padding: 22,
          marginBottom: 30,
          border: "1px solid rgba(148,163,184,0.45)",
          background:
            "radial-gradient(circle at top left,rgba(15,23,42,0.98),rgba(15,23,42,0.92))",
          boxShadow: `
            0 0 55px rgba(0,0,0,0.85),
            0 0 70px rgba(56,189,248,0.35),
            inset 0 0 25px rgba(0,0,0,0.7)
          `,
          display: "grid",
          gridTemplateColumns: "minmax(0,1.8fr) minmax(0,1.3fr)",
          gap: 24,
          position: "relative",
        }}
      >
        {/* LEFT SIDE — Title / AI Summary / KPIs / Alerts */}
        <div style={{ paddingTop: 22 }}>
          {/* HUD LABEL */}
          <div
            style={{
              position: "absolute",
              top: 12,
              left: 18,
              fontSize: 10,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(148,163,184,0.7)",
            }}
          >
            DASHBOARD V4 • GLOBAL COMPLIANCE ENGINE
          </div>

          {/* TITLE */}
          <h1
            style={{
              fontSize: 30,
              fontWeight: 600,
              margin: 0,
              letterSpacing: 0.18,
              background:
                "linear-gradient(90deg,#38bdf8,#a855f7,#22c55e,#facc15)",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            Vendor Insurance Intelligence
          </h1>

          <p
            style={{
              marginTop: 8,
              fontSize: 13,
              color: GP.textSoft,
              maxWidth: 640,
              lineHeight: 1.5,
            }}
          >
            Live AI-powered oversight across all vendors, policies, expirations,
            and risk engines. This is your command center.
          </p>

          {/* AI SNAPSHOT PILL */}
          <div
            style={{
              marginTop: 12,
              fontSize: 12,
              color: GP.textSoft,
              borderRadius: 999,
              padding: "6px 12px",
              border: "1px solid rgba(55,65,81,0.9)",
              background:
                "linear-gradient(90deg,rgba(15,23,42,0.98),rgba(15,23,42,0.9))",
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span>🤖</span>
            <span>
              AI snapshot: system health{" "}
              <strong
                style={{
                  color:
                    Number(avgScore) >= 80
                      ? GP.neonGreen
                      : Number(avgScore) >= 60
                      ? GP.neonGold
                      : GP.neonRed,
                }}
              >
                {dashboardLoading ? "—" : Number(avgScore).toFixed(0)}
              </strong>
              /100 across{" "}
              <strong style={{ color: GP.neonBlue }}>
                {dashboardLoading ? "—" : totalVendors}
              </strong>
              , {dashboardLoading ? "—" : alertsCount} active alerts.
            </span>
          </div>

          {/* ACTION BUTTONS */}
          <div
            style={{
              marginTop: 16,
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            {(isAdmin || isManager) && (
              <a
                href="/upload-coi"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 16px",
                  borderRadius: 999,
                  background:
                    "radial-gradient(circle at top left,#0ea5e9,#1d4ed8,#020617)",
                  color: "#e0f2fe",
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: "none",
                  boxShadow:
                    "0 0 18px rgba(56,189,248,0.35),0 0 32px rgba(30,64,175,0.25)",
                }}
              >
                + Upload New COI
              </a>
            )}

            <button
              onClick={() => setShowAlerts((s) => !s)}
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                border: "1px solid rgba(51,65,85,0.9)",
                background: "rgba(15,23,42,0.9)",
                cursor: "pointer",
                display: "flex",
                gap: 6,
                fontSize: 13,
                color: "#e5e7eb",
              }}
            >
              🔔 Alerts ({alerts.length})
            </button>
          </div>

          {/* KPI STRIP */}
          <div
            style={{
              marginTop: 20,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
              gap: 12,
            }}
          >
            <MiniKpi
              label="Expired"
              value={dashboard?.alerts?.expired ?? 0}
              color={GP.neonRed}
              icon="🔥"
            />
            <MiniKpi
              label="Critical ≤30d"
              value={dashboard?.alerts?.critical30d ?? 0}
              color={GP.neonGold}
              icon="⚠️"
            />
            <MiniKpi
              label="Warning ≤90d"
              value={dashboard?.alerts?.warning90d ?? 0}
              color={GP.neonBlue}
              icon="🟡"
            />
            <MiniKpi
              label="Elite Fails"
              value={dashboard?.alerts?.eliteFails ?? 0}
              color={GP.neonRed}
              icon="🧠"
            />
          </div>

          {/* SEVERITY BREAKDOWN */}
          <div
            style={{
              marginTop: 22,
              padding: 16,
              borderRadius: 18,
              background: "rgba(15,23,42,0.85)",
              border: "1px solid rgba(51,65,85,0.9)",
              boxShadow: "0 12px 35px rgba(0,0,0,0.55)",
              maxWidth: 440,
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: GP.textSoft,
                marginBottom: 8,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Alert Severity Breakdown
            </div>

            {!dashboardLoading && dashboard?.severityBreakdown ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 12,
                }}
              >
                <SeverityBox
                  label="Critical"
                  count={dashboard.severityBreakdown.critical}
                  color="#fb7185"
                />
                <SeverityBox
                  label="High"
                  count={dashboard.severityBreakdown.high}
                  color="#facc15"
                />
                <SeverityBox
                  label="Medium"
                  count={dashboard.severityBreakdown.medium}
                  color="#38bdf8"
                />
                <SeverityBox
                  label="Low"
                  count={dashboard.severityBreakdown.low}
                  color="#22c55e"
                />
              </div>
            ) : (
              <div style={{ fontSize: 12, color: GP.textMuted }}>
                Loading…
              </div>
            )}
          </div>

          {/* ALERT DROPDOWN (with Resolve) */}
          {showAlerts && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                right: 22,
                marginTop: 10,
                width: 320,
                background:
                  "radial-gradient(circle at top,#020617,#020617 70%,#020617)",
                border: "1px solid rgba(51,65,85,0.9)",
                borderRadius: 16,
                padding: 12,
                maxHeight: 340,
                overflowY: "auto",
                boxShadow: "0 12px 40px rgba(0,0,0,0.7)",
                zIndex: 20,
              }}
            >
              {alerts.length === 0 ? (
                <div style={{ fontSize: 12, color: GP.textMuted }}>
                  No alerts yet.
                </div>
              ) : (
                alerts.map((a) => (
                  <div
                    key={a.id}
                    style={{
                      paddingBottom: 8,
                      marginBottom: 8,
                      borderBottom: "1px solid rgba(55,65,81,0.8)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: GP.neonBlue,
                        textTransform: "uppercase",
                        marginBottom: 2,
                      }}
                    >
                      {a.type.replace(/_/g, " ")}
                    </div>

                    <div style={{ fontSize: 12, color: "#e5e7eb" }}>
                      {a.message}
                    </div>

                    <div style={{ fontSize: 10, color: GP.textMuted, marginTop: 2 }}>
                      {new Date(a.created_at).toLocaleString()}
                    </div>

                    {/* RESOLVE BUTTON */}
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();

                        await fetch("/api/alerts-v2/resolve", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            alertId: a.id,
                            orgId: activeOrgId,
                          }),
                        });

                        // Refresh alerts
                        const refreshed = await fetch(
                          `/api/alerts/get?orgId=${activeOrgId}`
                        ).then((r) => r.json());
                        if (refreshed.ok) setAlerts(refreshed.alerts);

                        // Refresh dashboard overview
                        const dash = await fetch(
                          `/api/dashboard/overview?orgId=${activeOrgId}`
                        ).then((r) => r.json());
                        if (dash.ok) setDashboard(dash.overview);
                      }}
                      style={{
                        marginTop: 8,
                        padding: "6px 10px",
                        borderRadius: 8,
                        border: "1px solid rgba(56,189,248,0.6)",
                        background: "rgba(15,23,42,0.6)",
                        color: "#38bdf8",
                        fontSize: 11,
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      ✔ Resolve
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* RIGHT SIDE — Global Score + Elite Snapshot */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 16,
            paddingTop: 28,
          }}
        >
          {/* GLOBAL SCORE DONUT */}
          <div
            style={{
              position: "relative",
              width: 160,
              height: 160,
              borderRadius: "50%",
              background:
                "conic-gradient(from 220deg,#22c55e,#a3e635,#facc15,#fb7185,#0f172a)",
              padding: 5,
              boxShadow: "0 0 50px rgba(34,197,94,0.45),0 0 80px rgba(148,163,184,0.3)",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 12,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle at 30% 0,#020617,#020617 60%,#000)",
              }}
            />

            <div
              style={{
                position: "relative",
                zIndex: 1,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: GP.textSoft,
                  marginBottom: 2,
                }}
              >
                Global Score
              </div>

              <div
                style={{
                  fontSize: 32,
                  fontWeight: 700,
                  background:
                    "linear-gradient(120deg,#22c55e,#bef264,#facc15)",
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                }}
              >
                {dashboardLoading ? "—" : Number(avgScore).toFixed(0)}
              </div>

              <div style={{ fontSize: 10, color: GP.textMuted }}>/100</div>
            </div>
          </div>

          {/* ELITE SNAPSHOT */}
          <div
            style={{
              borderRadius: 18,
              padding: 12,
              border: "1px solid rgba(51,65,85,0.9)",
              background: "rgba(15,23,42,0.98)",
              minWidth: 220,
            }}
          >
            <div style={{ fontSize: 12, color: GP.textSoft, marginBottom: 6 }}>
              Elite Engine Snapshot
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                color: "#4ade80",
              }}
            >
              <span>PASS</span>
              <span>{eliteSummary.pass}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                color: "#facc15",
              }}
            >
              <span>WARN</span>
              <span>{eliteSummary.warn}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                color: "#fb7185",
              }}
            >
              <span>FAIL</span>
              <span>{eliteSummary.fail}</span>
            </div>
          </div>
        </div>
      </div>
      {/* =======================================
          CHART ROW — cockpit-telemetry
      ======================================= */}
      <div
        className="cockpit-telemetry"
        style={{
          marginTop: 10,
          marginBottom: 40,
          display: "grid",
          gridTemplateColumns: "minmax(0,2fr) minmax(0,1.2fr)",
          gap: 24,
        }}
      >
        <ComplianceTrajectoryChart />
        <PassFailDonutChart />
      </div>

      {/* =======================================
          SECONDARY BASE CHARTS
      ======================================= */}
      <ExpiringCertsHeatmap policies={policies} />
      <SeverityDistributionChart policies={policies} />
      <RiskTimelineChart policies={policies} />

      {/* =======================================
          ALERT WEAPON PACK (ALL 6 COMPONENTS)
      ======================================= */}
      <AlertTimelineChart orgId={activeOrgId} />
      <TopAlertTypes orgId={activeOrgId} />
      <AlertAgingKpis orgId={activeOrgId} />
      <SlaBreachWidget orgId={activeOrgId} />
      <CriticalVendorWatchlist orgId={activeOrgId} />
      <AlertHeatSignature orgId={activeOrgId} />

      {/* =======================================
          POLICIES TABLE
      ======================================= */}
      <h2
        style={{
          marginTop: 32,
          marginBottom: 10,
          fontSize: 20,
          fontWeight: 600,
          color: "#e5e7eb",
        }}
      >
        Policies
      </h2>

      <input
        type="text"
        placeholder="Search vendors, carriers, policy #, coverage…"
        value={filterText}
        onChange={(e) => setFilterText(e.target.value)}
        style={{
          padding: "8px 12px",
          width: 320,
          borderRadius: 999,
          border: "1px solid rgba(51,65,85,0.95)",
          background: "rgba(15,23,42,0.96)",
          color: "#e5e7eb",
          fontSize: 12,
          marginBottom: 14,
          outline: "none",
        }}
      />

      {loading && (
        <div style={{ fontSize: 13, color: GP.textSoft }}>
          Loading policies…
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div style={{ fontSize: 13, color: GP.textSoft }}>
          No matching policies.
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <>
          <div
            className="cockpit-table-shell"
            style={{
              borderRadius: 24,
              border: "1px solid rgba(30,41,59,0.98)",
              background: "rgba(15,23,42,0.98)",
              boxShadow: "0 18px 45px rgba(15,23,42,0.95)",
              overflow: "hidden",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "separate",
                borderSpacing: 0,
                fontSize: 12,
              }}
            >
              <thead>
                <tr>
                  <th style={th}>Vendor</th>
                  <th style={th}>Policy #</th>
                  <th style={th}>Carrier</th>
                  <th style={th}>Coverage</th>
                  <th style={th}>Expires</th>
                  <th style={th}>Days Left</th>
                  <th style={th}>Status</th>
                  <th style={th}>Risk Tier</th>
                  <th style={th}>AI Risk</th>
                  <th style={th}>Compliance</th>
                  <th style={th}>Elite</th>
                  <th style={th}>Flags</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((p) => {
                  const risk = computeRisk(p);
                  const flags = risk.flags || [];
                  const elite = eliteMap[p.vendor_id];
                  const compliance = complianceMap[p.vendor_id];
                  const ai = computeAiRisk({ risk, elite, compliance });

                  return (
                    <tr
                      key={p.id}
                      onClick={() => openDrawer(p.vendor_id)}
                      style={{
                        cursor: "pointer",
                        background:
                          "linear-gradient(90deg,rgba(15,23,42,0.98),rgba(15,23,42,0.92))",
                      }}
                    >
                      <td style={td}>{p.vendor_name || "—"}</td>
                      <td style={td}>{p.policy_number}</td>
                      <td style={td}>{p.carrier}</td>
                      <td style={td}>{p.coverage_type}</td>
                      <td style={td}>{p.expiration_date || "—"}</td>
                      <td style={td}>{risk.daysLeft ?? "—"}</td>

                      <td
                        style={{
                          ...td,
                          textAlign: "center",
                          ...badgeStyle(risk.severity),
                        }}
                      >
                        {risk.severity === "ok"
                          ? "Active"
                          : risk.severity.charAt(0).toUpperCase() +
                            risk.severity.slice(1)}
                      </td>

                      <td style={{ ...td, textAlign: "center" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            padding: "3px 10px",
                            borderRadius: 999,
                            border: "1px solid rgba(51,65,85,0.98)",
                            background: "rgba(15,23,42,1)",
                            color: GP.textSoft,
                            fontSize: 11,
                          }}
                        >
                          {risk.tier}
                        </span>
                      </td>

                      <td
                        style={{
                          ...td,
                          textAlign: "center",
                          fontWeight: 600,
                          color:
                            ai.score >= 80
                              ? GP.neonGreen
                              : ai.score >= 60
                              ? GP.neonGold
                              : GP.neonRed,
                        }}
                      >
                        <div>{ai.score}</div>

                        <div
                          style={{
                            marginTop: 4,
                            height: 4,
                            width: 70,
                            borderRadius: 999,
                            background: "rgba(15,23,42,1)",
                            overflow: "hidden",
                            marginLeft: "auto",
                            marginRight: "auto",
                          }}
                        >
                          <div
                            style={{
                              width: `${ai.score}%`,
                              height: "100%",
                              background:
                                ai.score >= 80
                                  ? GP.neonGreen
                                  : ai.score >= 60
                                  ? GP.neonGold
                                  : GP.neonRed,
                            }}
                          />
                        </div>
                      </td>

                      <td style={{ ...td, textAlign: "center" }}>
                        {renderComplianceBadge(p.vendor_id, complianceMap)}
                      </td>

                      <td style={{ ...td, textAlign: "center" }}>
                        {elite && !elite.loading && !elite.error ? (
                          <EliteStatusPill status={elite.overall} />
                        ) : elite && elite.loading ? (
                          <span style={{ fontSize: 11, color: GP.textMuted }}>
                            Evaluating…
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, color: GP.textMuted }}>
                            —
                          </span>
                        )}
                      </td>

                      <td style={{ ...td, textAlign: "center" }}>
                        {flags.length > 0 ? (
                          <span
                            title={flags.join("\n")}
                            style={{ cursor: "help" }}
                          >
                            🚩 {flags.length}
                          </span>
                        ) : (
                          <span style={{ opacity: 0.4 }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {drawerOpen && drawerVendor && (
            <VendorDrawer
              vendor={drawerVendor}
              policies={drawerPolicies}
              onClose={closeDrawer}
            />
          )}
        </>
      )}
    </div>
  );
}
/* =======================================
   SEVERITY BOX COMPONENT
======================================= */
function SeverityBox({ label, count, color }) {
  return (
    <div
      style={{
        border: `1px solid ${color}55`,
        borderRadius: 12,
        padding: "10px 8px",
        background: "rgba(15,23,42,0.9)",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: color,
          marginBottom: 2,
          fontWeight: 600,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: color,
        }}
      >
        {count}
      </div>
    </div>
  );
}

/* =======================================
   MINI KPI COMPONENT
======================================= */
function MiniKpi({ label, value, color, icon }) {
  return (
    <div
      style={{
        borderRadius: 16,
        padding: 10,
        border: "1px solid rgba(51,65,85,0.9)",
        background:
          "radial-gradient(circle at top left,rgba(15,23,42,0.98),rgba(15,23,42,0.94))",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <div style={{ fontSize: 18 }}>{icon}</div>

      <div>
        <div style={{ fontSize: 12, color: GP.textSoft, marginBottom: 2 }}>
          {label}
        </div>

        <div style={{ fontSize: 16, fontWeight: 600, color }}>{value}</div>
      </div>
    </div>
  );
}
/* =======================================
   TABLE HEADER + CELL STYLES
======================================= */
const th = {
  padding: "10px 12px",
  background: "rgba(15,23,42,0.98)",
  color: "#9ca3af",
  fontWeight: 600,
  textAlign: "left",
  fontSize: 12,
  borderBottom: "1px solid rgba(51,65,85,0.8)",
};

const td = {
  padding: "10px 12px",
  borderBottom: "1px solid rgba(51,65,85,0.5)",
  fontSize: 12,
  color: "#e5e7eb",
};

/* =======================================
   EOF — PREVENT ISOLATED MODULE ERRORS
======================================= */
export {}; // END OF FILE
