// pages/dashboard.js — Dashboard V5 (Cinematic Intelligence Cockpit)

import { useEffect, useState, useRef } from "react";
import VendorDrawer from "../components/VendorDrawer";
import { useRole } from "../lib/useRole";
import { useOrg } from "../context/OrgContext";
import EliteStatusPill from "../components/elite/EliteStatusPill";

// ONBOARDING
import OnboardingHeroCard from "../components/onboarding/OnboardingHeroCard";
import OnboardingBanner from "../components/onboarding/OnboardingBanner";

// DASHBOARD TUTORIAL
import DashboardTutorial from "../components/tutorial/DashboardTutorial";

// CHARTS
import ComplianceTrajectoryChart from "../components/charts/ComplianceTrajectoryChart";
import PassFailDonutChart from "../components/charts/PassFailDonutChart";
import ExpiringCertsHeatmap from "../components/charts/ExpiringCertsHeatmap";
import SeverityDistributionChart from "../components/charts/SeverityDistributionChart";
import RiskTimelineChart from "../components/charts/RiskTimelineChart";

// ALERTS
import AlertTimelineChart from "../components/charts/AlertTimelineChart";
import TopAlertTypes from "../components/charts/TopAlertTypes";
import AlertAgingKpis from "../components/kpis/AlertAgingKpis";
import SlaBreachWidget from "../components/kpis/SlaBreachWidget";
import CriticalVendorWatchlist from "../components/panels/CriticalVendorWatchlist";
import AlertHeatSignature from "../components/charts/AlertHeatSignature";

// RENEWALS
import RenewalHeatmap from "../components/renewals/RenewalHeatmap";
import RenewalBacklog from "../components/renewals/RenewalBacklog";
import RenewalSlaWidget from "../components/renewals/RenewalSlaWidget";
import RenewalCalendar from "../components/renewals/RenewalCalendar";
import RenewalAiSummary from "../components/renewals/RenewalAiSummary";
const GP = {
  bg: "#020617",
  panel: "rgba(15,23,42,0.98)",
  neonBlue: "#38bdf8",
  neonGreen: "#22c55e",
  neonGold: "#facc15",
  neonRed: "#fb7185",
  text: "#e5e7eb",
  textSoft: "#9ca3af",
  textMuted: "#6b7280",
};

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
    return { daysLeft: null, severity: "unknown", score: 0, flags, tier: "Unknown" };
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

  return {
    daysLeft,
    severity,
    score,
    flags,
    tier:
      severity === "expired"
        ? "Severe Risk"
        : severity === "critical"
        ? "High Risk"
        : severity === "warning"
        ? "Moderate Risk"
        : "Healthy",
  };
}

function computeAiRisk({ risk, elite, compliance }) {
  if (!risk) return { score: 0, tier: "Unknown" };

  let score = risk.score;

  if (elite?.overall === "fail") score *= 0.4;
  else if (elite?.overall === "warn") score *= 0.7;

  if (compliance?.failing?.length) score *= 0.5;
  else if (compliance?.missing?.length) score *= 0.7;

  score = Math.round(Math.max(0, Math.min(score, 100)));

  return {
    score,
    tier:
      score >= 85 ? "Elite Safe" :
      score >= 70 ? "Preferred" :
      score >= 55 ? "Watch" :
      score >= 35 ? "High Risk" : "Severe",
  };
}
function summarizeEngineHealth(engineMap) {
  const vendors = Object.values(engineMap).filter(
    v => v.loaded && !v.error && typeof v.globalScore === "number"
  );

  if (!vendors.length) return { avg: 0, fails: 0, critical: 0, total: 0 };

  let total = 0, fails = 0, critical = 0;
  vendors.forEach(v => {
    total += v.globalScore;
    if (v.failedCount) fails++;
    if (v.failingRules?.some(r => r.severity === "critical")) critical++;
  });

  return {
    avg: Math.round(total / vendors.length),
    fails,
    critical,
    total: vendors.length,
  };
}
function Dashboard() {
  const { isAdmin, isManager } = useRole();
  const { activeOrgId } = useOrg();

  // 🔑 STABLE TUTORIAL ANCHORS
  const riskRef = useRef(null);
  const kpiRef = useRef(null);
  const alertsRef = useRef(null);      // ALWAYS MOUNTED
  const renewalsRef = useRef(null);
  const policiesRef = useRef(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [policies, setPolicies] = useState([]);
  const [engineMap, setEngineMap] = useState({});
  const [eliteMap, setEliteMap] = useState({});
  const [complianceMap, setComplianceMap] = useState({});
  const [alertSummary, setAlertSummary] = useState(null);
  const [filterText, setFilterText] = useState("");
  const handleFinishTutorial = () => {
    setShowTutorial(false);
    localStorage.setItem("dashboard_tutorial_seen", "true");
  };

  useEffect(() => {
    if (!activeOrgId) return;
    fetch(`/api/onboarding/status?orgId=${activeOrgId}`)
      .then(r => r.json())
      .then(j => {
        if (j.dashboardTutorialEnabled && localStorage.getItem("dashboard_tutorial_seen") !== "true") {
          setShowTutorial(true);
        }
      });
  }, [activeOrgId]);
  return (
    <div style={{ minHeight: "100vh", background: GP.bg, padding: 32, color: GP.text }}>
      <div className="cockpit-hero" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
        <div>
          <h1>Vendor Insurance Intelligence</h1>
          <div ref={kpiRef}>
            {/* KPI STRIP */}
          </div>
        </div>

        <div ref={riskRef}>
          {/* GLOBAL SCORE DONUT */}
        </div>
      </div>
      {/* ALERTS — ANCHOR ALWAYS PRESENT */}
      <div ref={alertsRef}>
        {showAlerts && (
          <>
            <AlertTimelineChart orgId={activeOrgId} />
            <TopAlertTypes orgId={activeOrgId} />
            <AlertAgingKpis orgId={activeOrgId} />
            <SlaBreachWidget orgId={activeOrgId} />
            <CriticalVendorWatchlist orgId={activeOrgId} />
            <AlertHeatSignature orgId={activeOrgId} />
          </>
        )}
      </div>
      <div>
        <ComplianceTrajectoryChart />
        <PassFailDonutChart />
      </div>

      <div ref={renewalsRef}>
        <RenewalHeatmap range={90} />
        <RenewalBacklog />
      </div>
      <div ref={policiesRef}>
        {/* POLICIES TABLE */}
      </div>
      {showTutorial && (
        <DashboardTutorial
          onFinish={handleFinishTutorial}
          anchors={{
            risk: riskRef,
            fixPlans: kpiRef,
            alerts: alertsRef,
            renewals: renewalsRef,
            vendors: policiesRef,
          }}
        />
      )}
    </div>
  );
}

export default Dashboard;
