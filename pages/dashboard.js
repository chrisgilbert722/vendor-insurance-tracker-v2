// pages/dashboard.js
import { useEffect, useState } from "react";
import VendorDrawer from "../components/VendorDrawer";
import { useRole } from "../lib/useRole";
import { useOrg } from "../context/OrgContext";
import EliteStatusPill from "../components/elite/EliteStatusPill";

// 📊 NEW CHART IMPORTS
import ComplianceTrajectoryChart from "../components/charts/ComplianceTrajectoryChart";
import PassFailDonutChart from "../components/charts/PassFailDonutChart";
import ExpiringCertsHeatmap from "../components/charts/ExpiringCertsHeatmap";

/* THEME TOKENS */
const GP = {
  primary: "#0057FF",
  primaryDark: "#003BB3",
  accent1: "#00E0FF",
  accent2: "#8A2BFF",
  red: "#FF3B3B",
  orange: "#FF9800",
  yellow: "#FFC107",
  green: "#00C27A",
  ink: "#0D1623",
  inkLight: "#2A3647",
  surface: "#F7F9FC",
  panel: "#FFFFFF",
  radius: "14px",
  shadow: "0 8px 24px rgba(15,23,42,0.08)",
  text: "#1f2933",
  textLight: "#7b8794",
};

/* RISK + SCORE HELPERS */
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

/* 🔧 BADGE STYLE — THIS WAS MISSING AND BREAKING THINGS */
function badgeStyle(level) {
  switch (level) {
    case "expired":
      return { background: "#ffebee", color: "#b71c1c", fontWeight: 600 };
    case "critical":
      return { background: "#fff3e0", color: "#e65100", fontWeight: 600 };
    case "warning":
      return { background: "#fffde7", color: "#f9a825", fontWeight: 600 };
    case "ok":
      return { background: "#e8f5e9", color: "#1b5e20", fontWeight: 600 };
    default:
      return { background: "#eceff1", color: "#546e7a", fontWeight: 600 };
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
      <span style={{ ...base, background: "#eef0f4", color: "#64748b" }}>
        Checking…
      </span>
    );

  if (data.error)
    return (
      <span style={{ ...base, background: "#fee2e2", color: "#b91c1c" }}>
        Error
      </span>
    );

  if (data.missing?.length > 0)
    return (
      <span style={{ ...base, background: "#fef3c7", color: "#b45309" }}>
        Missing
      </span>
    );

  if (data.failing?.length > 0)
    return (
      <span style={{ ...base, background: "#fee2e2", color: "#b91c1c" }}>
        Non-compliant
      </span>
    );

  return (
    <span style={{ ...base, background: "#dcfce7", color: "#166534" }}>
      🛡️ Compliant
    </span>
  );
}
/* MAIN DASHBOARD */
export default function Dashboard() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState("");
  const [metrics, setMetrics] = useState(null);
  const [deltas, setDeltas] = useState(null);
  const [complianceMap, setComplianceMap] = useState({});

  const [eliteMap, setEliteMap] = useState({});
  const [eliteSummary, setEliteSummary] = useState({ pass: 0, warn: 0, fail: 0 });

  // ⭐ Phase F Alerts
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

  /* ⭐ Phase F — Log alerts */
  async function logAlert(vendorId, type, message) {
    if (!activeOrgId) return;
    await fetch("/api/alerts/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendorId, orgId: activeOrgId, type, message }),
    });
  }

  /* ⭐ Phase F — Trigger alerts automatically */
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

  /* ⭐ Phase F — Fetch alerts for dropdown */
  useEffect(() => {
    if (!activeOrgId) return;

    async function loadAlerts() {
      const res = await fetch(`/api/alerts/get?orgId=${activeOrgId}`);
      const data = await res.json();
      if (data.ok) setAlerts(data.alerts);
    }

    loadAlerts();
    const interval = setInterval(loadAlerts, 5000);
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

  return (
    <div style={{ minHeight: "100vh", background: GP.surface }}>
      <div style={{ padding: "30px 40px", position: "relative" }}>
        {/* HEADER + ALERTS */}
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: 36, fontWeight: 700, color: GP.ink }}>
              Vendor Insurance Dashboard
            </h1>
            <p style={{ fontSize: 15, color: GP.inkLight }}>
              Real-time vendor insurance intelligence
            </p>
            {(isAdmin || isManager) && (
              <a
                href="/upload-coi"
                style={{
                  display: "inline-block",
                  marginTop: 20,
                  padding: "9px 16px",
                  background: GP.primary,
                  color: "white",
                  borderRadius: 999,
                  textDecoration: "none",
                  fontWeight: 600,
                }}
              >
                + Upload New COI
              </a>
            )}
          </div>

          {/* ALERT BELL */}
          <div style={{ position: "relative", marginTop: 10 }}>
            <button
              onClick={() => setShowAlerts((s) => !s)}
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                border: "1px solid #e5e7eb",
                background: "white",
                cursor: "pointer",
                display: "flex",
                gap: 6,
                fontSize: 13,
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
                  background: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 12,
                  maxHeight: 340,
                  overflowY: "auto",
                  boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
                  zIndex: 20,
                }}
              >
                {alerts.length === 0 ? (
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    No alerts yet.
                  </div>
                ) : (
                  alerts.map((a) => (
                    <div
                      key={a.id}
                      style={{
                        paddingBottom: 8,
                        marginBottom: 8,
                        borderBottom: "1px solid #f1f5f9",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: "#111827",
                          textTransform: "uppercase",
                          marginBottom: 2,
                        }}
                      >
                        {a.type.replace(/_/g, " ")}
                      </div>
                      <div style={{ fontSize: 12 }}>{a.message}</div>
                      <div
                        style={{
                          fontSize: 10,
                          color: "#6b7280",
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

        <hr style={{ margin: "22px 0" }} />

        {/* KPI BAR */}
        <div
          style={{
            display: "flex",
            gap: 16,
            marginBottom: 30,
            background: "white",
            borderRadius: 12,
            padding: "20px 26px",
            border: "1px solid #e3e9f1",
            boxShadow: GP.shadow,
          }}
        >
          <RiskCard
            label="Expired"
            icon="🔥"
            color={GP.red}
            count={metrics?.expired_count ?? 0}
            delta={deltas?.expired ?? 0}
          />
          <RiskCard
            label="Critical (≤30 days)"
            icon="⚠️"
            color={GP.orange}
            count={metrics?.critical_count ?? 0}
            delta={deltas?.critical ?? 0}
          />
          <RiskCard
            label="Warning (≤90 days)"
            icon="🟡"
            color={GP.yellow}
            count={metrics?.warning_count ?? 0}
            delta={deltas?.warning ?? 0}
          />
          <RiskCard
            label="Active"
            icon="✅"
            color={GP.green}
            count={metrics?.ok_count ?? 0}
            delta={deltas?.ok ?? 0}
          />
          <ScoreCard avgScore={metrics?.avg_score} delta={deltas?.avg_score} />
          <EliteCard counts={eliteSummary} />
        </div>

        {/* 📊 ANALYTICS ROW — COMPLIANCE TRAJECTORY + PASS/FAIL DONUT */}
        <div
          style={{
            marginTop: 10,
            marginBottom: 40,
            display: "grid",
            gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1.2fr)",
            gap: 24,
            alignItems: "stretch",
          }}
        >
          <ComplianceTrajectoryChart />
          <PassFailDonutChart />
        </div>

{/* 🔥 EXPIRING CERTIFICATES HEATMAP */}
<ExpiringCertsHeatmap policies={policies} />

        {/* POLICIES TABLE */}
        <h2
          style={{
            marginBottom: "14px",
            fontSize: "24px",
            fontWeight: "700",
            color: GP.ink,
          }}
        >
          Policies
        </h2>

        <input
          type="text"
          placeholder="Search vendors, carriers, policy #, coverage..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          style={{
            padding: "10px",
            width: "360px",
            borderRadius: "8px",
            border: "1px solid #cfd4dc",
            marginBottom: "18px",
            fontSize: "14px",
          }}
        />
        {loading && <p>Loading policies…</p>}
        {!loading && filtered.length === 0 && <p>No matching policies.</p>}

        {!loading && filtered.length > 0 && (
          <>
            <table
              style={{
                width: "100%",
                borderCollapse: "separate",
                borderSpacing: "0 8px",
                fontSize: "13px",
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
                  <th style={th}>AI Risk Score</th>
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
                        background: "#ffffff",
                        cursor: "pointer",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
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
                          ...badgeStyle(risk.severity),
                          textAlign: "center",
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
                            background: "#eef0f4",
                            fontSize: 11,
                            fontWeight: 600,
                            color: GP.inkLight,
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
                          fontWeight: "700",
                          color:
                            ai.score >= 80
                              ? GP.green
                              : ai.score >= 60
                              ? GP.yellow
                              : GP.red,
                        }}
                      >
                        <div>{ai.score}</div>

                        <div
                          style={{
                            marginTop: 4,
                            height: 4,
                            width: 70,
                            borderRadius: 999,
                            background: "#eceff1",
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
                                  ? GP.green
                                  : ai.score >= 60
                                  ? GP.yellow
                                  : GP.red,
                            }}
                          ></div>
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
                          <span style={{ fontSize: 11, color: "#6b7280" }}>
                            Evaluating…
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, color: "#9ca3af" }}>
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
    </div>
  );
}
/* COMPONENTS */
function RiskCard({ label, icon, color, count, delta }) {
  let arrow = "➖";
  let arrowColor = GP.textLight;

  if (delta > 0) {
    arrow = "⬆️";
    arrowColor = GP.red;
  } else if (delta < 0) {
    arrow = "⬇️";
    arrowColor = GP.green;
  }

  return (
    <div style={{ textAlign: "center", flex: 1 }}>
      <div style={{ fontSize: 22 }}>{icon}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color }}>{count}</div>
      <div style={{ fontSize: 13, marginTop: 2, color: GP.text }}>{label}</div>
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

function ScoreCard({ avgScore, delta }) {
  const hasScore = avgScore !== null && avgScore !== undefined;
  const score = hasScore ? Number(avgScore) : 0;

  let arrow = "➖";
  let arrowColor = GP.textLight;

  if (typeof delta === "number" && delta > 0) {
    arrow = "⬆️";
    arrowColor = GP.green;
  } else if (typeof delta === "number" && delta < 0) {
    arrow = "⬇️";
    arrowColor = GP.red;
  }

  const color =
    score >= 80 ? GP.green : score >= 60 ? GP.yellow : GP.red;

  return (
    <div style={{ textAlign: "center", flex: 1 }}>
      <div style={{ fontSize: 22 }}>📊</div>
      <div
        style={{
          fontSize: 26,
          fontWeight: 700,
          color: hasScore ? color : GP.textLight,
        }}
      >
        {hasScore ? score.toFixed(0) : "—"}
      </div>
      <div style={{ fontSize: 13, color: GP.text }}>Avg Score</div>
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

function EliteCard({ counts }) {
  const total = counts.pass + counts.warn + counts.fail;

  return (
    <div style={{ textAlign: "center", flex: 1 }}>
      <div style={{ fontSize: 22 }}>🧠</div>
      <div
        style={{ fontSize: 16, fontWeight: 700, color: GP.ink, marginTop: 2 }}
      >
        Elite Summary
      </div>
      <div style={{ fontSize: 12, color: GP.textLight }}>
        Vendors Evaluated: <strong>{total}</strong>
      </div>
      <div style={{ fontSize: 12, marginTop: 4, color: "#166534" }}>
        PASS: <strong>{counts.pass}</strong>
      </div>
      <div style={{ fontSize: 12, marginTop: 4, color: "#b68b00" }}>
        WARN: <strong>{counts.warn}</strong>
      </div>
      <div style={{ fontSize: 12, marginTop: 4, color: "#b00020" }}>
        FAIL: <strong>{counts.fail}</strong>
      </div>
    </div>
  );
}

/* TABLE CELL STYLES */
const th = {
  padding: "10px 12px",
  background: "#f5f7fb",
  color: "#64748b",
  fontWeight: "600",
  textAlign: "left",
  fontSize: "12px",
};

const td = {
  padding: "10px 12px",
  borderBottom: "1px solid #e5e7eb",
  fontSize: "13px",
  color: "#111827",
};
