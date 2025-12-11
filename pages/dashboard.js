// pages/dashboard.js — Dashboard V5 (Cinematic Intelligence Cockpit)
// Version A (clean base) upgraded with Spotlight V4

import { useEffect, useState } from "react";
import VendorDrawer from "../components/VendorDrawer";
import { useRole } from "../lib/useRole";
import { useOrg } from "../context/OrgContext";
import EliteStatusPill from "../components/elite/EliteStatusPill";

// ONBOARDING COCKPIT
import OnboardingHeroCard from "../components/onboarding/OnboardingHeroCard";
import OnboardingBanner from "../components/onboarding/OnboardingBanner";

// SPOTLIGHT ENGINE (V4 uses V3 core)
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

// ALERTS V2 INTELLIGENCE (ALWAYS VISIBLE STACK)
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
   DATE + RISK HELPERS (unchanged)
============================================================ */
// (all your helpers stay exactly the same)
function parseExpiration(dateStr) { /* unchanged */ }
function computeDaysLeft(dateStr) { /* unchanged */ }
function computeRisk(policy) { /* unchanged */ }
function badgeStyle(level) { /* unchanged */ }
function computeAiRisk({ risk, elite, compliance }) { /* unchanged */ }
function renderComplianceBadge(vendorId, complianceMap) { /* unchanged */ }
function computeV3Tier(score) { /* unchanged */ }
function summarizeEngineHealth(engineMap) { /* unchanged */ }

/* ============================================================
   MAIN DASHBOARD COMPONENT
============================================================ */
export default function Dashboard() {
  const { isAdmin, isManager } = useRole();
  const { activeOrgId } = useOrg();

  // ALL YOUR STATE REMAINS EXACTLY THE SAME
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
     SPOTLIGHT V4 CONFIG — FINAL 5 STEPS
============================================================ */
  const spotlight = useDashboardSpotlightV3([
    {
      selector: "[data-spotlight='step1-donut']",
      title: "Global Compliance Score",
      description:
        "This donut shows your live AI-driven compliance score across all vendors.",
    },
    {
      selector: "[data-spotlight='step2-kpis']",
      title: "Compliance KPIs",
      description:
        "A snapshot of expired policies, upcoming expirations, warnings, and elite engine failures.",
    },
    {
      selector: "[data-spotlight='step3-alerts']",
      title: "Alerts Intelligence",
      description:
        "A unified intelligence view showing your alert trends, severity breakdowns, SLA breaches, and critical vendors.",
    },
    {
      selector: "[data-spotlight='step4-renewals']",
      title: "Renewal Heatmap",
      description:
        "This heatmap highlights upcoming COI expirations over the next 90 days to prevent lapses.",
    },
    {
      selector: "[data-spotlight='step5-policies']",
      title: "Policies Cockpit",
      description:
        "Search, filter, and review every vendor policy with AI risk scoring and rule engine evaluation.",
    },
  ]);
  /* ============================================================
     MAIN RENDER
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
      {/* ONBOARDING COCKPIT LAYER */}
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
         HERO COMMAND PANEL (CINEMATIC COCKPIT)
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
        {/* LEFT SIDE */}
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

          {/* AI SYSTEM HEALTH PILL */}
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

          {/* BUTTON ROW (Start Tour + Compliance Panel) */}
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
                href="/admin/org-compliance"
                style={{
                  padding: "8px 14px",
                  borderRadius: 12,
                  background:
                    "radial-gradient(circle at top left,#16a34a,#22c55e,#020617)",
                  border: "1px solid rgba(34,197,94,0.6)",
                  color: "#bbf7d0",
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                🏢 Org Compliance Dashboard
              </a>
            )}

            <button
              onClick={() => spotlight.start(0)}
              style={{
                padding: "8px 14px",
                borderRadius: 12,
                border: "1px solid rgba(56,189,248,0.7)",
                background:
                  "radial-gradient(circle at top left,#0f172a,#020617)",
                color: GP.neonBlue,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              ✨ Start Dashboard Tour
            </button>
          </div>

          {/* ============================================================
             STEP 2 — KPI STRIP (FULL PANEL HIGHLIGHTED)
          ============================================================ */}
          <section data-spotlight="step2-kpis">
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
            </div>
          </section>
        </div>

        {/* ============================================================
           RIGHT SIDE — STEP 1 (DONUT ONLY)
        ============================================================ */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 20,
            paddingTop: 28,
          }}
        >
          <section data-spotlight="step1-donut">
            <div
              style={{
                position: "relative",
                width: 180,
                height: 180,
                borderRadius: "50%",
                background:
                  "conic-gradient(from 220deg,#22c55e,#a3e635,#facc15,#fb7185,#0f172a)",
                padding: 8,
                boxShadow:
                  "0 0 60px rgba(34,197,94,0.5),0 0 90px rgba(148,163,184,0.35)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 16,
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
                  gap: 4,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: GP.textSoft,
                  }}
                >
                  Global Score
                </div>

                <div
                  style={{
                    fontSize: 36,
                    fontWeight: 700,
                    background:
                      "linear-gradient(120deg,#22c55e,#bef264,#facc15)",
                    WebkitBackgroundClip: "text",
                    color: "transparent",
                    lineHeight: 1,
                  }}
                >
                  {dashboardLoading ? "—" : Number(avgScore).toFixed(0)}
                </div>

                <div
                  style={{
                    fontSize: 11,
                    color: GP.textMuted,
                  }}
                >
                  /100
                </div>
              </div>
            </div>
          </section>

          {/* ELITE SNAPSHOT — NOT spotlighted */}
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
      {/* TELEMETRY CHARTS (unchanged) */}
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

      {/* EXPIRING CERTIFICATES + SEVERITY INTELLIGENCE (unchanged) */}
      <ExpiringCertsHeatmap policies={policies} />
      <SeverityDistributionChart overview={dashboard} />
      <RiskTimelineChart policies={policies} />

      {/* ============================================================
         STEP 3 — ALERTS INTELLIGENCE (6-widget block)
         Spotlight V4 wraps ONLY this stack
      ============================================================ */}
      <section data-spotlight="step3-alerts">
        <AlertTimelineChart orgId={activeOrgId} />
        <TopAlertTypes orgId={activeOrgId} />
        <AlertAgingKpis orgId={activeOrgId} />
        <SlaBreachWidget orgId={activeOrgId} />
        <CriticalVendorWatchlist orgId={activeOrgId} />
        <AlertHeatSignature orgId={activeOrgId} />
      </section>

      {/* ============================================================
         STEP 4 — RENEWAL HEATMAP ONLY
         (Backlog + other widgets remain OUTSIDE spotlight)
      ============================================================ */}
      <section data-spotlight="step4-renewals">
        <RenewalHeatmap range={90} />
      </section>

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
         SYSTEM TIMELINE — UNCHANGED
      ============================================================ */}
      <div
        style={{
          marginTop: 16,
          marginBottom: 32,
          borderRadius: 20,
          padding: 18,
          border: "1px solid rgba(148,163,184,0.4)",
          background: "rgba(15,23,42,0.96)",
          boxShadow: "0 10px 35px rgba(0,0,0,0.45)",
        }}
      >
        <h2
          style={{
            marginTop: 0,
            marginBottom: 14,
            fontSize: 18,
            fontWeight: 600,
            background: "linear-gradient(90deg,#38bdf8,#a855f7)",
            WebkitBackgroundClip: "text",
            color: "transparent",
          }}
        >
          System Timeline (Automated Compliance Events)
        </h2>

        {systemTimelineLoading ? (
          <div style={{ fontSize: 13, color: GP.textSoft }}>
            Loading system events…
          </div>
        ) : systemTimeline.length === 0 ? (
          <div style={{ fontSize: 13, color: GP.textSoft }}>
            No system events recorded yet.
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              maxHeight: 340,
              overflowY: "auto",
              paddingRight: 6,
            }}
          >
            {systemTimeline.map((item, idx) => (
              <div
                key={idx}
                style={{
                  padding: "10px 12px",
                  borderRadius: 14,
                  background: "rgba(2,6,23,0.65)",
                  border: "1px solid rgba(148,163,184,0.28)",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    color:
                      item.severity === "critical"
                        ? GP.neonRed
                        : item.severity === "high"
                        ? GP.neonGold
                        : GP.neonBlue,
                    marginBottom: 4,
                  }}
                >
                  {item.action.replace(/_/g, " ")}
                </div>

                <div style={{ fontSize: 13, color: GP.text }}>
                  {item.message}
                </div>

                <div
                  style={{
                    fontSize: 11,
                    color: GP.textSoft,
                    marginTop: 4,
                  }}
                >
                  Vendor:{" "}
                  <span style={{ color: GP.neonBlue }}>
                    {item.vendor_name || "Unknown"}
                  </span>
                </div>

                <div
                  style={{
                    fontSize: 11,
                    color: GP.textMuted,
                    marginTop: 2,
                  }}
                >
                  {new Date(item.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* ============================================================
         STEP 5 — POLICIES TABLE (FULL BLOCK)
      ============================================================ */}
      <section data-spotlight="step5-policies">
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
                    const flags = risk.flags || [];
                    const elite = eliteMap[p.vendor_id];
                    const compliance = complianceMap[p.vendor_id];
                    const ai = computeAiRisk({ risk, elite, compliance });
                    const engine = engineMap[p.vendor_id];

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
      </section>

      {/* ============================================================
         SPOTLIGHT OVERLAY HOST (must be last)
      ============================================================ */}
      <DashboardSpotlightV3 spotlight={spotlight} />
    </div>
  );
}

/* ============================================================
   SUPPORTING COMPONENTS (unchanged)
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
        <div
          style={{
            fontSize: 16,
            fontWeight: 600,
            color,
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

/* =======================================
   TABLE HEAD + CELL STYLES (unchanged)
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

// =======================================
// END OF DASHBOARD V5 (Spotlight V4 Integrated)
// =======================================

export default Dashboard;
