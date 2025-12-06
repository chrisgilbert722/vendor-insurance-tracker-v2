// pages/admin/org-compliance.js
// ============================================================
// ORG COMPLIANCE DASHBOARD V5 — OPTION C
// Cinematic cockpit for org-wide compliance intelligence.
//
// Powered by /api/admin/org-compliance-v5:
//  - v5Engine  (V5 Rule Engine metrics)
//  - alertsEngine (Alerts V5 metrics)
//  - eliteEngine  (Score bands from V5)
//  - coverageBreakdown
//  - topRiskVendors
//  - combined (combinedScore, overallTier, narrative)
// ============================================================

import { useEffect, useState } from "react";
import { useOrg } from "../../context/OrgContext";

const GP = {
  bg: "#020617",
  panel: "rgba(15,23,42,0.98)",
  border: "rgba(51,65,85,0.9)",
  text: "#e5e7eb",
  textSoft: "#9ca3af",
  neonBlue: "#38bdf8",
  neonPurple: "#a855f7",
  neonGreen: "#22c55e",
  neonGold: "#facc15",
  neonRed: "#fb7185",
};

export default function OrgComplianceDashboard() {
  const { activeOrgId } = useOrg();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!activeOrgId) {
      setLoading(false);
      return;
    }

    async function load() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(
          `/api/admin/org-compliance-v5?orgId=${activeOrgId}`
        );
        const json = await res.json();
        if (!json.ok) throw new Error(json.error || "Failed to load org view.");

        setData(json);
      } catch (err) {
        console.error("[OrgCompliance] ERROR:", err);
        setError(err.message || "Failed to load org compliance.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [activeOrgId]);

  if (!activeOrgId) {
    return (
      <Page>
        <h1>Select an organization to view compliance.</h1>
      </Page>
    );
  }

  if (loading) {
    return (
      <Page>
        <h1>Loading org compliance…</h1>
      </Page>
    );
  }

  if (error || !data?.org) {
    return (
      <Page>
        <h1>{data?.org ? "Error" : "Organization not found"}</h1>
        {error && (
          <p style={{ color: GP.neonRed, marginTop: 8 }}>{error}</p>
        )}
      </Page>
    );
  }

  // ============================================================
  // UNPACK V5 ENGINE, ALERTS, COVERAGE, COMBINED INTEL
  // ============================================================
  const {
    org,
    v5Engine,
    alertsEngine,
    coverageBreakdown = [],
    topRiskVendors = [],
    combined,
  } = data;

  const {
    globalScoreAvg = 0,
    vendorCount = 0,
    failingVendorCount = 0,
    scoreBands = {},
    ruleFailureCounts = {},
  } = v5Engine || {};

  const alertCounts = alertsEngine?.alertCounts || {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  const coverageTypes = coverageBreakdown.length;
  const expiredPolicies = coverageBreakdown.reduce(
    (sum, c) => sum + (c.expired || 0),
    0
  );

  const combinedScore = combined?.combinedScore ?? globalScoreAvg;
  const overallTier = combined?.overallTier ?? "Unknown";
  const narrative = combined?.narrative || "";

  return (
    <Page>
      {/* HEADER */}
      <div style={headerRow}>
        <div>
          <div style={breadcrumb}>
            <span>Admin</span>
            <span>/</span>
            <span>Org Compliance</span>
          </div>

          <h1 style={title}>
            Org Compliance:{" "}
            <span style={titleGradient}>{org.name}</span>
          </h1>
        </div>
      </div>

      {/* SNAPSHOT ROW */}
      <div style={snapshotGrid}>
        <SnapCard
          label="Combined Org Score"
          value={combinedScore}
          color={combinedScore >= 80 ? GP.neonGreen : combinedScore >= 60 ? GP.neonGold : GP.neonRed}
        />
        <SnapCard
          label="V5 Avg Score"
          value={globalScoreAvg}
          color={GP.neonGreen}
        />
        <SnapCard
          label="Vendors"
          value={vendorCount}
          color={GP.neonBlue}
        />
        <SnapCard
          label="Failing Vendors"
          value={failingVendorCount}
          color={GP.neonRed}
        />
        <SnapCard
          label="Critical Alerts"
          value={alertCounts.critical}
          color={GP.neonRed}
        />
        <SnapCard
          label="High Alerts"
          value={alertCounts.high}
          color={GP.neonGold}
        />
      </div>

      {/* ORG INTELLIGENCE SUMMARY */}
      <div
        style={{
          marginTop: 24,
          marginBottom: 20,
          borderRadius: 20,
          padding: 16,
          border: `1px solid ${GP.neonBlue}55`,
          background: GP.panel,
        }}
      >
        <div
          style={{
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: 1.4,
            color: GP.textSoft,
            marginBottom: 6,
          }}
        >
          Org Intelligence Summary
        </div>

        <div
          style={{
            fontSize: 14,
            color: GP.neonGreen,
            marginBottom: 4,
            fontWeight: 600,
          }}
        >
          {overallTier} (Score: {combinedScore})
        </div>

        {narrative ? (
          <p
            style={{
              margin: 0,
              marginTop: 4,
              fontSize: 13,
              lineHeight: 1.5,
              color: GP.text,
            }}
          >
            {narrative}
          </p>
        ) : (
          <p
            style={{
              margin: 0,
              marginTop: 4,
              fontSize: 13,
              color: GP.textSoft,
            }}
          >
            AI is still calibrating your org narrative. Try again after a few
            engine runs.
          </p>
        )}
      </div>

      {/* THREE-BRAIN GRID: COVERAGE + TOP RISK */}
      <div
        style={{
          marginTop: 8,
          display: "grid",
          gridTemplateColumns: "minmax(0,1.5fr) minmax(0,1.2fr)",
          gap: 20,
        }}
      >
        {/* LEFT: COVERAGE BREAKDOWN */}
        <Panel title="Coverage Breakdown" color={GP.neonBlue}>
          {coverageBreakdown.length === 0 ? (
            <Empty text="No policies found for this organization." />
          ) : (
            <>
              <div
                style={{
                  fontSize: 12,
                  color: GP.textSoft,
                  marginBottom: 8,
                }}
              >
                Coverage types:{" "}
                <strong style={{ color: GP.text }}>{coverageTypes}</strong> ·
                Expired policies:{" "}
                <strong style={{ color: GP.neonRed }}>
                  {expiredPolicies}
                </strong>
              </div>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={th}>Coverage</th>
                    <th style={th}>Policies</th>
                    <th style={th}>Expired</th>
                  </tr>
                </thead>
                <tbody>
                  {coverageBreakdown.map((c) => (
                    <tr key={c.coverage} style={row}>
                      <td style={td}>
                        {c.coverage.charAt(0).toUpperCase() +
                          c.coverage.slice(1)}
                      </td>
                      <td style={td}>{c.count}</td>
                      <td style={td}>{c.expired}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </Panel>

        {/* RIGHT: TOP RISK VENDORS */}
        <Panel title="Top Risk Vendors (Lowest Scores)" color={GP.neonRed}>
          {!topRiskVendors || topRiskVendors.length === 0 ? (
            <Empty text="No vendor scores available yet." />
          ) : (
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Vendor</th>
                  <th style={th}>Score</th>
                </tr>
              </thead>
              <tbody>
                {topRiskVendors.map((v) => (
                  <tr key={v.vendor_id} style={row}>
                    <td style={td}>{v.vendor_name || v.vendor_id}</td>
                    <td style={td}>{v.score ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>
    </Page>
  );
}

/* ============================================================
   SUPPORT COMPONENTS + STYLES
============================================================ */

function Page({ children }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left,#020617 0,#020617 45%,#000 100%)",
        padding: "32px 40px",
        color: GP.text,
        position: "relative",
      }}
    >
      {/* Aura */}
      <div
        style={{
          position: "absolute",
          top: -260,
          left: "50%",
          transform: "translateX(-50%)",
          width: 1100,
          height: 1100,
          background:
            "radial-gradient(circle, rgba(56,189,248,0.35), transparent 60%)",
          filter: "blur(120px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
}

function Panel({ title, color, children }) {
  return (
    <div
      style={{
        borderRadius: 20,
        padding: 16,
        border: `1px solid ${color}55`,
        background: GP.panel,
      }}
    >
      <h2
        style={{
          marginTop: 0,
          marginBottom: 10,
          fontSize: 16,
          color,
        }}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}

function Empty({ text }) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 12,
        border: `1px dashed ${GP.border}`,
        background: "rgba(15,23,42,0.9)",
        color: GP.textSoft,
        fontSize: 13,
        textAlign: "center",
      }}
    >
      {text}
    </div>
  );
}

function SnapCard({ label, value, color }) {
  return (
    <div
      style={{
        borderRadius: 16,
        padding: 14,
        border: `1px solid ${color}55`,
        background: GP.panel,
      }}
    >
      <div style={{ fontSize: 12, color: GP.textSoft }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

/* ======= STYLES ======= */

const headerRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  flexWrap: "wrap",
  marginBottom: 18,
};

const breadcrumb = {
  fontSize: 12,
  color: GP.textSoft,
  marginBottom: 6,
  display: "flex",
  gap: 8,
  alignItems: "center",
};

const title = {
  margin: 0,
  fontSize: 24,
  fontWeight: 600,
  color: GP.text,
};

const titleGradient = {
  background: "linear-gradient(90deg,#38bdf8,#a855f7,#f97316)",
  WebkitBackgroundClip: "text",
  color: "transparent",
};

const snapshotGrid = {
  marginTop: 20,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: 14,
};

const table = {
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: 0,
  fontSize: 12,
};

const row = {
  background:
    "linear-gradient(90deg,rgba(15,23,42,0.98),rgba(15,23,42,0.94))",
};

const th = {
  padding: "8px 10px",
  background: "rgba(15,23,42,0.98)",
  color: "#9ca3af",
  fontWeight: 600,
  textAlign: "left",
  fontSize: 12,
  borderBottom: "1px solid rgba(51,65,85,0.8)",
};

const td = {
  padding: "8px 10px",
  borderBottom: "1px solid rgba(51,65,85,0.5)",
  fontSize: 12,
  color: "#e5e7eb",
};
