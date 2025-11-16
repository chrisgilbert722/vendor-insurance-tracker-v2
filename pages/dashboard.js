// pages/dashboard.js
import { useEffect, useState } from "react";
import VendorDrawer from "../components/VendorDrawer";
import { useRole } from "../lib/useRole";
import { useOrg } from "../context/OrgContext";

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

/* RISK HELPERS */
function parseExpiration(dateStr) {
  if (!dateStr) return null;
  const [mm, dd, yyyy] = dateStr.split("/");
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
      return { background: "#ffebee", color: "#b71c1c", fontWeight: "600" };
    case "critical":
      return { background: "#fff3e0", color: "#e65100", fontWeight: "600" };
    case "warning":
      return { background: "#fffde7", color: "#f9a825", fontWeight: "600" };
    case "ok":
      return { background: "#e8f5e9", color: "#1b5e20", fontWeight: "600" };
    default:
      return { background: "#eceff1", color: "#546e7a" };
  }
}

/* COMPLIANCE BADGE HELPER — uses real summary/missing/failing from /api/requirements/check */
function renderComplianceBadge(vendorId, complianceMap) {
  const data = complianceMap[vendorId];

  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "3px 8px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: 600,
  };

  if (!data || data.loading) {
    return (
      <span
        style={{
          ...base,
          background: "#eef0f4",
          color: "#64748b",
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
          background: "#fee2e2",
          color: "#b91c1c",
        }}
        title={data.error}
      >
        Error
      </span>
    );
  }

  if (data.missing && data.missing.length > 0) {
    return (
      <span
        style={{
          ...base,
          background: "#fef3c7",
          color: "#b45309",
        }}
        title="Missing required coverage."
      >
        Missing
      </span>
    );
  }

  if (data.failing && data.failing.length > 0) {
    return (
      <span
        style={{
          ...base,
          background: "#fee2e2",
          color: "#b91c1c",
        }}
        title="Coverage does not meet requirements."
      >
        Non-compliant
      </span>
    );
  }

  return (
    <span
      style={{
        ...base,
        background: "#dcfce7",
        color: "#166534",
      }}
      title="Vendor meets all current organizational coverage requirements."
    >
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

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerVendor, setDrawerVendor] = useState(null);
  const [drawerPolicies, setDrawerPolicies] = useState([]);

  const { isAdmin, isManager } = useRole();
  const { activeOrgId } = useOrg();

  /* LOAD POLICIES */
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/get-policies");
        const data = await res.json();
        if (data.ok) setPolicies(data.policies);
      } catch (err) {
        console.error("FAILED TO LOAD POLICIES:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  /* LOAD METRICS */
  useEffect(() => {
    async function loadSummary() {
      try {
        const res = await fetch("/api/metrics/summary");
        const data = await res.json();
        if (data.ok) {
          setMetrics(data.latest);
          setDeltas(data.deltas);
        }
      } catch (err) {
        console.error("METRICS FETCH FAILED:", err);
      }
    }
    loadSummary();
  }, []);

  /* LOAD COMPLIANCE PER VENDOR — REAL compliance engine with orgId */
  useEffect(() => {
    if (!policies || policies.length === 0) return;
    if (!activeOrgId) return;

    const vendorIds = [...new Set(policies.map((p) => p.vendor_id))];

    vendorIds.forEach((vendorId) => {
      // don’t refetch if we already have data
      if (complianceMap[vendorId]) return;

      setComplianceMap((prev) => ({
        ...prev,
        [vendorId]: { loading: true },
      }));

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
              : {
                  loading: false,
                  error: data.error || "Compliance check failed",
                },
          }));
        })
        .catch((err) => {
          console.error("Compliance fetch error", err);
          setComplianceMap((prev) => ({
            ...prev,
            [vendorId]: { loading: false, error: err.message },
          }));
        });
    });
  }, [policies, activeOrgId, complianceMap]);

  async function openDrawer(vendorId) {
    try {
      const res = await fetch(`/api/vendor/${vendorId}`);
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
    <div style={{ minHeight: "100vh", background: GP.surface }}>
      {/* Header is global now via Layout — no <Header /> here */}
      <div style={{ padding: "30px 40px" }}>
        <h1
          style={{
            fontSize: "36px",
            marginTop: "10px",
            color: GP.ink,
            fontWeight: "700",
          }}
        >
          Vendor Insurance Dashboard
        </h1>

        <p
          style={{
            fontSize: "15px",
            marginTop: "8px",
            color: GP.inkLight,
          }}
        >
          Real-time visibility into vendor insurance compliance, expiration
          risk, and coverage health.
        </p>

        {(isAdmin || isManager) && (
          <a
            href="/upload-coi"
            style={{
              display: "inline-block",
              marginTop: "18px",
              marginBottom: "25px",
              padding: "9px 16px",
              background: GP.primary,
              color: GP.panel,
              borderRadius: "999px",
              fontSize: "14px",
              fontWeight: "600",
              textDecoration: "none",
              boxShadow: GP.shadow,
            }}
          >
            + Upload New COI
          </a>
        )}

        <hr style={{ margin: "22px 0" }} />

        {/* KPI BAR */}
        <div
          style={{
            display: "flex",
            gap: "16px",
            marginBottom: "30px",
            padding: "22px 26px",
            background: GP.panel,
            borderRadius: GP.radius,
            boxShadow: GP.shadow,
            border: "1px solid #e3e9f1",
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
            count={metrics?.warning ?? 0}
            delta={deltas?.warning ?? 0}
          />
          <RiskCard
            label="Active"
            icon="✅"
            color={GP.green}
            count={metrics?.ok_count ?? 0}
            delta={deltas?.ok ?? 0}
          />
          <ScoreCard
            avgScore={metrics?.avg_score}
            delta={deltas?.avg_score}
          />
        </div>

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
                  <th style={th}>Score</th>
                  <th style={th}>Compliance</th>
                  <th style={th}>Flags</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((p) => {
                  const risk = computeRisk(p);
                  const severity = risk.severity;
                  const score = risk.score;
                  const flags = risk.flags || [];

                  return (
                    <tr
                      key={p.id}
                      onClick={() => openDrawer(p.vendor_id)}
                      style={{
                        background: "#ffffff",
                        cursor: "pointer",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
                        transition: "0.15s ease",
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
                          ...badgeStyle(severity),
                          textAlign: "center",
                        }}
                      >
                        {severity === "ok"
                          ? "Active"
                          : severity.charAt(0).toUpperCase() +
                            severity.slice(1)}
                      </td>

                      <td style={{ ...td, textAlign: "center" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 10px",
                            borderRadius: "999px",
                            background: "#eef0f4",
                            fontSize: "11px",
                            fontWeight: "600",
                            color: GP.inkLight,
                          }}
                        >
                          {risk.tier}
                        </span>
                      </td>

                      <td
                        style={{
                          ...td,
                          textAlign: "center",
                          fontWeight: "700",
                          color:
                            score >= 80
                              ? GP.green
                              : score >= 60
                              ? GP.yellow
                              : GP.red,
                        }}
                      >
                        <div>{score}</div>

                        <div
                          style={{
                            marginTop: "4px",
                            height: "4px",
                            width: "70px",
                            borderRadius: "999px",
                            background: "#eceff1",
                            overflow: "hidden",
                            marginLeft: "auto",
                            marginRight: "auto",
                          }}
                        >
                          <div
                            style={{
                              width: `${Math.min(score, 100)}%`,
                              height: "100%",
                              background:
                                score >= 80
                                  ? GP.green
                                  : score >= 60
                                  ? GP.yellow
                                  : GP.red,
                            }}
                          ></div>
                        </div>
                      </td>

                      <td style={{ ...td, textAlign: "center" }}>
                        {renderComplianceBadge(p.vendor_id, complianceMap)}
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
/* KPI + SCORE CARDS */
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
      <div style={{ fontSize: "22px" }}>{icon}</div>
      <div
        style={{
          fontSize: "26px",
          fontWeight: "700",
          color,
          marginTop: "4px",
        }}
      >
        {count}
      </div>
      <div
        style={{
          fontSize: "13px",
          marginTop: "2px",
          color: GP.text,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "12px",
          marginTop: "4px",
          color: arrowColor,
          fontWeight: "600",
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
      <div style={{ fontSize: "22px" }}>📊</div>
      <div
        style={{
          fontSize: "26px",
          fontWeight: "700",
          color: hasScore ? color : GP.textLight,
          marginTop: "4px",
        }}
      >
        {hasScore ? score.toFixed(0) : "—"}
      </div>
      <div
        style={{
          fontSize: "13px",
          marginTop: "2px",
          color: GP.text,
        }}
      >
        Avg Score
      </div>
      <div
        style={{
          fontSize: "12px",
          marginTop: "4px",
          color: arrowColor,
          fontWeight: "600",
        }}
      >
        {arrow}{" "}
        {typeof delta === "number" ? delta.toFixed(1) : "0.0"}
      </div>
    </div>
  );
}

/* TABLE STYLES */
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
