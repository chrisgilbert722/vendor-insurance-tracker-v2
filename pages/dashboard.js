import { useEffect, useState } from "react";
import Header from "../components/Header";
import VendorDrawer from "../components/VendorDrawer";
import { useRouter } from "next/router";
import { useRole } from "../lib/useRole";

/* ========================================================
   🔥 G-POWER THEME TOKENS  
======================================================== */

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

/* ------------------------------------------
   Risk Badge Styles
------------------------------------------- */
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

/* ------------------------------------------
   Risk Engine Helpers
------------------------------------------- */
function parseExpiration(dateStr) {
  if (!dateStr) return null;
  const [mm, dd, yyyy] = dateStr.split("/");
  if (!mm || !dd || !yyyy) return null;
  return new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
}

function computeDaysLeft(dateStr) {
  const exp = parseExpiration(dateStr);
  if (!exp) return null;
  return Math.floor((exp - new Date()) / (1000 * 60 * 60 * 24));
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

/* ------------------------------------------
   Quick Compliance Badge Helper
------------------------------------------- */
function renderComplianceBadge(vendorId, complianceMap) {
  const data = complianceMap[vendorId];

  const baseStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "3px 8px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: 600,
    border: "1px solid",
  };

  if (!data) {
    return (
      <span style={{ ...baseStyle, borderColor: "#e5e7eb", color: "#6b7280" }}>
        …
      </span>
    );
  }

  if (data.error) {
    return (
      <span
        style={{ ...baseStyle, borderColor: GP.red, color: GP.red }}
        title={data.error}
      >
        ? Error
      </span>
    );
  }

  if (!data.hasRequirements) {
    return (
      <span
        style={{
          ...baseStyle,
          borderColor: "#e5e7eb",
          color: "#6b7280",
          background: "#f9fafb",
        }}
        title="No org-wide requirements configured yet."
      >
        No rules
      </span>
    );
  }

  if (data.missingCount === 0) {
    return (
      <span
        style={{
          ...baseStyle,
          borderColor: GP.green,
          color: GP.green,
          background: "#ecfdf3",
        }}
        title="Vendor meets all current organizational coverage requirements."
      >
        🛡️ Compliant
      </span>
    );
  }

  return (
    <span
      style={{
        ...baseStyle,
        borderColor: GP.red,
        color: GP.red,
        background: "#fef2f2",
      }}
      title={`Fails ${data.missingCount} requirement(s). High compliance risk until COIs updated.`}
    >
      🛡️ Non-compliant
    </span>
  );
}

export default function Dashboard() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState("");
  const [metrics, setMetrics] = useState(null);
  const [deltas, setDeltas] = useState(null);

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerVendor, setDrawerVendor] = useState(null);
  const [drawerPolicies, setDrawerPolicies] = useState([]);

  // Compliance map: vendorId -> { hasRequirements, missingCount, error }
  const [complianceMap, setComplianceMap] = useState({});

  const router = useRouter();
  const pathname = router.pathname;

  const { isAdmin, isManager, isViewer } = useRole();

  async function openDrawer(vendorId) {
    try {
      const res = await fetch(`/api/vendor/${vendorId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
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

  // Load policies
  useEffect(() => {
    async function loadPolicies() {
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
    loadPolicies();
  }, []);

  // Load metrics
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

  // Load compliance per vendor
  useEffect(() => {
    if (!policies || policies.length === 0) return;

    const vendorIds = [...new Set(policies.map((p) => p.vendor_id))];

    vendorIds.forEach((id) => {
      if (complianceMap[id]) return;

      setComplianceMap((prev) => ({
        ...prev,
        [id]: { loading: true },
      }));

      fetch(`/api/requirements/check?vendorId=${id}`)
        .then((res) => res.json())
        .then((data) => {
          setComplianceMap((prev) => ({
            ...prev,
            [id]: data.ok
              ? {
                  loading: false,
                  hasRequirements: (data.requirements || []).length > 0,
                  missingCount: (data.missing || []).length,
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
            [id]: {
              loading: false,
              error: err.message,
            },
          }));
        });
    });
  }, [policies]);

  // Filter
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
    <div style={{ display: "flex", minHeight: "100vh", background: GP.surface }}>
      <Sidebar pathname={pathname} isAdmin={isAdmin} isManager={isManager} />

      <div style={{ flex: 1, padding: "30px 40px" }}>
        <Header />

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
        <p style={{ fontSize: "15px", marginTop: "8px", color: GP.inkLight }}>
          Real-time visibility into vendor insurance compliance, expiration risk, and coverage health.
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
            tooltip="Policies past expiration"
          />
          <RiskCard
            label="Critical (≤30 days)"
            icon="⚠️"
            color={GP.orange}
            count={metrics?.critical_count ?? 0}
            delta={deltas?.critical ?? 0}
            tooltip="Expiring within 30 days"
          />
          <RiskCard
            label="Warning (≤90 days)"
            icon="🟡"
            color={GP.yellow}
            count={metrics?.warning_count ?? 0}
            delta={deltas?.warning ?? 0}
            tooltip="Expiring within 90 days"
          />
          <RiskCard
            label="Active"
            icon="✅"
            color={GP.green}
            count={metrics?.ok_count ?? 0}
            delta={deltas?.ok ?? 0}
            tooltip="Valid policies"
          />
          <ScoreCard
            avgScore={metrics?.avg_score}
            delta={deltas?.avg_score}
            tooltip="Average compliance score"
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
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "scale(1.01)";
                        e.currentTarget.style.boxShadow =
                          "0 4px 14px rgba(0,0,0,0.08)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "scale(1)";
                        e.currentTarget.style.boxShadow =
                          "0 2px 6px rgba(0,0,0,0.05)";
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


                    {/* COMPLIANCE COLUMN */}
                    <td style={{ ...td, textAlign: "center" }}>
                      {renderComplianceBadge(p.vendor_id, complianceMap)}
                    </td>

                    {/* FLAGS */}
                    <td style={{ ...td, textAlign: "center" }}>
                      {flags.length > 0 ? (
                        <span
                          title={flags.join("\n")}
                          style={{
                            cursor: "help",
                            fontSize: "13px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <span>🚩</span>
                          <span>
                            {flags.length} flag{flags.length > 1 ? "s" : ""}
                          </span>
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

          {/* Drawer */}
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

/* ========================================================
   SIDEBAR WITH ROLE + HIGHLIGHT
======================================================== */
function Sidebar({ pathname, isAdmin, isManager }) {
  return (
    <div
      style={{
        width: "220px",
        background: "#0f172a",
        color: "#e5e7eb",
        padding: "24px 18px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      <div style={{ marginBottom: "20px" }}>
        <div style={{ fontSize: "18px", fontWeight: "700" }}>G-Track</div>
        <div style={{ fontSize: "11px", opacity: 0.7 }}>
          Vendor COI Automation
        </div>
      </div>

      <SidebarLink
        href="/dashboard"
        label="Dashboard"
        icon="📊"
        active={pathname === "/dashboard"}
      />

      <SidebarLink
        href="/vendors"
        label="Vendors"
        icon="👥"
        active={pathname === "/vendors"}
      />

      {(isAdmin || isManager) && (
        <SidebarLink
          href="/upload-coi"
          label="Upload COI"
          icon="📄"
          active={pathname === "/upload-coi"}
        />
      )}

      {isAdmin && (
        <SidebarLink
          href="/organization"
          label="Organization"
          icon="🏢"
          active={pathname === "/organization"}
        />
      )}

      <SidebarLink
        href="/auth/login"
        label="Logout / Login"
        icon="🔐"
        active={pathname === "/auth/login"}
      />
    </div>
  );
}

function SidebarLink({ href, label, icon, active }) {
  return (
    <a
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "10px 12px",
        borderRadius: "8px",
        color: active ? "#ffffff" : "#e5e7eb",
        background: active ? "#1e293b" : "transparent",
        textDecoration: "none",
        fontSize: "14px",
        fontWeight: active ? "600" : "400",
        cursor: "pointer",
      }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </a>
  );
}

/* ========================================================
   KPI + SCORE CARDS
======================================================== */
function RiskCard({ label, icon, color, count, delta, tooltip }) {
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
    <div style={{ textAlign: "center", flex: 1 }} title={tooltip}>
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
      <div style={{ fontSize: "13px", marginTop: "2px", color: GP.text }}>
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
        {arrow} {delta > 0 ? `+${delta}` : delta}
      </div>
    </div>
  );
}

function ScoreCard({ avgScore, delta, tooltip }) {
  const hasScore = avgScore !== null && avgScore !== undefined;
  const score = hasScore ? Number(avgScore) : null;

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
    score >= 80
      ? GP.green
      : score >= 60
      ? GP.yellow
      : GP.red;

  return (
    <div style={{ textAlign: "center", flex: 1 }} title={tooltip}>
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
      <div style={{ fontSize: "13px", marginTop: "2px", color: GP.text }}>
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
        {arrow} {typeof delta === "number" ? delta.toFixed(1) : "0.0"}
      </div>
    </div>
  );
}

/* ========================================================
   TABLE CELLS
======================================================== */
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

export { Sidebar };
