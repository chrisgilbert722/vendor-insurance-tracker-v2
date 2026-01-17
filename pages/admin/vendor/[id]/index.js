// pages/admin/vendor/[id]/index.js
// ============================================================
// ADMIN VENDOR OVERVIEW — STABILIZED V6
// Removed legacy renewal components that call non-existent endpoints
// ============================================================

import { useRouter } from "next/router";
import { useEffect, useState } from "react";

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

export default function AdminVendorDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ============================================================
  // LOAD VENDOR INTELLIGENCE
  // ============================================================
  useEffect(() => {
    if (!id) return;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`/api/admin/vendor/overview?id=${id}`);
        const json = await res.json();

        if (!json.ok) throw new Error(json.error || "Failed to load vendor.");
        setData(json);
      } catch (err) {
        console.error("[VendorOverview ERROR]", err);
        setError(err.message || "Failed to load vendor.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  // ============================================================
  // LOADING / ERROR STATES
  // ============================================================
  if (loading) {
    return (
      <Page>
        <h1>Loading vendor…</h1>
      </Page>
    );
  }

  if (error || !data?.vendor) {
    return (
      <Page>
        <h1>{data?.vendor ? "Error" : "Vendor not found"}</h1>
        {error && <p style={{ color: GP.neonRed }}>{error}</p>}
      </Page>
    );
  }

  // Extract fields with guards
  const { vendor, org, policies = [], alerts = [], engine, metrics = {} } = data;

  const primaryPolicy = policies?.[0] || null;

  const critical = (alerts || []).filter((a) => a.severity === "critical");
  const high = (alerts || []).filter((a) => a.severity === "high");

  const score =
    engine?.failedCount > 0
      ? Math.max(0, 100 - engine.failedCount * 5)
      : 100;

  // ⭐ NEW CONTRACT FIELDS
  const contractJson = vendor.contract_json || null;
  const contractScore = vendor.contract_score || null;
  const contractRequirements = vendor.contract_requirements || [];
  const contractMismatches = vendor.contract_mismatches || [];

  return (
    <Page>
      {/* HEADER */}
      <div style={headerRow}>
        <div>
          <div style={breadcrumb}>
            <a href="/vendors" style={{ color: GP.neonBlue }}>Vendors</a>
            <span>/</span>
            <span>{vendor.name}</span>
          </div>

          <h1 style={title}>
            Vendor Overview:{" "}
            <span style={titleGradient}>{vendor.name}</span>
          </h1>

          {org && (
            <p style={orgText}>
              Org: <span style={{ color: GP.text }}>{org.name}</span>
            </p>
          )}
        </div>

        {/* ACTION BUTTONS */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Button
            label="Upload COI"
            onClick={() => router.push(`/upload-coi?vendorId=${vendor.id}`)}
            color={GP.neonGold}
          />

          <Button
            label="Profile"
            onClick={() => router.push(`/admin/vendor/${vendor.id}/profile`)}
            color={GP.neonPurple}
          />

          <Button
            label="Fix Cockpit"
            onClick={() => router.push(`/admin/vendor/${vendor.id}/fix`)}
            color={GP.neonBlue}
          />

          <Button
            label="Review Contract (AI)"
            onClick={() =>
              router.push(`/admin/contracts/review?vendorId=${vendor.id}`)
            }
            color={GP.neonGreen}
          />
        </div>
      </div>

      {/* SNAPSHOT */}
      <div style={snapshotGrid}>
        <SnapCard label="Engine Score" value={score} color={GP.neonGreen} />
        <SnapCard label="Critical Alerts" value={critical.length} color={GP.neonRed} />
        <SnapCard label="High Alerts" value={high.length} color={GP.neonGold} />
        <SnapCard label="Coverage Types" value={metrics.coverageTypes} color={GP.neonBlue} />
        <SnapCard label="Expired Policies" value={metrics.expiredPolicies} color={GP.neonRed} />
      </div>

      {/* ============================================================
          RENEWAL INTELLIGENCE (Static Empty States)
      ============================================================ */}

      <Section>
        <h2 style={sectionTitle}>Renewal Status</h2>
        <div style={{ fontSize: 13, color: GP.textSoft }}>
          {primaryPolicy?.expiration_date ? (
            <>Policy expires: <span style={{ color: GP.neonGold }}>{primaryPolicy.expiration_date}</span></>
          ) : (
            "No expiration date set for primary policy."
          )}
        </div>
      </Section>

      <Section>
        <h2 style={sectionTitle}>Renewal Predictions</h2>
        <div style={{ fontSize: 13, color: GP.textSoft }}>
          Renewal predictions coming soon.
        </div>
      </Section>

      <Section>
        <h2 style={sectionTitle}>Renewal Communication Log</h2>
        <div style={{ fontSize: 13, color: GP.textSoft }}>
          No renewal history yet.
        </div>
      </Section>

      <Section>
        <h2 style={sectionTitle}>Renewal Timeline</h2>
        <div style={{ fontSize: 13, color: GP.textSoft }}>
          No renewal events logged for this vendor yet.
        </div>
      </Section>

      {/* ⭐ ============================================================
            CONTRACT INTELLIGENCE V3 PANEL
      ============================================================ */}
      <Section>
        <h2 style={sectionTitle}>Contract Intelligence</h2>

        {!contractJson ? (
          <div style={{ fontSize: 13, color: GP.textSoft }}>
            No contract uploaded for this vendor yet.
          </div>
        ) : (
          <>
            {/* SCORE + BUTTON */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <div>
                <div style={{ fontSize: 12, color: GP.textSoft }}>
                  AI Contract Score
                </div>
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 700,
                    background:
                      contractScore >= 80
                        ? "linear-gradient(120deg,#22c55e,#bef264)"
                        : contractScore >= 60
                        ? "linear-gradient(120deg,#facc15,#fde68a)"
                        : "linear-gradient(120deg,#fb7185,#fecaca)",
                    WebkitBackgroundClip: "text",
                    color: "transparent",
                  }}
                >
                  {contractScore ?? "—"}
                </div>
              </div>

              <Button
                label="Review Contract (AI)"
                onClick={() =>
                  router.push(`/admin/contracts/review?vendorId=${vendor.id}`)
                }
                color={GP.neonGreen}
              />
            </div>

            {/* SUMMARY */}
            {contractJson.summary && (
              <div
                style={{
                  marginBottom: 12,
                  padding: 12,
                  borderRadius: 14,
                  background: "rgba(15,23,42,0.9)",
                  border: "1px solid rgba(148,163,184,0.4)",
                  fontSize: 13,
                  color: GP.textSoft,
                  whiteSpace: "pre-wrap",
                }}
              >
                {contractJson.summary}
              </div>
            )}

            {/* REQUIREMENTS */}
            {contractRequirements.length > 0 && (
              <>
                <h4
                  style={{
                    color: GP.neonBlue,
                    fontSize: 14,
                    marginBottom: 6,
                  }}
                >
                  Required Coverages & Minimums
                </h4>

                {contractRequirements.map((r, idx) => (
                  <div
                    key={idx}
                    style={{
                      marginBottom: 6,
                      padding: 8,
                      borderRadius: 10,
                      background: "rgba(15,23,42,0.85)",
                      border: "1px solid rgba(51,65,85,0.7)",
                    }}
                  >
                    <strong style={{ color: GP.text }}>{r.label}:</strong>{" "}
                    <span style={{ color: GP.neonGold }}>{r.value}</span>
                  </div>
                ))}
              </>
            )}

            {/* MISMATCHES */}
            {contractMismatches.length > 0 && (
              <>
                <h4
                  style={{
                    color: GP.neonRed,
                    fontSize: 14,
                    marginTop: 14,
                    marginBottom: 6,
                  }}
                >
                  Coverage Mismatches
                </h4>

                {contractMismatches.map((m, idx) => (
                  <div
                    key={idx}
                    style={{
                      marginBottom: 8,
                      padding: 10,
                      borderRadius: 10,
                      background: "rgba(127,29,29,0.35)",
                      border: "1px solid rgba(248,113,113,0.6)",
                      fontSize: 12,
                      color: GP.textSoft,
                    }}
                  >
                    <strong style={{ color: GP.neonRed }}>{m.label}:</strong>{" "}
                    {m.message}
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </Section>

      {/* ============================================================
          POLICIES TABLE
      ============================================================ */}
      <Section>
        <h2 style={sectionTitle}>Policies</h2>

        {(!policies || policies.length === 0) && (
          <p style={{ color: GP.textSoft }}>No policies found for this vendor.</p>
        )}

        {policies?.length > 0 && (
          <div style={policyTableShell}>
            <table style={policyTable}>
              <thead>
                <tr>
                  <th style={th}>Policy #</th>
                  <th style={th}>Carrier</th>
                  <th style={th}>Coverage</th>
                  <th style={th}>Expires</th>
                </tr>
              </thead>

              <tbody>
                {policies.map((p) => (
                  <tr key={p.id} style={policyRow}>
                    <td style={td}>{p.policy_number || "—"}</td>
                    <td style={td}>{p.carrier || "—"}</td>
                    <td style={td}>{p.coverage_type || "—"}</td>
                    <td style={td}>{p.expiration_date || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </Page>
  );
}

/* ============================================================
   COMPONENTS + STYLES
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

function Button({ label, onClick, color }) {
  return (
    <button
      onClick={onClick}
      style={{
        borderRadius: 999,
        padding: "8px 14px",
        border: `1px solid ${color}`,
        background: "rgba(15,23,42,0.9)",
        color,
        fontSize: 12,
        fontWeight: 500,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
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

function Section({ children }) {
  return (
    <div
      style={{
        marginTop: 30,
        padding: 20,
        borderRadius: 20,
        background: GP.panel,
        border: `1px solid ${GP.border}`,
      }}
    >
      {children}
    </div>
  );
}

const headerRow = {
  display: "flex",
  alignItems: "flex-start",
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

const orgText = {
  marginTop: 4,
  fontSize: 13,
  color: GP.textSoft,
};

const snapshotGrid = {
  marginTop: 20,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 14,
};

const sectionTitle = {
  margin: 0,
  marginBottom: 8,
  fontSize: 16,
  fontWeight: 600,
  color: GP.text,
};

const policyTableShell = {
  borderRadius: 18,
  border: "1px solid rgba(30,41,59,0.95)",
  background: "rgba(15,23,42,0.98)",
  overflow: "hidden",
};

const policyTable = {
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: 0,
  fontSize: 12,
};

const policyRow = {
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
