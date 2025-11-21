// pages/dashboard.js
import { useEffect, useState } from "react";
import VendorDrawer from "../components/VendorDrawer";
import { useRole } from "../lib/useRole";
import { useOrg } from "../context/OrgContext";
import EliteStatusPill from "../components/elite/EliteStatusPill";

// Charts
import ComplianceTrajectoryChart from "../components/charts/ComplianceTrajectoryChart";
import PassFailDonutChart from "../components/charts/PassFailDonutChart";
import ExpiringCertsHeatmap from "../components/charts/ExpiringCertsHeatmap";
import SeverityDistributionChart from "../components/charts/SeverityDistributionChart";
import RiskTimelineChart from "../components/charts/RiskTimelineChart";

/* ===========================
   THEME — ELECTRIC NEON CINEMATIC
=========================== */
const GP = {
  bg: "#020617",
  bgSoft: "#020617",
  panel: "rgba(15,23,42,0.98)",
  panelDeep: "rgba(15,23,42,0.98)",
  borderSoft: "rgba(51,65,85,0.9)",
  borderStrong: "rgba(148,163,184,0.8)",

  primary: "#38bdf8",
  accentGreen: "#22c55e",
  accentYellow: "#facc15",
  accentRed: "#fb7185",
  accentPurple: "#a855f7",

  text: "#e5e7eb",
  textSoft: "#9ca3af",
  textMuted: "#6b7280",

  radiusLg: 24,
  radiusMd: 18,
  radiusSm: 12,
};

/* ===========================
   RISK + SCORE HELPERS
=========================== */
function parseExpiration(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  const [mm, dd, yyyy] = parts;
  if (!mm || !dd || !yyyy) return null;
  return new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
}

function computeDaysLeft(dateStr) {
  const d = parseExpiration(dateStr);
  if (!d) return null;
  return Math.floor((d - new Date()) / (1000 * 60 * 60 * 24));
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
    flags.push("Expires within 30 days");
  } else if (daysLeft <= 90) {
    severity = "warning";
    score = 70;
    flags.push("Expires within 90 days");
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

/* AI RISK SCORE */
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
  else if (compliance && compliance.missing?.length > 0) complianceFactor = 0.7;

  let score = Math.round(base * eliteFactor * complianceFactor);
  score = Math.min(Math.max(score, 0), 100);

  let tier = "Unknown";
  if (score >= 85) tier = "Elite Safe";
  else if (score >= 70) tier = "Preferred";
  else if (score >= 55) tier = "Watch";
  else if (score >= 35) tier = "High Risk";
  else tier = "Severe";

  return { score, tier };
}

/* COMPLIANCE BADGE */
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
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState("");
  const [metrics, setMetrics] = useState(null);
  const [deltas, setDeltas] = useState(null);
  const [complianceMap, setComplianceMap] = useState({});
  const [eliteMap, setEliteMap] = useState({});
  const [eliteSummary, setEliteSummary] = useState({
    pass: 0,
    warn: 0,
    fail: 0,
  });

  const [alerts, setAlerts] = useState([]);
  const [showAlerts, setShowAlerts] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerVendor, setDrawerVendor] = useState(null);
  const [drawerPolicies, setDrawerPolicies] = useState([]);

  const { isAdmin, isManager } = useRole();
  const { activeOrgId } = useOrg();

  /* LOAD POLICIES */
  useEffect(() => {
    async function load() {
      const res = await fetch("/api/get-policies");
      const data = await res.json();
      if (data.ok) setPolicies(data.policies);
      setLoading(false);
    }
    load();
  }, []);

  /* LOAD METRICS */
  useEffect(() => {
    async function loadSummary() {
      const res = await fetch("/api/metrics/summary");
      const data = await res.json();
      if (data.ok) {
        setMetrics(data.latest);
        setDeltas(data.deltas);
      }
    }
    loadSummary();
  }, []);

  /* LOAD COMPLIANCE */
  useEffect(() => {
    if (!policies.length || !activeOrgId) return;

    const vendorIds = [...new Set(policies.map((p) => p.vendor_id))];

    vendorIds.forEach((vendorId) => {
      if (complianceMap[vendorId]) return;

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
        });
    });
  }, [policies, activeOrgId, complianceMap]);

  /* LOAD ELITE */
  useEffect(() => {
    if (!policies.length) return;

    const vendorIds = [...new Set(policies.map((p) => p.vendor_id))];

    vendorIds.forEach((vendorId) => {
      if (eliteMap[vendorId] && !eliteMap[vendorId].loading) return;

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
        });
    });
  }, [policies, eliteMap]);

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

  /* LOG ALERT */
  async function logAlert(vendorId, type, message) {
    if (!activeOrgId) return;
    await fetch("/api/alerts/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendorId, orgId: activeOrgId, type, message }),
    });
  }

  /* TRIGGER ALERTS */
  useEffect(() => {
    if (!policies.length || !activeOrgId) return;

    policies.forEach((p) => {
      const risk = computeRisk(p);
      const elite = eliteMap[p.vendor_id];
      const compliance = complianceMap[p.vendor_id];
      const ai = computeAiRisk({ risk, elite, compliance });
      const name = p.vendor_name || "Vendor";

      if (elite?.overall === "fail") {
        logAlert(p.vendor_id, "elite_fail", `${name} failed Elite Engine`);
      }

      if (ai.score < 60) {
        logAlert(p.vendor_id, "risk_low", `${name} dropped to risk ${ai.score}`);
      }

      if (risk.daysLeft !== null && risk.daysLeft < 5) {
        logAlert(
          p.vendor_id,
          "expires_soon",
          `${name} has a policy expiring in ${risk.daysLeft} days`
        );
      }

      if (compliance?.missing?.length > 0) {
        logAlert(
          p.vendor_id,
          "missing_coverage",
          `${name} missing required coverage`
        );
      }
    });
  }, [policies, eliteMap, complianceMap, activeOrgId]);

  /* FETCH ALERTS */
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

  async function openDrawer(vendorId) {
    try {
      const res = await fetch(`/api/vendors/${vendorId}`);
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error);
      setDrawerVendor(data.vendor);
      setDrawerPolicies(data.policies);
      setDrawerOpen(true);
    } catch (err) {
      console.error("Drawer Load Error:", err);
    }
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setDrawerVendor(null);
    setDrawerPolicies([]);
  }

  /* ===========================
     RENDER
  ============================ */
  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left,#020617 0,#020617 45%,#000000 100%)",
        padding: "32px 40px 40px",
        color: GP.text,
        fontFamily:
          "-apple-system,BlinkMacSystemFont,system-ui,Segoe UI,sans-serif",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 26,
        }}
      >
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "4px 12px",
              borderRadius: 999,
              border: "1px solid rgba(148,163,184,0.4)",
              background:
                "linear-gradient(90deg,rgba(15,23,42,0.95),rgba(15,23,42,0.3))",
              marginBottom: 8,
            }}
          >
            <span
              style={{
                width: 22,
                height: 22,
                borderRadius: "999px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background:
                  "radial-gradient(circle at 30% 0,#38bdf8,#4f46e5,#0f172a)",
                boxShadow: "0 0 20px rgba(56,189,248,0.5)",
                fontSize: 13,
              }}
            >
              📊
            </span>
            <span
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 1.3,
                color: "#e5e7eb",
              }}
            >
              Dashboard V2
            </span>
            <span
              style={{
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: 1,
                color: GP.primary,
              }}
            >
              Compliance • Insurance • Risk
            </span>
          </div>

          <h1
            style={{
              fontSize: 30,
              fontWeight: 600,
              margin: 0,
              letterSpacing: 0.2,
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
              maxWidth: 650,
              lineHeight: 1.5,
            }}
          >
            Live compliance oversight across all vendors, policies, expirations,
            and risk engines.
          </p>

          {(isAdmin || isManager) && (
            <a
              href="/upload-coi"
              style={{
                display: "inline-block",
                marginTop: 16,
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
        </div>

        {/* ALERTS */}
        <div style={{ position: "relative", marginTop: 8 }}>
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

          {showAlerts && (
            <div
              style={{
                position: "absolute",
                top: "120%",
                right: 0,
                width: 300,
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
                        color: GP.primary,
                        textTransform: "uppercase",
                        marginBottom: 2,
                      }}
                    >
                      {a.type.replace(/_/g, " ")}
                    </div>
                    <div style={{ fontSize: 12, color: "#e5e7eb" }}>
                      {a.message}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: GP.textMuted,
                        marginTop: 2,
                      }}
                    >
                      {new Date(a.created_at).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* KPI STRIP */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))",
          gap: 16,
          marginBottom: 30,
        }}
      >
        <CinematicKpi
          label="Expired"
          icon="🔥"
          count={metrics?.expired_count ?? 0}
          delta={deltas?.expired ?? 0}
          color={GP.accentRed}
        />
        <CinematicKpi
          label="Critical (≤30 days)"
          icon="⚠️"
          count={metrics?.critical_count ?? 0}
          delta={deltas?.critical ?? 0}
          color={GP.accentYellow}
        />
        <CinematicKpi
          label="Warning (≤90 days)"
          icon="🟡"
          count={metrics?.warning_count ?? 0}
          delta={deltas?.warning ?? 0}
          color={GP.primary}
        />
        <CinematicKpi
          label="Active"
          icon="✅"
          count={metrics?.ok_count ?? 0}
          delta={deltas?.ok ?? 0}
          color={GP.accentGreen}
        />
        <CinematicScoreCard
          avgScore={metrics?.avg_score}
          delta={deltas?.avg_score}
        />
        <CinematicEliteCard counts={eliteSummary} />
      </div>

      {/* CHARTS ROW */}
      <div
        style={{
          marginTop: 10,
          marginBottom: 40,
          display: "grid",
          gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1.2fr)",
          gap: 24,
        }}
      >
        <ComplianceTrajectoryChart />
        <PassFailDonutChart />
      </div>

      {/* HEATMAP + SEVERITY + TIMELINE */}
      <ExpiringCertsHeatmap policies={policies} />
      <SeverityDistributionChart policies={policies} />
      <RiskTimelineChart policies={policies} />

      {/* POLICIES TABLE HEADER + SEARCH */}
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
        <div style={{ fontSize: 13, color: GP.textSoft }}>Loading policies…</div>
      )}
      {!loading && filtered.length === 0 && (
        <div style={{ fontSize: 13, color: GP.textSoft }}>
          No matching policies.
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <>
          <div
            style={{
              borderRadius: GP.radiusLg,
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
                            display: "inline-block",
                            padding: "3px 10px",
                            borderRadius: 999,
                            background: "rgba(15,23,42,0.98)",
                            border: "1px solid rgba(51,65,85,0.98)",
                            fontSize: 11,
                            color: GP.textSoft,
                          }}
                        >
                          {risk.tier}
                        </span>
                      </td>

                      {/* AI RISK SCORE */}
                      <td
                        style={{
                          ...td,
                          textAlign: "center",
                          fontWeight: 600,
                          color:
                            ai.score >= 80
                              ? GP.accentGreen
                              : ai.score >= 60
                              ? GP.accentYellow
                              : GP.accentRed,
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
                                  ? GP.accentGreen
                                  : ai.score >= 60
                                  ? GP.accentYellow
                                  : GP.accentRed,
                            }}
                          />
                        </div>
                      </td>

                      {/* COMPLIANCE */}
                      <td style={{ ...td, textAlign: "center" }}>
                        {renderComplianceBadge(p.vendor_id, complianceMap)}
                      </td>

                      {/* ELITE */}
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

/* ===========================
   CINEMATIC KPI CARD
=========================== */
function CinematicKpi({ label, icon, color, count, delta }) {
  let arrow = "➖";
  let arrowColor = GP.textSoft;

  if (delta > 0) {
    arrow = "⬆️";
    arrowColor = GP.accentRed;
  } else if (delta < 0) {
    arrow = "⬇️";
    arrowColor = GP.accentGreen;
  }

  return (
    <div
      style={{
        borderRadius: GP.radiusMd,
        padding: 16,
        border: "1px solid rgba(51,65,85,0.9)",
        background:
          "radial-gradient(circle at top left,rgba(15,23,42,0.98),rgba(15,23,42,0.92))",
        boxShadow: "0 12px 30px rgba(0,0,0,0.6)",
        textAlign: "center",
        color: "#e5e7eb",
      }}
    >
      <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color }}>{count}</div>
      <div style={{ fontSize: 12, marginTop: 4, color: GP.textSoft }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 12,
          marginTop: 4,
          color: arrowColor,
          fontWeight: 600,
        }}
      >
        {arrow} {delta}
      </div>
    </div>
  );
}

/* ===========================
   CINEMATIC SCORE CARD
=========================== */
function CinematicScoreCard({ avgScore, delta }) {
  const hasScore = avgScore !== null && avgScore !== undefined;
  const score = hasScore ? Number(avgScore) : 0;

  let arrow = "➖";
  let arrowColor = GP.textSoft;

  if (typeof delta === "number" && delta > 0) {
    arrow = "⬆️";
    arrowColor = GP.accentGreen;
  } else if (typeof delta === "number" && delta < 0) {
    arrow = "⬇️";
    arrowColor = GP.accentRed;
  }

  const color =
    score >= 80 ? GP.accentGreen : score >= 60 ? GP.accentYellow : GP.accentRed;

  return (
    <div
      style={{
        borderRadius: GP.radiusMd,
        padding: 16,
        border: "1px solid rgba(51,65,85,0.9)",
        background:
          "radial-gradient(circle at top left,rgba(15,23,42,0.98),rgba(15,23,42,0.92))",
        boxShadow: "0 12px 30px rgba(0,0,0,0.6)",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 22 }}>📊</div>
      <div
        style={{
          fontSize: 26,
          fontWeight: 700,
          color: hasScore ? color : GP.textSoft,
        }}
      >
        {hasScore ? score.toFixed(0) : "—"}
      </div>
      <div style={{ fontSize: 12, marginTop: 4, color: GP.textSoft }}>
        Avg Score
      </div>
      <div
        style={{
          fontSize: 12,
          marginTop: 4,
          color: arrowColor,
          fontWeight: 600,
        }}
      >
        {arrow} {typeof delta === "number" ? delta.toFixed(1) : "0.0"}
      </div>
    </div>
  );
}

/* ===========================
   CINEMATIC ELITE CARD
=========================== */
function CinematicEliteCard({ counts }) {
  const total = counts.pass + counts.warn + counts.fail;

  return (
    <div
      style={{
        borderRadius: GP.radiusMd,
        padding: 16,
        border: "1px solid rgba(51,65,85,0.9)",
        background:
          "radial-gradient(circle at top left,rgba(15,23,42,0.98),rgba(15,23,42,0.92))",
        boxShadow: "0 12px 30px rgba(0,0,0,0.6)",
        textAlign: "center",
        color: "#e5e7eb",
      }}
    >
      <div style={{ fontSize: 22 }}>🧠</div>
      <div style={{ fontSize: 13, marginTop: 4, color: GP.accentPurple }}>
        Elite Engine
      </div>
      <div style={{ fontSize: 12, marginTop: 6 }}>
        Vendors Evaluated: <strong>{total}</strong>
      </div>

      <div
        style={{
          marginTop: 8,
          fontSize: 12,
          color: "#a3e635",
          fontWeight: 600,
        }}
      >
        PASS: {counts.pass}
      </div>
      <div
        style={{
          marginTop: 4,
          fontSize: 12,
          color: "#facc15",
          fontWeight: 600,
        }}
      >
        WARN: {counts.warn}
      </div>
      <div
        style={{
          marginTop: 4,
          fontSize: 12,
          color: "#fb7185",
          fontWeight: 600,
        }}
      >
        FAIL: {counts.fail}
      </div>
    </div>
  );
}

/* ===========================
   TABLE HEAD / CELL STYLES
=========================== */
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
