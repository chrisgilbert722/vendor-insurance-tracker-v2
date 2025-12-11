// pages/dashboard.js — Dashboard V5 (Cinematic Intelligence Cockpit)
// Fully upgraded for:
// ✔ Rule Engine V5
// ✔ Alerts V2 Intelligence Engine
// ✔ vendor_compliance_cache (via engine results)
// ✔ Policy + Renewal Intelligence V3
// ✔ Elite Engine Integration
// ✔ Org Compliance Dashboard wiring
// ✔ Cinematic Cockpit UI
// ✔ Spotlight V4 Guided Tour (5 steps)

import { useEffect, useState } from "react";
import VendorDrawer from "../components/VendorDrawer";
import { useRole } from "../lib/useRole";
import { useOrg } from "../context/OrgContext";
import EliteStatusPill from "../components/elite/EliteStatusPill";

// ONBOARDING COCKPIT
import OnboardingHeroCard from "../components/onboarding/OnboardingHeroCard";
import OnboardingBanner from "../components/onboarding/OnboardingBanner";

// ⭐ SPOTLIGHT ENGINE V4 (uses V3 core)
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

// ALERTS V2 INTELLIGENCE COMPONENTS 🔥
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
   EXPIRATION / RISK HELPERS
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
   AI RISK (Risk + Elite + V5 Compliance)
============================================================ */
function computeAiRisk({ risk, elite, compliance }) {
  if (!risk) return { score: 0, tier: "Unknown" };

  let base = typeof risk.score === "number" ? risk.score : 0;

  // Elite engine impact
  let eliteFactor = 1.0;
  if (elite && !elite.loading && !elite.error) {
    if (elite.overall === "fail") eliteFactor = 0.4;
    else if (elite.overall === "warn") eliteFactor = 0.7;
  }

  // V5 compliance engine impact (failing / missing rules)
  let complianceFactor = 1.0;
  if (compliance && compliance.failing?.length > 0) complianceFactor = 0.5;
  else if (compliance && compliance.missing?.length > 0) complianceFactor = 0.7;

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

/* ============================================================
   COMPLIANCE BADGE (VENDOR-LEVEL)
============================================================ */
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

  if (!data || data.loading) {
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
  }

  if (data.error) {
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
  }

  if (data.missing?.length > 0) {
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
  }

  if (data.failing?.length > 0) {
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
  }

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

/* ============================================================
   RULE ENGINE V5 TIER + ENGINE HEALTH
============================================================ */
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

  let totalScore = 0;
  let fails = 0;
  let critical = 0;

  vendors.forEach((v) => {
    totalScore += v.globalScore ?? 0;
    if (v.failedCount > 0) fails++;
    if (v.failingRules?.some((r) => r.severity === "critical")) critical++;
  });

  return {
    avg: Math.round(totalScore / vendors.length),
    fails,
    critical,
    total: vendors.length,
  };
}

/* ============================================================
   MAIN DASHBOARD COMPONENT (NO DEFAULT EXPORT HERE)
============================================================ */
function Dashboard() {
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
  const [eliteSummary, setEliteSummary] = useState({
    pass: 0,
    warn: 0,
    fail: 0,
  });

  const [engineMap, setEngineMap] = useState({});
  const [alertSummary, setAlertSummary] = useState(null);
  const [showAlerts, setShowAlerts] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerVendor, setDrawerVendor] = useState(null);
  const [drawerPolicies, setDrawerPolicies] = useState([]);

  const [systemTimeline, setSystemTimeline] = useState([]);
  const [systemTimelineLoading, setSystemTimelineLoading] = useState(true);

  /* ============================================================
     SPOTLIGHT V4 CONFIG (5 Steps)
       Step 1: [data-spotlight="score-box"]       → Donut
       Step 2: [data-spotlight="kpi-strip"]       → KPI Strip
       Step 3: [data-spotlight="alerts-intel"]    → 6 Alerts Widgets
       Step 4: [data-spotlight="renewals-panel"]  → Renewal Heatmap
       Step 5: [data-spotlight="policies-panel"]  → Policies Table
============================================================ */
  const spotlight = useDashboardSpotlightV3([
    {
      selector: "[data-spotlight='score-box']",
      title: "Global Compliance Score",
      description:
        "This donut shows your live AI-powered compliance score across all vendors and lines of coverage.",
    },
    {
      selector: "[data-spotlight='kpi-strip']",
      title: "Compliance KPIs",
      description:
        "A fast daily snapshot of expired policies, upcoming expirations, warnings, and Elite engine failures.",
    },
    {
      selector: "[data-spotlight='alerts-intel']",
      title: "Alerts Intelligence Center",
      description:
        "Six coordinated panels that reveal alert trends, types, SLA breaches, critical vendors, and risk hotspots.",
    },
    {
      selector: "[data-spotlight='renewals-panel']",
      title: "Renewal Heatmap",
      description:
        "Visual heatmap of policies expiring in the next 90 days so you never miss a COI renewal.",
    },
    {
      selector: "[data-spotlight='policies-panel']",
      title: "Policies Cockpit",
      description:
        "Your full vendor policy cockpit, including AI risk, V5 rule engine results, and compliance flags.",
    },
  ]);

  /* ============================================================
     ONBOARDING STATUS
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

  /* ONBOARDING BANNER DISMISS */
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

  /* AUTO-OPEN CHECKLIST ON IDLE */
  useEffect(() => {
    if (onboardingComplete) return;

    let idleTimer;
    let lastActivity = Date.now();

    const markActivity = () => (lastActivity = Date.now());
    ["click", "keydown", "scroll", "mousemove"].forEach((ev) =>
      window.addEventListener(ev, markActivity)
    );

    idleTimer = setInterval(() => {
      if (Date.now() - lastActivity >= 10000) {
        window.dispatchEvent(
          new CustomEvent("onboarding_chat_forceChecklist")
        );
        clearInterval(idleTimer);
      }
    }, 1000);

    return () => {
      clearInterval(idleTimer);
      ["click", "keydown", "scroll", "mousemove"].forEach((ev) =>
        window.removeEventListener(ev, markActivity)
      );
    };
  }, [onboardingComplete]);

  /* DASHBOARD METRICS */
  useEffect(() => {
    if (!activeOrgId) return;

    (async () => {
      try {
        setDashboardLoading(true);
        const res = await fetch(`/api/dashboard/metrics?orgId=${activeOrgId}`);
        const json = await res.json();
        if (json.ok) setDashboard(json.overview);
      } catch (err) {
        console.error("[dashboard] metrics error:", err);
      } finally {
        setDashboardLoading(false);
      }
    })();
  }, [activeOrgId]);

  /* LOAD POLICIES */
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/get-policies");
        const json = await res.json();
        if (json.ok) setPolicies(json.policies);
      } catch (err) {
        console.error("[dashboard] policies error:", err);
      } finally {
        setLoadingPolicies(false);
      }
    })();
  }, []);

  /* ELITE ENGINE */
  useEffect(() => {
    if (!policies.length) return;

    const vendorIds = [...new Set(policies.map((p) => p.vendor_id))];

    vendorIds.forEach((vendorId) => {
      const existing = eliteMap[vendorId];
      if (existing && !existing.loading) return;

      const primary = policies.find((p) => p.vendor_id === vendorId);
      if (!primary) return;

      const coidata = {
        expirationDate: primary.expiration_date,
        generalLiabilityLimit: primary.limit_each_occurrence,
        autoLimit: primary.auto_limit,
        workCompLimit: primary.work_comp_limit,
        policyType: primary.coverage_type,
      };

      setEliteMap((prev) => ({
        ...prev,
        [vendorId]: { loading: true },
      }));

      fetch("/api/elite/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coidata }),
      })
        .then((res) => res.json())
        .then((json) => {
          setEliteMap((prev) => ({
            ...prev,
            [vendorId]: json.ok
              ? { loading: false, overall: json.overall, rules: json.rules }
              : { loading: false, error: json.error },
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

  /* RULE ENGINE V5 (run-v3 endpoint) */
  useEffect(() => {
    if (!policies.length || !activeOrgId) return;

    const vendorIds = [...new Set(policies.map((p) => p.vendor_id))];

    vendorIds.forEach((vendorId) => {
      const existing = engineMap[vendorId];
      if (existing && existing.loaded && !existing.error) return;

      setEngineMap((prev) => ({
        ...prev,
        [vendorId]: {
          loading: true,
          loaded: false,
          globalScore: null,
          failedCount: 0,
          totalRules: 0,
          failingRules: [],
          passingRules: [],
        },
      }));

      fetch("/api/engine/run-v3", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId,
          orgId: activeOrgId,
          dryRun: false,
        }),
      })
        .then((res) => res.json())
        .then((json) => {
          if (!json.ok) {
            setEngineMap((prev) => ({
              ...prev,
              [vendorId]: {
                loading: false,
                loaded: true,
                error: json.error || "Rule Engine V5 error",
              },
            }));
            return;
          }

          setComplianceMap((prev) => ({
            ...prev,
            [vendorId]: {
              loading: false,
              missing: [],
              failing: json.failingRules || [],
              passing: json.passingRules || [],
            },
          }));

          setEngineMap((prev) => ({
            ...prev,
            [vendorId]: {
              loading: false,
              loaded: true,
              globalScore: json.globalScore,
              failedCount: json.failedCount,
              totalRules: json.totalRules,
              failingRules: json.failingRules,
              passingRules: json.passingRules,
            },
          }));
        })
        .catch((err) => {
          console.error("[engineV5] fail:",	err);
          setEngineMap((prev) => ({
            ...prev,
            [vendorId]: {
              loading: false,
              loaded: true,
              error: "Failed to evaluate vendor",
            },
          }));
        });
    });
  }, [policies, activeOrgId, engineMap]);

  /* ELITE SUMMARY */
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

  /* ALERTS V2 SUMMARY */
  useEffect(() => {
    if (!activeOrgId) return;

    const loadAlerts = async () => {
      try {
        const res = await fetch(`/api/alerts-v2/stats?orgId=${activeOrgId}`);
        const json = await res.json();
        if (json.ok) setAlertSummary(json);
      } catch (err) {
        console.error("[alerts v2 summary] fail:", err);
      }
    };

    loadAlerts();
    const interval = setInterval(loadAlerts, 15000);
    return () => clearInterval(interval);
  }, [activeOrgId]);

  /* SYSTEM TIMELINE */
  useEffect(() => {
    const loadTimeline = async () => {
      try {
        setSystemTimelineLoading(true);
        const res = await fetch("/api/admin/timeline");
        const json = await res.json();
        if (json.ok) setSystemTimeline(json.timeline);
      } catch (err) {
        console.error("[system timeline] fail:", err);
      } finally {
        setSystemTimelineLoading(false);
      }
    };

    loadTimeline();
    const int = setInterval(loadTimeline, 10000);
    return () => clearInterval(int);
  }, []);

  /* DRAWER HANDLERS */
  const openDrawer = (vendorId) => {
    const vendorPolicies = policies.filter((p) => p.vendor_id === vendorId);
    setDrawerVendor({
      id: vendorId,
      name: vendorPolicies[0]?.vendor_name || "Vendor",
      engine: engineMap[vendorId],
    });
    setDrawerPolicies(vendorPolicies);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setDrawerVendor(null);
    setDrawerPolicies([]);
  };

  /* FILTERED POLICIES */
  const filtered = policies.filter((p) => {
    const t = filterText.toLowerCase();
    return (
      !t ||
      p.vendor_name?.toLowerCase().includes(t) ||
      p.coverage_type?.toLowerCase().includes(t) ||
      p.policy_number?.toLowerCase().includes(t) ||
      p.carrier?.toLowerCase().includes(t)
    );
  });

  /* DERIVED METRICS (V5) */
  const engineHealth = summarizeEngineHealth(engineMap);
  const avgScore = engineHealth.avg;
  const totalVendors = engineHealth.total;
  const alertsCount = alertSummary?.total || 0;

  const alertVendorsList = alertSummary
    ? Object.values(alertSummary.vendors || {}).sort((a, b) => {
        if (b.critical !== a.critical) return b.critical - a.critical;
        if (b.high !== a.high) return b.high - a.high;
        return b.total - a.total;
      })
    : [];

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

      {/* HERO COMMAND PANEL (CINEMATIC COCKPIT) */}
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

          {/* AI Summary Pill */}
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
                href="/admin/org-compliance"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "8px 14px",
                  borderRadius: 12,
                  background:
                    "radial-gradient(circle at top left,#16a34a,#22c55e,#020617)",
                  border: "1px solid rgba(34,197,94,0.6)",
                  color: "#bbf7d0",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  textDecoration: "none",
                }}
              >
                🏢 View Org Compliance Dashboard
              </a>
            )}

            <button
              type="button"
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
                boxShadow: "0 0 16px rgba(56,189,248,0.3)",
              }}
            >
              ✨ Start Dashboard Tour
            </button>
          </div>

          {/* STEP 2 — KPI STRIP */}
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
            </div>
          </div>
        </div>

        {/* RIGHT SIDE — Donut + Elite Snapshot */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 16,
            paddingTop: 28,
          }}
        >
          {/* STEP 1 — Donut only */}
          <div data-spotlight="score-box">
            <div
              style={{
                position: "relative",
                width: 160,
                height: 160,
                borderRadius: "50%",
                background:
                  "conic-gradient(from 220deg,#22c55e,#a3e635,#facc15,#fb7185,#0f172a)",
                padding: 5,
                boxShadow:
                  "0 0 50px rgba(34,197,94,0.45),0 0 80px rgba(148,163,184,0.3)",
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
          </div>

          {/* Elite Snapshot (not spotlight target) */}
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

      {/* RULE ENGINE V5 HEALTH WIDGET — UNCHANGED */}
      <div
        style={{
          marginBottom: 24,
          borderRadius: 20,
          padding: 14,
          border: "1px solid rgba(55,65,81,0.9)",
          background:
            "linear-gradient(135deg,rgba(15,23,42,0.98),rgba(15,23,42,0.96))",
          boxShadow: "0 10px 30px rgba(15,23,42,0.85)",
          display: "flex",
          alignItems: "center",
          gap: 18,
          justifyContent: "space-between",
        }}
      >
        {/* ... keep your existing Rule Engine V5 widget content here ... */}
      </div>

      {/* ALERTS V2 TOGGLE PANEL (unchanged, NOT spotlighted) */}
      {showAlerts && (
        <div
          style={{
            marginBottom: 26,
            borderRadius: 20,
            padding: 16,
            border: "1px solid rgba(148,163,184,0.5)",
            background: "rgba(15,23,42,0.97)",
            boxShadow: "0 16px 40px rgba(15,23,42,0.9)",
          }}
        >
          {/* keep your existing "Alerts V2 Overview" block here unchanged */}
        </div>
      )}

      {/* TELEMETRY (NO spotlight) */}
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

      {/* EXPIRING CERTIFICATES + SEVERITY INTELLIGENCE */}
      <ExpiringCertsHeatmap policies={policies} />
      <SeverityDistributionChart overview={dashboard} />
      <RiskTimelineChart policies={policies} />
      {/* ============================================================
         ⭐ STEP 3 — ALERTS INTELLIGENCE (FULL 6-WIDGET PACK)
      ============================================================ */}

      {/* TELEMETRY CHARTS */}
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

      {/* ALERTS INTELLIGENCE — SPOTLIGHT STEP 3 */}
      <div data-spotlight="alerts-intel">
        <AlertTimelineChart orgId={activeOrgId} />
        <TopAlertTypes orgId={activeOrgId} />
        <AlertAgingKpis orgId={activeOrgId} />
        <SlaBreachWidget orgId={activeOrgId} />
        <CriticalVendorWatchlist orgId={activeOrgId} />
        <AlertHeatSignature orgId={activeOrgId} />
      </div>

      {/* ============================================================
         ⭐ STEP 4 — RENEWALS (HEATMAP ONLY)
      ============================================================ */}
      <div data-spotlight="renewals-panel">
        <RenewalHeatmap range={90} />
      </div>

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

        {!loadingPolicies && filtered.length > 0 && (
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
            <table style={{ width: "100%", fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={th}>Vendor</th>
                  <th style={th}>Policy #</th>
                  <th style={th}>Carrier</th>
                  <th style={th}>Coverage</th>
                  <th style={th}>Expires</th>
                  <th style={th}>Status</th>
                  <th style={th}>AI Risk</th>
                  <th style={th}>Engine</th>
                  <th style={th}>Elite</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const risk = computeRisk(p);
                  const elite = eliteMap[p.vendor_id];
                  const compliance = complianceMap[p.vendor_id];
                  const ai = computeAiRisk({ risk, elite, compliance });
                  const engine = engineMap[p.vendor_id];

                  return (
                    <tr
                      key={p.id}
                      onClick={() => openDrawer(p.vendor_id)}
                      style={{ cursor: "pointer" }}
                    >
                      <td style={td}>{p.vendor_name}</td>
                      <td style={td}>{p.policy_number}</td>
                      <td style={td}>{p.carrier}</td>
                      <td style={td}>{p.coverage_type}</td>
                      <td style={td}>{p.expiration_date}</td>
                      <td style={{ ...td, ...badgeStyle(risk.severity) }}>
                        {risk.severity}
                      </td>
                      <td style={td}>{ai.score}</td>
                      <td style={td}>
                        {engine?.globalScore ?? "—"}
                      </td>
                      <td style={td}>
                        {elite?.overall ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============================================================
         ⭐ SPOTLIGHT OVERLAY HOST (REQUIRED)
      ============================================================ */}
      <DashboardSpotlightV3 spotlight={spotlight} />
    </div>
  );
