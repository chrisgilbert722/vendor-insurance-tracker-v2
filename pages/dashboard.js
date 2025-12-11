// pages/dashboard.js — Dashboard V5 (Cinematic Intelligence Cockpit)
// Fully upgraded + Spotlight V4 guided tour

import { useEffect, useState } from "react";
import VendorDrawer from "../components/VendorDrawer";
import { useRole } from "../lib/useRole";
import { useOrg } from "../context/OrgContext";
import EliteStatusPill from "../components/elite/EliteStatusPill";

// ONBOARDING COCKPIT
import OnboardingHeroCard from "../components/onboarding/OnboardingHeroCard";
import OnboardingBanner from "../components/onboarding/OnboardingBanner";

// ⭐ SPOTLIGHT ENGINE V4
import {
  useDashboardSpotlightV3,
  DashboardSpotlightV3,
} from "../components/DashboardSpotlightV3";

// CHARTS (Risk + Compliance Intelligence)
import ComplianceTrajectoryChart from "../components/charts/ComplianceTrajectoryChart";
import PassFailDonutChart from "../components/charts/PassFailDonutChart";
import ExpiringCertsHeatmap from "../components/charts/ExpiringCertsHeatmap";
import SeverityDistributionChart from "../components/charts/SeverityDistributionChart";
import RiskTimelineChart from "../components/charts/RiskTimelineChart";

// ALERTS V2 INTELLIGENCE (6 widgets for Step 3)
import AlertTimelineChart from "../components/charts/AlertTimelineChart";
import TopAlertTypes from "../components/charts/TopAlertTypes";
import AlertAgingKpis from "../components/kpis/AlertAgingKpis";
import SlaBreachWidget from "../components/kpis/SlaBreachWidget";
import CriticalVendorWatchlist from "../components/panels/CriticalVendorWatchlist";
import AlertHeatSignature from "../components/charts/AlertHeatSignature";

// RENEWAL INTELLIGENCE V3
import RenewalHeatmap from "../components/renewals/RenewalHeatmap";
import RenewalBacklog from "../components/renewals/RenewalBacklog";
import RenewalSlaWidget from "../components/renewals/RenewalSlaWidget";
import RenewalCalendar from "../components/renewals/RenewalCalendar";
import RenewalAiSummary from "../components/renewals/RenewalAiSummary";

/* ============================================================
   ELECTRIC NEON THEME
============================================================ */
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

/* ============================================================
   RISK + EXPIRATION HELPERS (UNCHANGED)
============================================================ */
function parseExpiration(dateStr) {
  if (!dateStr) return null;
  const [mm, dd, yyyy] = String(dateStr).split("/");
  if (!mm || !dd || !yyyy) return null;
  const d = new Date(`${yyyy}-${mm}-${dd}`);
  return isNaN(d.getTime()) ? null : d;
}

function computeDaysLeft(dateStr) {
  const d = parseExpiration(dateStr);
  return d ? Math.floor((d.getTime() - Date.now()) / 86400000) : null;
}

function computeRisk(policy) {
  const daysLeft = computeDaysLeft(policy.expiration_date);
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
        background: "rgba(250,204,21,0.18)",
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

/* ============================================================
   AI RISK + ENGINE HELPERS (UNCHANGED)
============================================================ */
function computeAiRisk({ risk, elite, compliance }) {
  let base = risk?.score ?? 0;

  let eliteFactor = 1;
  if (elite && !elite.loading && !elite.error) {
    eliteFactor = elite.overall === "fail" ? 0.4 : elite.overall === "warn" ? 0.7 : 1;
  }

  let complianceFactor = 1;
  if (compliance?.failing?.length > 0) complianceFactor = 0.5;
  else if (compliance?.missing?.length > 0) complianceFactor = 0.7;

  let score = Math.max(0, Math.min(100, Math.round(base * eliteFactor * complianceFactor)));

  let tier =
    score >= 85
      ? "Elite Safe"
      : score >= 70
      ? "Preferred"
      : score >= 55
      ? "Watch"
      : score >= 35
      ? "High Risk"
      : "Severe";

  return { score, tier };
}

function computeV3Tier(score) {
  if (score >= 85) return "Elite Safe";
  if (score >= 70) return "Preferred";
  if (score >= 55) return "Watch";
  if (score >= 35) return "High Risk";
  return "Severe";
}

function summarizeEngineHealth(engineMap) {
  const vendors = Object.values(engineMap).filter(
    (v) => v.loaded && !v.error && typeof v.globalScore === "number"
  );

  if (!vendors.length) {
    return { avg: 0, fails: 0, critical: 0, total: 0 };
  }

  let total = 0;
  let fails = 0;
  let critical = 0;

  vendors.forEach((v) => {
    total += v.globalScore ?? 0;
    if (v.failedCount > 0) fails++;
    if (v.failingRules?.some((r) => r.severity === "critical")) critical++;
  });

  return {
    avg: Math.round(total / vendors.length),
    fails,
    critical,
    total: vendors.length,
  };
}
/* ============================================================
   MAIN DASHBOARD COMPONENT — WITH SPOTLIGHT V4
============================================================ */
export default function Dashboard() {
  const { isAdmin, isManager } = useRole();
  const { activeOrgId } = useOrg();

  // STATE
  const [onboardingComplete, setOnboardingComplete] = useState(true);
  const [showHero, setShowHero] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const [dashboard, setDashboard] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  const [policies, setPolicies] = useState([]);
  const [loadingPolicies, setLoadingPolicies] = useState(true);
  const [filterText, setFilterText] = useState("");

  const [complianceMap, setComplianceMap] = useState({});
  const [eliteMap, setEliteMap] = useState({});
  const [eliteSummary, setEliteSummary] = useState({ pass: 0, warn: 0, fail: 0 });

  const [engineMap, setEngineMap] = useState({});
  const [alertSummary, setAlertSummary] = useState(null);
  const [showAlerts, setShowAlerts] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerVendor, setDrawerVendor] = useState(null);
  const [drawerPolicies, setDrawerPolicies] = useState([]);

  const [systemTimeline, setSystemTimeline] = useState([]);
  const [systemTimelineLoading, setSystemTimelineLoading] = useState(true);

  /* ============================================================
     ⭐ SPOTLIGHT V4 CONFIGURATION
     Steps:
       0 = Donut (score-box)
       1 = KPI Strip (kpi-strip)
       2 = Alerts Intelligence (alerts-intel)
       3 = Renewal Heatmap (renewals-panel)
       4 = Policies Table (policies-panel)
============================================================ */
  const spotlight = useDashboardSpotlightV3([
    {
      selector: "[data-spotlight='score-box']",
      title: "Your Global Compliance Score",
      description:
        "This is your live AI-powered safety score across all vendors. If this drops, something requires attention.",
    },
    {
      selector: "[data-spotlight='kpi-strip']",
      title: "Daily AI Compliance KPIs",
      description:
        "These KPIs show expired COIs, risk warnings, and Elite Engine failures — the fastest way to know what needs attention today.",
    },
    {
      selector: "[data-spotlight='alerts-intel']",
      title: "Alerts Intelligence Center",
      description:
        "Your 6-layer alerts intelligence system: alert trends, types, severity, SLA breaches, vendor heat signatures, and timeline.",
    },
    {
      selector: "[data-spotlight='renewals-panel']",
      title: "Renewal Heatmap",
      description:
        "AI-powered renewal forecast showing all policies expiring within 90 days so you never miss a renewal window.",
    },
    {
      selector: "[data-spotlight='policies-panel']",
      title: "Vendor Policy Cockpit",
      description:
        "Your full vendor COI cockpit — AI risk, V5 rules, Elite status, compliance checks, and expiration insights.",
    },
  ]);

  /* ============================================================
     ONBOARDING + METRICS LOADERS (unchanged)
============================================================ */

  useEffect(() => {
    if (!activeOrgId) return;

    (async () => {
      try {
        const res = await fetch(`/api/onboarding/status?orgId=${activeOrgId}`);
        const json = await res.json();
        if (json.ok) {
          const done = !!json.onboardingComplete;
          setOnboardingComplete(done);
          setShowHero(!done);
        }
      } catch (err) {
        console.error("[dashboard] onboarding status error:", err);
      }
    })();
  }, [activeOrgId]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("onboardingBannerDismissed");
      if (stored === "true") setBannerDismissed(true);
    } catch {}
  }, []);

  const handleDismissBanner = () => {
    setBannerDismissed(true);
    try {
      localStorage.setItem("onboardingBannerDismissed", "true");
    } catch {}
  };

  const handleStartOnboarding = () => {
    window.location.href = "/onboarding/start";
  };

  /* ============================================================
     HERO PANEL + STEP 1 + STEP 2
============================================================ */

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
      {/* --- ONBOARDING TOP LAYER --- */}
      {!onboardingComplete && (
        <>
          {showHero && (
            <div style={{ marginBottom: 32 }}>
              <OnboardingHeroCard onStart={handleStartOnboarding} />
            </div>
          )}

          {!showHero && !bannerDismissed && (
            <div style={{ marginBottom: 22 }}>
              <OnboardingBanner
                onStart={handleStartOnboarding}
                onDismiss={handleDismissBanner}
              />
            </div>
          )}
        </>
      )}

      {/* ============================================================
         HERO COMMAND PANEL — WITH SPOTLIGHT STEP 1 + STEP 2
      ============================================================ */}
      <div
        className="cockpit-hero cockpit-pulse"
        style={{
          borderRadius: 28,
          padding: 22,
          marginBottom: 20,
          border: "1px solid rgba(148,163,184,0.45)",
          background:
            "radial-gradient(circle at top left,rgba(15,23,42,0.98),rgba(15,23,42,0.92))",
          boxShadow:
            "0 0 55px rgba(0,0,0,0.85),0 0 70px rgba(56,189,248,0.35),inset 0 0 25px rgba(0,0,0,0.7)",
          display: "grid",
          gridTemplateColumns: "minmax(0,1.8fr) minmax(0,1.3fr)",
          gap: 24,
          position: "relative",
        }}
      >
        {/* ============================================================
           LEFT SIDE OF HERO (text + KPIs)
        ============================================================ */}
        <div style={{ paddingTop: 22 }}>
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
            DASHBOARD V5 • GLOBAL COMPLIANCE ENGINE
          </div>

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
            alerts, and rule engines. This is your command center.
          </p>

          {/* ------------------------------------------------------------
             AI SUMMARY + ORG COMPLIANCE + START TOUR BUTTON
          ------------------------------------------------------------ */}
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
              System Health:{" "}
              <strong
                style={{
                  color:
                    dashboardLoading
                      ? GP.textSoft
                      : avgScore >= 80
                      ? GP.neonGreen
                      : avgScore >= 60
                      ? GP.neonGold
                      : GP.neonRed,
                }}
              >
                {dashboardLoading ? "—" : Number(avgScore).toFixed(0)}
              </strong>
              /100 · Vendors:{" "}
              <strong style={{ color: GP.neonBlue }}>
                {dashboardLoading ? "—" : totalVendors}
              </strong>{" "}
              · Alerts:{" "}
              <strong style={{ color: GP.neonRed }}>{alertsCount}</strong>
            </span>
          </div>

          {/* Start Tour Button */}
          <button
            onClick={() => spotlight.start(0)}
            style={{
              marginTop: 12,
              padding: "8px 14px",
              borderRadius: 12,
              border: "1px solid rgba(56,189,248,0.7)",
              background:
                "radial-gradient(circle at top left,#0f172a,#020617)",
              color: GP.neonBlue,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 0 16px rgba(56,189,248,0.3)",
            }}
          >
            ✨ Start Dashboard Tour
          </button>

          {/* ============================================================
             ⭐ STEP 2 — KPI STRIP
          ============================================================ */}
          <div data-spotlight="kpi-strip">
            <div
              style={{
                marginTop: 20,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
                gap: 12,
              }}
            >
              <MiniKpi
                label="Org Health"
                value={Number.isFinite(avgScore) ? avgScore : "—"}
                color={
                  !Number.isFinite(avgScore)
                    ? GP.textSoft
                    : avgScore >= 80
                    ? GP.neonGreen
                    : avgScore >= 60
                    ? GP.neonGold
                    : GP.neonRed
                }
                icon="🏢"
              />
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

      {/* ============================================================
         ⭐ STEP 3 — FULL ALERTS INTELLIGENCE (6 widgets)
         Wrapped in: data-spotlight="alerts-intel"
      ============================================================ */}

      {/* TELEMETRY CHARTS (NOT spotlighted) */}
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
        <ComplianceTrajectoryChart data={dashboard?.complianceTrajectory} />
        <PassFailDonutChart overview={dashboard} />
      </div>

      {/* ⭐ Step 3 Target: The entire Alerts Intelligence pack */}
      <div data-spotlight="alerts-intel">
        {/* ALERT TIMELINE */}
        <AlertTimelineChart orgId={activeOrgId} />

        {/* TOP ALERT TYPES */}
        <TopAlertTypes orgId={activeOrgId} />

        {/* ALERT AGING KPIs */}
        <AlertAgingKpis orgId={activeOrgId} />

        {/* SLA BREACH WIDGET */}
        <SlaBreachWidget orgId={activeOrgId} />

        {/* CRITICAL VENDOR WATCHLIST */}
        <CriticalVendorWatchlist orgId={activeOrgId} />

        {/* ALERT HEAT SIGNATURE */}
        <AlertHeatSignature orgId={activeOrgId} />
      </div>

      {/* ============================================================
         ⭐ STEP 4 — RENEWAL HEATMAP ONLY
         Wrapped in: data-spotlight="renewals-panel"
      ============================================================ */}

      <div data-spotlight="renewals-panel">
        <RenewalHeatmap range={90} />
      </div>

      {/* These items remain OUTSIDE spotlight */}
      <RenewalBacklog />

      <div
        style={{
          marginTop: 24,
          marginBottom: 32,
          display: "grid",
          gridTemplateColumns:
            "minmax(0,1.2fr) minmax(0,1.2fr) minmax(0,1.6fr)",
          gap: 16,
        }}
      >
        <RenewalSlaWidget orgId={activeOrgId} />
        <RenewalCalendar range={60} />
        <RenewalAiSummary orgId={activeOrgId} />
      </div>
      {/* ============================================================
         ⭐ STEP 5 — POLICIES TABLE
         Wrapped in: data-spotlight="policies-panel"
      ============================================================ */}

      <div data-spotlight="policies-panel">
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

        {/* SEARCH BAR */}
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

        {loadingPolicies && (
          <div style={{ fontSize: 13, color: GP.textSoft }}>
            Loading policies…
          </div>
        )}

        {!loadingPolicies && filtered.length === 0 && (
          <div style={{ fontSize: 13, color: GP.textSoft }}>
            No matching policies.
          </div>
        )}

        {!loadingPolicies && filtered.length > 0 && (
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
                    <th style={th}>V5 Engine</th>
                    <th style={th}>Compliance</th>
                    <th style={th}>Elite</th>
                    <th style={th}>Flags</th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.map((p) => {
                    const risk = computeRisk(p);
                    const elite = eliteMap[p.vendor_id];
                    const compliance = complianceMap[p.vendor_id];
                    const ai = computeAiRisk({ risk, elite, compliance });
                    const engine = engineMap[p.vendor_id];
                    const flags = risk.flags || [];

                    const v3Tier =
                      engine && typeof engine.globalScore === "number"
                        ? computeV3Tier(engine.globalScore)
                        : "Unknown";

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

                        {/* STATUS BADGE */}
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

                        {/* RISK TIER */}
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

                        {/* AI RISK */}
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

                        {/* ENGINE SCORE */}
                        <td style={{ ...td, textAlign: "center" }}>
                          {!engine || engine.loading ? (
                            <span style={{ fontSize: 11, color: GP.textMuted }}>
                              Running…
                            </span>
                          ) : engine.error ? (
                            <span style={{ fontSize: 11, color: GP.neonRed }}>
                              Error
                            </span>
                          ) : (
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: 3,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 13,
                                  fontWeight: 600,
                                  color:
                                    engine.globalScore >= 80
                                      ? GP.neonGreen
                                      : engine.globalScore >= 60
                                      ? GP.neonGold
                                      : GP.neonRed,
                                }}
                              >
                                {engine.globalScore}
                              </span>
                              <span
                                style={{
                                  fontSize: 10,
                                  color: GP.textSoft,
                                }}
                              >
                                {v3Tier}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* COMPLIANCE BADGE */}
                        <td style={{ ...td, textAlign: "center" }}>
                          {renderComplianceBadge(p.vendor_id, complianceMap)}
                        </td>

                        {/* ELITE STATUS */}
                        <td style={{ ...td, textAlign: "center" }}>
                          {elite && !elite.loading && !elite.error ? (
                            <EliteStatusPill status={elite.overall} />
                          ) : elite?.loading ? (
                            <span style={{ fontSize: 11, color: GP.textMuted }}>
                              Evaluating…
                            </span>
                          ) : (
                            <span style={{ fontSize: 11, color: GP.textMuted }}>
                              —
                            </span>
                          )}
                        </td>

                        {/* FLAGS */}
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

      {/* ============================================================
         ⭐ SPOTLIGHT OVERLAY HOST 
         (must be at bottom of page)
      ============================================================ */}
      <DashboardSpotlightV3 spotlight={spotlight} />
    </div>
  );
}

/* ============================================================
   MINI COMPONENTS + TABLE STYLES (UNCHANGED)
============================================================ */

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
          color,
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
          color,
        }}
      >
        {count}
      </div>
    </div>
  );
}

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

/* ============================================================
   ⭐ FINAL EXPORT
============================================================ */
export default Dashboard;
