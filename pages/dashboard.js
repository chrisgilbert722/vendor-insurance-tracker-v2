// pages/dashboard.js — Dashboard V4 (Fully Live Data)
import { useEffect, useState } from "react";
import VendorDrawer from "../components/VendorDrawer";
import { useRole } from "../lib/useRole";
import { useOrg } from "../context/OrgContext";
import EliteStatusPill from "../components/elite/EliteStatusPill";

// ONBOARDING COCKPIT COMPONENTS
import OnboardingHeroCard from "../components/onboarding/OnboardingHeroCard";
import OnboardingBanner from "../components/onboarding/OnboardingBanner";

// LIVE CHARTS
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

// 🔥 RENEWAL INTELLIGENCE V3 (Drop 2)
import RenewalHeatmap from "../components/renewals/RenewalHeatmap";
import RenewalBacklog from "../components/renewals/RenewalBacklog";

// 🔥 RENEWAL INTELLIGENCE V3 (Drop 3)
import RenewalSlaWidget from "../components/renewals/RenewalSlaWidget";
import RenewalCalendar from "../components/renewals/RenewalCalendar";
import RenewalAiSummary from "../components/renewals/RenewalAiSummary";

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

function parseExpiration(dateStr) {
  if (!dateStr) return null;
  const [mm, dd, yyyy] = dateStr.split("/");
  const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}
function computeDaysLeft(dateStr) {
  const d = parseExpiration(dateStr);
  return d ? Math.floor((d - new Date()) / 86400000) : null;
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
   MAIN DASHBOARD
=========================== */
export default function Dashboard() {
  const { isAdmin, isManager } = useRole();
  const { activeOrgId } = useOrg();

  // 🔥 NEW — Onboarding state
  const [onboardingComplete, setOnboardingComplete] = useState(true);
  const [showHero, setShowHero] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // 🔥 NEW — Fetch onboarding status from backend
  useEffect(() => {
    async function fetchStatus() {
      if (!activeOrgId) return;
      try {
        const res = await fetch(
          `/api/onboarding/status?orgId=${encodeURIComponent(activeOrgId)}`
        );
        const json = await res.json();
        if (json.ok) {
          const done = !!json.onboardingComplete;
          setOnboardingComplete(done);
          setShowHero(!done); // show hero while not complete
        }
      } catch (err) {
        console.error("[dashboard] onboarding status error:", err);
      }
    }
    fetchStatus();
  }, [activeOrgId]);

  // 🔥 NEW — Banner dismiss state (localStorage)
  useEffect(() => {
    try {
      const stored = localStorage.getItem("onboardingBannerDismissed");
      if (stored === "true") {
        setBannerDismissed(true);
      }
    } catch (err) {
      console.error("[dashboard] localStorage error:", err);
    }
  }, []);

  const handleDismissBanner = () => {
    setBannerDismissed(true);
    try {
      localStorage.setItem("onboardingBannerDismissed", "true");
    } catch (err) {
      console.error("[dashboard] localStorage set error:", err);
    }
    // Optional: trigger chatbot checklist here if you want
    // window.dispatchEvent(new CustomEvent("onboarding_chat_forceChecklist"));
  };

  const handleStartOnboarding = () => {
    window.location.href = "/onboarding/start";
  };

  // 🔥 NEW — Auto-open chatbot checklist after 10s idle if onboarding incomplete
  useEffect(() => {
    if (onboardingComplete) return;

    let idleTimer;
    let lastActivity = Date.now();

    const markActivity = () => {
      lastActivity = Date.now();
    };

    window.addEventListener("click", markActivity);
    window.addEventListener("keydown", markActivity);
    window.addEventListener("scroll", markActivity);
    window.addEventListener("mousemove", markActivity);

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
      window.removeEventListener("click", markActivity);
      window.removeEventListener("keydown", markActivity);
      window.removeEventListener("scroll", markActivity);
      window.removeEventListener("mousemove", markActivity);
    };
  }, [onboardingComplete]);

  // ===== EXISTING STATE =====
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

  const [showAlerts, setShowAlerts] = useState(false);
  const [alertSummary, setAlertSummary] = useState(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerVendor, setDrawerVendor] = useState(null);
  const [drawerPolicies, setDrawerPolicies] = useState([]);

  // System Timeline
  const [systemTimeline, setSystemTimeline] = useState([]);
  const [systemTimelineLoading, setSystemTimelineLoading] = useState(true);

  // Rule Engine V3 map (per vendor)
  const [engineMap, setEngineMap] = useState({});

  // Derived metrics
  const avgScore = dashboard?.globalScore ?? 0;
  const totalVendors = dashboard?.vendorCount ?? 0;
  const alertsCount = alertSummary?.total ?? 0;
  /* LOAD DASHBOARD METRICS */
  useEffect(() => {
    if (!activeOrgId) return;
    async function loadDashboard() {
      try {
        setDashboardLoading(true);
        const res = await fetch(`/api/dashboard/metrics?orgId=${activeOrgId}`);
        const data = await res.json();
        if (data.ok) setDashboard(data.overview);
      } catch (err) {
        console.error("[dashboard] metrics error:", err);
      } finally {
        setDashboardLoading(false);
      }
    }
    loadDashboard();
  }, [activeOrgId]);

  /* LOAD POLICIES */
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/get-policies");
        const data = await res.json();
        if (data.ok) setPolicies(data.policies);
      } catch (err) {
        console.error("[dashboard] policies error:", err);
      } finally {
        setLoadingPolicies(false);
      }
    }
    load();
  }, []);

  /* LOAD COMPLIANCE */
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

  /* LOAD ELITE ENGINE */
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

  /* LOAD RULE ENGINE V3 PER VENDOR */
  useEffect(() => {
    if (!policies.length || !activeOrgId) return;
    const vendorIds = [...new Set(policies.map((p) => p.vendor_id))];

    vendorIds.forEach((vendorId) => {
      const existing = engineMap[vendorId];
      if (existing && existing.loaded && existing.loading === false) return;

      setEngineMap((prev) => ({
        ...prev,
        [vendorId]: { ...(prev[vendorId] || {}), loading: true },
      }));

      fetch("/api/engine/run-v3", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorId, orgId: activeOrgId }),
      })
        .then((res) => res.json())
        .then((json) => {
          setEngineMap((prev) => ({
            ...prev,
            [vendorId]: json.ok
              ? {
                  loading: false,
                  loaded: true,
                  globalScore: json.globalScore,
                  failedCount: json.failedCount,
                }
              : {
                  loading: false,
                  loaded: true,
                  error: json.error || "Rule Engine V3 error",
                },
          }));
        })
        .catch(() => {
          setEngineMap((prev) => ({
            ...prev,
            [vendorId]: {
              loading: false,
              loaded: true,
              error: "Failed to run Rule Engine V3",
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

  /* LOAD ALERT SUMMARY V3 */
  useEffect(() => {
    if (!activeOrgId) return;

    async function loadAlertSummary() {
      try {
        const res = await fetch(
          `/api/alerts/summary-v3?orgId=${encodeURIComponent(activeOrgId)}`
        );
        const json = await res.json();
        if (json.ok) {
          setAlertSummary(json);
        } else {
          console.error("[dashboard] alert summary error:", json.error);
        }
      } catch (err) {
        console.error("[dashboard] alert summary error:", err);
      }
    }

    loadAlertSummary();
    const interval = setInterval(loadAlertSummary, 15000);
    return () => clearInterval(interval);
  }, [activeOrgId]);

  /* LOAD SYSTEM TIMELINE */
  useEffect(() => {
    async function loadTimeline() {
      try {
        setSystemTimelineLoading(true);
        const res = await fetch("/api/admin/timeline");
        const data = await res.json();
        if (data.ok) setSystemTimeline(data.timeline);
      } catch (err) {
        console.error("[dashboard] system timeline load error:", err);
      } finally {
        setSystemTimelineLoading(false);
      }
    }
    loadTimeline();
    const interval = setInterval(loadTimeline, 10000);
    return () => clearInterval(interval);
  }, []);

  /* DRAWER HANDLERS */
  const openDrawer = (vendorId) => {
    const vp = policies.filter((p) => p.vendor_id === vendorId);
    setDrawerVendor({
      id: vendorId,
      name: vp[0]?.vendor_name || "Vendor",
    });
    setDrawerPolicies(vp);
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
      p.policy_number?.toLowerCase().includes(t) ||
      p.carrier?.toLowerCase().includes(t) ||
      p.coverage_type?.toLowerCase().includes(t)
    );
  });

  // Derive a compact list of top vendors by alert severity/total for the panel
  const alertVendorsList = alertSummary
    ? Object.values(alertSummary.vendors || {}).sort((a, b) => {
        if (b.critical !== a.critical) return b.critical - a.critical;
        if (b.high !== a.high) return b.high - a.high;
        return b.total - a.total;
      })
    : [];
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
      {/* ================================
          🔥 ONBOARDING COCKPIT LAYER
          (only shows if onboarding incomplete)
      ================================= */}
      {!onboardingComplete && (
        <>
          {/* FULL CINEMATIC HERO — shown while showHero is true */}
          {showHero && (
            <div style={{ marginBottom: 32 }}>
              <OnboardingHeroCard onStart={handleStartOnboarding} />
            </div>
          )}

          {/* SMALL BANNER — appears if hero hidden OR after refresh */}
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

      {/* ======= EXISTING COCKPIT HERO BELOW THIS POINT ======= */}
      {/* HERO COMMAND PANEL */}
      <div
        className="cockpit-hero cockpit-pulse"
        style={{
          borderRadius: 28,
          padding: 22,
          marginBottom: 30,
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
            DASHBOARD V4 • GLOBAL COMPLIANCE ENGINE
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
            and risk engines. This is your command center.
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
              🔔 Alerts ({alertsCount})
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
      {/* ALERTS V3 PANEL (TOGGLE) */}
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
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
              marginBottom: 10,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: "0.16em",
                  color: GP.textSoft,
                  marginBottom: 4,
                }}
              >
                Alerts V3 Overview
              </div>
              <div style={{ fontSize: 14, color: GP.text }}>
                {alertSummary
                  ? `${alertSummary.total} open alerts across ${
                      Object.keys(alertSummary.vendors || {}).length
                    } vendors.`
                  : "Loading alert summary…"}
              </div>
            </div>
          </div>

          {alertSummary && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(140px,1fr))",
                gap: 10,
                marginBottom: 12,
              }}
            >
              <SeverityBox
                label="Critical"
                count={alertSummary.countsBySeverity?.critical ?? 0}
                color={GP.neonRed}
              />
              <SeverityBox
                label="High"
                count={alertSummary.countsBySeverity?.high ?? 0}
                color={GP.neonGold}
              />
              <SeverityBox
                label="Medium"
                count={alertSummary.countsBySeverity?.medium ?? 0}
                color={GP.neonBlue}
              />
              <SeverityBox
                label="Low"
                count={alertSummary.countsBySeverity?.low ?? 0}
                color={GP.neonGreen}
              />
            </div>
          )}

          {alertSummary && alertVendorsList.length > 0 && (
            <div
              style={{
                marginTop: 8,
                maxHeight: 220,
                overflowY: "auto",
                paddingRight: 4,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.14em",
                  color: GP.textSoft,
                  marginBottom: 6,
                }}
              >
                Vendors with Active Alerts
              </div>

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
                    <th style={{ ...th, fontSize: 11 }}>Vendor ID</th>
                    <th style={{ ...th, fontSize: 11 }}>Total</th>
                    <th style={{ ...th, fontSize: 11 }}>Critical</th>
                    <th style={{ ...th, fontSize: 11 }}>High</th>
                    <th style={{ ...th, fontSize: 11 }}>Medium</th>
                    <th style={{ ...th, fontSize: 11 }}>Low</th>
                    <th style={{ ...th, fontSize: 11 }}>Latest</th>
                  </tr>
                </thead>
                <tbody>
                  {alertVendorsList.slice(0, 12).map((v) => (
                    <tr
                      key={v.vendorId}
                      style={{
                        cursor: "pointer",
                        background:
                          "linear-gradient(90deg,rgba(15,23,42,0.98),rgba(15,23,42,0.94))",
                      }}
                      onClick={() => openDrawer(v.vendorId)}
                    >
                      <td style={td}>{v.vendorId}</td>
                      <td style={td}>{v.total}</td>
                      <td style={td}>{v.critical}</td>
                      <td style={td}>{v.high}</td>
                      <td style={td}>{v.medium}</td>
                      <td style={td}>{v.low}</td>
                      <td style={td}>
                        {v.latest ? (
                          <span
                            style={{
                              fontSize: 11,
                              color:
                                v.latest.severity === "critical"
                                  ? GP.neonRed
                                  : v.latest.severity === "high"
                                  ? GP.neonGold
                                  : GP.textSoft,
                            }}
                          >
                            {v.latest.code} · {v.latest.message}
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, color: GP.textMuted }}>
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!alertSummary && (
            <div style={{ fontSize: 12, color: GP.textSoft, marginTop: 8 }}>
              Loading alert summary…
            </div>
          )}
        </div>
      )}

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

      {/* SECONDARY BASE CHARTS */}
      <ExpiringCertsHeatmap policies={policies} />
      <SeverityDistributionChart overview={dashboard} />
      <RiskTimelineChart policies={policies} />

      {/* ALERT WEAPON PACK */}
      <AlertTimelineChart orgId={activeOrgId} />
      <TopAlertTypes orgId={activeOrgId} />
      <AlertAgingKpis orgId={activeOrgId} />
      <SlaBreachWidget orgId={activeOrgId} />
      <CriticalVendorWatchlist orgId={activeOrgId} />
      <AlertHeatSignature orgId={activeOrgId} />

      {/* RENEWAL INTELLIGENCE V3 — HEATMAP + BACKLOG */}
      <RenewalHeatmap range={90} />
      <RenewalBacklog />

      {/* 🔥 NEW — RENEWAL INTELLIGENCE V3 DROP 3 BLOCK */}
      <div
        style={{
          marginTop: 24,
          marginBottom: 24,
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

      {/* SYSTEM TIMELINE (GLOBAL EVENTS) */}
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
      {/* POLICIES TABLE */}
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
                  <th style={th}>V3 Risk</th>
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

                  let v3Tier = "Unknown";
                  if (engine && typeof engine.globalScore === "number") {
                    const s = engine.globalScore;
                    if (s >= 85) v3Tier = "Elite Safe";
                    else if (s >= 70) v3Tier = "Preferred";
                    else if (s >= 55) v3Tier = "Watch";
                    else if (s >= 35) v3Tier = "High Risk";
                    else v3Tier = "Severe";
                  }

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

                      {/* Status Badge */}
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

                      {/* Expiration Risk Tier */}
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

                      {/* AI Risk Meter */}
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

                      {/* RULE ENGINE V3 RISK */}
                      <td style={{ ...td, textAlign: "center" }}>
                        {!engine || engine.loading ? (
                          <span style={{ fontSize: 11, color: GP.textMuted }}>
                            Running…
                          </span>
                        ) : engine.error ? (
                          <span style={{ fontSize: 11, color: GP.neonRed }}>
                            Error
                          </span>
                        ) : typeof engine.globalScore === "number" ? (
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
                        ) : (
                          <span style={{ fontSize: 11, color: GP.textMuted }}>
                            —
                          </span>
                        )}
                      </td>

                      {/* COMPLIANCE BADGE */}
                      <td style={{ ...td, textAlign: "center" }}>
                        {renderComplianceBadge(p.vendor_id, complianceMap)}
                      </td>

                      {/* ELITE ENGINE STATUS */}
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

                      {/* FLAGS */}
                      <td style={{ ...td, textAlign: "center" }}>
                        {flags.length > 0 ? (
                          <span title={flags.join("\n")} style={{ cursor: "help" }}>
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

          {/* DRAWER */}
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
