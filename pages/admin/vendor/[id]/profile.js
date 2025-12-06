// pages/admin/vendor/[id]/profile.js
// =============================================================
// VENDOR INTELLIGENCE PROFILE — FULL V5 UPGRADE
//
// Pulls from:
//   • /api/admin/vendor/overview (existing)
//   • /api/engine/run-v3 (V5 engine)
//   • /api/coverage/intel-v2 (Coverage Intelligence Engine V2)
//   • /api/vendor/fix-plan-v5 (AI Fix Plan Generator)
//   • alerts table (via overview.alerts)
//
// Provides:
//   • Rule engine actions
//   • Fix plan generator panel
//   • Coverage intel panel
//   • V5 alerts panel & severity grouping
// =============================================================

import { useRouter } from "next/router";
import { useEffect, useState } from "react";

const GP = {
  bg: "#020617",
  panel: "rgba(15,23,42,0.98)",
  border: "rgba(51,65,85,0.9)",
  neonBlue: "#38bdf8",
  neonGreen: "#22c55e",
  neonGold: "#facc15",
  neonRed: "#fb7185",
  text: "#e5e7eb",
  textSoft: "#9ca3af",
  textMuted: "#64748b",
};

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

export default function AdminVendorProfile() {
  const router = useRouter();
  const { id } = router.query;

  // EXISTING PROFILE OVERVIEW
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");

  // EMAIL STATE
  const [emailSending, setEmailSending] = useState(false);
  const [emailMessage, setEmailMessage] = useState("");

  // RULE ENGINE V5 STATE
  const [engineRunning, setEngineRunning] = useState(false);
  const [engineMessage, setEngineMessage] = useState("");

  // COVERAGE INTELLIGENCE V2 STATE
  const [intel, setIntel] = useState(null);
  const [intelLoading, setIntelLoading] = useState(true);

  // FIX PLAN V5 STATE
  const [fixPlan, setFixPlan] = useState(null);
  const [fixPlanLoading, setFixPlanLoading] = useState(false);
  const [fixPlanError, setFixPlanError] = useState("");

  // ============================================================
  // LOAD PROFILE OVERVIEW (existing API)
  // ============================================================
  useEffect(() => {
    if (!id) return;
    async function load() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`/api/admin/vendor/overview?id=${id}`);
        const json = await res.json();
        if (!json.ok) throw new Error(json.error || "Failed to load vendor profile.");

        setOverview(json);
      } catch (err) {
        console.error("[VendorProfile] load error:", err);
        setError(err.message || "Failed to load vendor profile.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);


  // ============================================================
  // LOAD COVERAGE INTELLIGENCE V2
  // ============================================================
  useEffect(() => {
    if (!overview?.vendor || !overview?.org) return;

    async function loadIntel() {
      try {
        setIntelLoading(true);
        const res = await fetch(
          `/api/coverage/intel-v2?vendorId=${overview.vendor.id}&orgId=${overview.org.id}`
        );
        const json = await res.json();
        if (json.ok) setIntel(json);
      } catch (err) {
        console.error("[IntelV2] load error:", err);
      } finally {
        setIntelLoading(false);
      }
    }

    loadIntel();
  }, [overview]);


  // ============================================================
  // RUN RULE ENGINE V5
  // ============================================================
  async function handleRunEngineV5() {
    if (!overview?.vendor || !overview?.org) return;
    try {
      setEngineRunning(true);
      setEngineMessage("");

      const res = await fetch("/api/engine/run-v3", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId: overview.vendor.id,
          orgId: overview.org.id,
          dryRun: false,
        }),
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "V5 engine failed.");

      setEngineMessage(
        `Rule Engine V5 complete — ${json.failedCount} failing rules.`
      );

      // Reload overview + intel
      const updated = await fetch(`/api/admin/vendor/overview?id=${overview.vendor.id}`);
      const updatedJson = await updated.json();
      if (updatedJson.ok) setOverview(updatedJson);

      const intelRes = await fetch(
        `/api/coverage/intel-v2?vendorId=${overview.vendor.id}&orgId=${overview.org.id}`
      );
      const intelJson = await intelRes.json();
      if (intelJson.ok) setIntel(intelJson);

    } catch (err) {
      console.error("[RunV5 ERROR]:", err);
      setEngineMessage(err.message || "Failed to run Rule Engine V5.");
    } finally {
      setEngineRunning(false);
    }
  }


  // ============================================================
  // GENERATE FIX PLAN (V5)
  // ============================================================
  async function handleFixPlan() {
    if (!overview?.vendor || !overview?.org) return;

    try {
      setFixPlanLoading(true);
      setFixPlanError("");
      setFixPlan(null);

      const res = await fetch("/api/vendor/fix-plan-v5", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId: overview.vendor.id,
          orgId: overview.org.id,
        }),
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed to generate fix plan.");

      setFixPlan(json.plan);
    } catch (err) {
      console.error("[FixPlanV5 ERROR]:", err);
      setFixPlanError(err.message || "Fix plan generation failed.");
    } finally {
      setFixPlanLoading(false);
    }
  }


  // ============================================================
  // EMAIL SEND LOGIC (unchanged)
  // ============================================================
  async function handleSendEmail(type) {
    if (!overview?.vendor) return;

    try {
      setEmailSending(true);
      setEmailMessage("");

      let payload = { vendorId: overview.vendor.id };

      switch (type) {
        case "request":
          payload.template = "upload-request";
          break;

        case "fix":
          payload.template = "fix-issues";
          payload.issues = overview.alerts || [];
          break;

        case "renewal":
          payload.template = "renewal-reminder";
          payload.expirationDate = overview.metrics?.expirationDate || null;
          break;

        default:
          throw new Error("Unknown email action.");
      }

      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Email send failed");

      setEmailMessage(json.message || "Email sent successfully.");
    } catch (err) {
      setEmailMessage(err.message || "Failed to send email.");
    } finally {
      setEmailSending(false);
    }
  }
/* ============================================================
   LOADING + ERROR UI
============================================================ */
if (loading) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: GP.bg,
        color: GP.textSoft,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 14,
      }}
    >
      Loading vendor profile…
    </div>
  );
}

if (error || !overview) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: GP.bg,
        color: GP.text,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: 24,
      }}
    >
      <div>
        <div style={{ fontSize: 42, marginBottom: 8 }}>⚠️</div>
        <div style={{ fontSize: 16 }}>{error || "Vendor profile not found."}</div>
      </div>
    </div>
  );
}

/* Extract profile data */
const { vendor, org, alerts = [], timeline = [], portalToken } = overview;

/* V5 ALERTS (from `alerts` table) */
const criticalAlerts = alerts.filter((a) => a.severity === "critical");
const highAlerts = alerts.filter((a) => a.severity === "high");
const mediumAlerts = alerts.filter((a) => a.severity === "medium");
const lowAlerts = alerts.filter((a) => a.severity === "low");

/* Coverage Intel V2 */
const coverageMap = intel?.coverageMap || {};
const failuresByCoverage = intel?.failuresByCoverage || {};

/* Fix Plan V5 */
const fixSections = fixPlan?.sections || [];

return (
  <div
    style={{
      minHeight: "100vh",
      background: GP.bg,
      color: GP.text,
      padding: "28px 24px",
    }}
  >
    <div style={{ maxWidth: 1300, margin: "0 auto" }}>

      {/* ============================================================
          HEADER
      ============================================================ */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 28,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 0.15,
              color: GP.textSoft,
            }}
          >
            Admin · Vendor Profile
          </div>

          <h1
            style={{
              margin: "4px 0 6px 0",
              fontSize: 28,
              background: "linear-gradient(90deg,#38bdf8,#a855f7,#22c55e)",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            {vendor?.vendor_name || vendor?.name || "Vendor"}
          </h1>

          <div style={{ fontSize: 13, color: GP.textSoft }}>
            Organization:{" "}
            <span style={{ color: GP.text }}>{org?.name || "Unknown org"}</span>
          </div>

          {portalToken && (
            <div style={{ marginTop: 4, fontSize: 11, color: GP.textSoft }}>
              Portal link token:{" "}
              <code
                style={{
                  background: "rgba(15,23,42,0.9)",
                  padding: "2px 6px",
                  borderRadius: 6,
                  border: `1px solid ${GP.border}`,
                }}
              >
                {portalToken}
              </code>
            </div>
          )}
        </div>

        {/* SUMMARY BLOCK */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            alignSelf: "flex-start",
          }}
        >
          <SummaryCard
            label="Open Alerts"
            value={alerts.length}
            color={GP.neonBlue}
          />
          <SummaryCard
            label="Critical"
            value={criticalAlerts.length}
            color={GP.neonRed}
          />
          <SummaryCard
            label="High"
            value={highAlerts.length}
            color={GP.neonGold}
          />
          <SummaryCard
            label="Coverage Types"
            value={Object.keys(coverageMap).length}
            color={GP.neonGreen}
          />
          <SummaryCard
            label="Last Activity"
            value={formatDateTime(overview.metrics?.lastActivity)}
            color={GP.textSoft}
            small
          />
        </div>
      </div>

      {/* ============================================================
          PAGE GRID
      ============================================================ */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1.5fr) minmax(0,1.1fr)",
          gap: 24,
        }}
      >

        {/* ============================================================
            LEFT COLUMN — ALERTS + COVERAGE INTEL + FIX PLAN
        ============================================================ */}
        <div>

          {/* ALERTS PANEL */}
          <Panel title="Alerts (V5 Engine)" borderColor={GP.border}>
            {alerts.length === 0 ? (
              <Empty text="No open alerts for this vendor." />
            ) : (
              <AlertGrid
                critical={criticalAlerts}
                high={highAlerts}
                medium={mediumAlerts}
                low={lowAlerts}
              />
            )}
          </Panel>

          {/* COVERAGE INTELLIGENCE V2 PANEL */}
          <Panel title="Coverage Intelligence V2" borderColor={GP.neonBlue}>
            {intelLoading ? (
              <Empty text="Loading coverage intelligence…" />
            ) : (
              <CoverageIntelSection
                coverageMap={coverageMap}
                failuresByCoverage={failuresByCoverage}
              />
            )}
          </Panel>

          {/* FIX PLAN PANEL */}
          <Panel title="AI Fix Plan (V5)" borderColor={GP.neonGold}>
            <button
              onClick={handleFixPlan}
              disabled={fixPlanLoading}
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                border: `1px solid ${GP.neonGold}`,
                background: "rgba(250,204,21,0.12)",
                color: GP.neonGold,
                fontSize: 13,
                cursor: fixPlanLoading ? "not-allowed" : "pointer",
                marginBottom: 12,
              }}
            >
              ⚡ Generate Fix Plan
            </button>

            {fixPlanLoading && <Empty text="Generating fix plan…" />}

            {fixPlanError && <Empty text={fixPlanError} />}

            {fixPlan && (
              <FixPlanViewer fixPlan={fixPlan} />
            )}
          </Panel>

          {/* TIMELINE PANEL */}
          <Panel title="Activity Timeline" borderColor={GP.textSoft}>
            {timeline.length === 0 ? (
              <Empty text="No recorded activity yet." />
            ) : (
              <TimelineList items={timeline} />
            )}
          </Panel>
        </div>

        {/* ============================================================
            RIGHT COLUMN — COMPLIANCE SNAPSHOT + ACTIONS + NOTES
        ============================================================ */}
        <div>

          {/* COMPLIANCE SNAPSHOT */}
          <Panel title="Compliance Snapshot" borderColor={GP.neonGreen}>
            <ComplianceSnapshot alerts={alerts} />
          </Panel>

          {/* QUICK ACTIONS */}
          <Panel title="Quick Actions" borderColor={GP.neonBlue}>
            <ActionButtons
              onSendEmail={handleSendEmail}
              onRunEngine={handleRunEngineV5}
              emailSending={emailSending}
              engineRunning={engineRunning}
              emailMessage={emailMessage}
              engineMessage={engineMessage}
            />
          </Panel>

          {/* NOTES */}
          <Panel title="Internal Notes" borderColor={GP.textSoft}>
            <textarea
              rows={4}
              placeholder="Example: Approved exception for GL limit based on broker letter…"
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 8,
                border: `1px solid ${GP.border}`,
                background: GP.panel,
                color: GP.text,
                fontSize: 12,
                resize: "vertical",
              }}
            />
          </Panel>
        </div>
      </div>
    </div>
  </div>
);
/* ============================================================
   SUPPORTING COMPONENTS FOR SECTION 2 UI
============================================================ */

/* ---------------- PANEL WRAPPER ---------------- */
function Panel({ title, borderColor, children }) {
  return (
    <div
      style={{
        borderRadius: 16,
        padding: 16,
        border: `1px solid ${borderColor}`,
        background: GP.panel,
        marginBottom: 22,
      }}
    >
      <h3
        style={{
          margin: 0,
          marginBottom: 12,
          fontSize: 15,
          color: GP.text,
        }}
      >
        {title}
      </h3>

      {children}
    </div>
  );
}

/* ---------------- EMPTY STATE ---------------- */
function Empty({ text }) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 10,
        background: "rgba(15,23,42,0.7)",
        border: `1px dashed ${GP.border}`,
        color: GP.textSoft,
        textAlign: "center",
        fontSize: 13,
      }}
    >
      {text}
    </div>
  );
}

/* ---------------- SUMMARY CARD ---------------- */
function SummaryCard({ label, value, color, small }) {
  return (
    <div
      style={{
        minWidth: small ? 120 : 130,
        padding: "10px 12px",
        borderRadius: 14,
        border: `1px solid ${color}55`,
        background: "rgba(15,23,42,0.85)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: GP.textSoft,
          marginBottom: 2,
          textTransform: "uppercase",
          letterSpacing: 0.4,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: small ? 12 : 18,
          fontWeight: 600,
          color,
        }}
      >
        {value || "—"}
      </div>
    </div>
  );
}

/* ---------------- ALERT GRID ---------------- */

function AlertGrid({ critical, high, medium, low }) {
  const renderGroup = (label, alerts, color, bg) => {
    if (!alerts?.length) return null;
    return (
      <div
        style={{
          borderRadius: 12,
          padding: 12,
          border: `1px solid ${color}AA`,
          background: bg,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            marginBottom: 4,
            color,
          }}
        >
          {label} ({alerts.length})
        </div>

        {alerts.map((a, idx) => (
          <div
            key={idx}
            style={{
              padding: "4px 0",
              fontSize: 12,
              borderBottom:
                idx < alerts.length - 1 ? "1px solid rgba(148,163,184,0.1)" : "none",
            }}
          >
            <div style={{ fontWeight: 600, color }}>{a.code}</div>
            <div style={{ color: GP.textSoft }}>{a.message}</div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
        gap: 12,
      }}
    >
      {renderGroup("Critical Alerts", critical, GP.neonRed, "rgba(127,29,29,0.35)")}
      {renderGroup("High Alerts", high, GP.neonGold, "rgba(120,53,15,0.35)")}
      {renderGroup("Medium Alerts", medium, GP.neonBlue, "rgba(30,58,138,0.25)")}
      {renderGroup("Low Alerts", low, GP.neonGreen, "rgba(20,83,45,0.25)")}
    </div>
  );
}

/* ---------------- COVERAGE INTELLIGENCE BLOCK ---------------- */

function CoverageIntelSection({ coverageMap, failuresByCoverage }) {
  const groups = Object.keys(coverageMap);

  if (!groups.length) {
    return <Empty text="No policies for this vendor." />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {groups.map((coverage) => {
        const c = coverageMap[coverage];
        const fails = failuresByCoverage[coverage] || [];

        return (
          <div
            key={coverage}
            style={{
              borderRadius: 14,
              padding: 12,
              border: `1px solid ${GP.border}`,
              background: "rgba(15,23,42,0.94)",
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 6,
                color: GP.neonBlue,
                textTransform: "capitalize",
              }}
            >
              {coverage}
            </div>

            <div style={{ fontSize: 12, color: GP.textSoft, marginBottom: 6 }}>
              Policies: <strong style={{ color: GP.text }}>{c.count}</strong> — Expired:{" "}
              <strong style={{ color: GP.neonRed }}>{c.expired}</strong>
            </div>

            {fails.length === 0 ? (
              <div
                style={{
                  fontSize: 12,
                  color: GP.neonGreen,
                  marginTop: 6,
                }}
              >
                ✔ No rule failures for this coverage.
              </div>
            ) : (
              <div
                style={{
                  marginTop: 6,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                {fails.map((f, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: 8,
                      borderRadius: 8,
                      background: "rgba(120,53,15,0.25)",
                      border: `1px solid ${GP.neonGold}`,
                      color: GP.text,
                      fontSize: 12,
                    }}
                  >
                    <div style={{ fontWeight: 600, color: GP.neonGold }}>
                      Rule #{f.rule_id}
                    </div>
                    <div style={{ color: GP.textSoft }}>{f.message}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- FIX PLAN VIEWER ---------------- */

function FixPlanViewer({ fixPlan }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Summary */}
      <div
        style={{
          padding: 12,
          borderRadius: 10,
          background: "rgba(15,23,42,0.9)",
          border: `1px solid ${GP.neonGold}55`,
          color: GP.text,
          fontSize: 13,
        }}
      >
        {fixPlan.summary}
      </div>

      {/* Sections */}
      {fixPlan.sections.map((sec, idx) => (
        <div
          key={idx}
          style={{
            padding: 12,
            borderRadius: 12,
            border: `1px solid ${GP.neonBlue}`,
            background: "rgba(15,23,42,0.95)",
          }}
        >
          <div
            style={{
              fontSize: 14,
              color: GP.neonBlue,
              marginBottom: 6,
              fontWeight: 600,
            }}
          >
            {sec.coverageType} — {sec.priority.toUpperCase()}
          </div>

          {sec.issues.map((iss, i2) => (
            <div
              key={i2}
              style={{
                padding: 8,
                borderRadius: 8,
                border: `1px solid ${GP.border}`,
                background: "rgba(2,6,23,0.7)",
                marginBottom: 6,
                fontSize: 12,
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                Rule #{iss.ruleId}
              </div>
              <div style={{ color: GP.textSoft, marginBottom: 4 }}>
                {iss.description}
              </div>
              <div style={{ color: GP.neonGreen, marginBottom: 4 }}>
                Required change: {iss.requiredChange}
              </div>
              <div style={{ color: GP.text, marginBottom: 2 }}>
                Notes for vendor: {iss.notesForVendor}
              </div>
              <div style={{ color: GP.neonBlue }}>
                Notes for broker: {iss.notesForBroker}
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* Email Outputs */}
      <div
        style={{
          marginTop: 10,
          fontSize: 12,
          color: GP.textSoft,
        }}
      >
        <strong>Email Subject:</strong>
        <div style={{ color: GP.text }}>{fixPlan.emailSubject}</div>

        <br />

        <strong>Email Body (Vendor):</strong>
        <pre
          style={{
            background: "rgba(15,23,42,0.9)",
            padding: 10,
            borderRadius: 8,
            whiteSpace: "pre-wrap",
            color: GP.text,
          }}
        >
{fixPlan.emailBodyForVendor}
        </pre>

        <strong>Email Body (Broker):</strong>
        <pre
          style={{
            background: "rgba(15,23,42,0.9)",
            padding: 10,
            borderRadius: 8,
            whiteSpace: "pre-wrap",
            color: GP.text,
          }}
        >
{fixPlan.emailBodyForBroker}
        </pre>
      </div>
    </div>
  );
}

/* ---------------- TIMELINE LIST ---------------- */

function TimelineList({ items }) {
  return (
    <div
      style={{
        maxHeight: 260,
        overflowY: "auto",
        paddingRight: 4,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {items.map((item, idx) => (
        <div
          key={idx}
          style={{
            padding: 10,
            borderRadius: 10,
            background: "rgba(15,23,42,0.98)",
            border: `1px solid rgba(148,163,184,0.4)`,
            fontSize: 12,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              marginBottom: 2,
              textTransform: "uppercase",
              color:
                item.severity === "critical"
                  ? GP.neonRed
                  : item.severity === "warning"
                  ? GP.neonGold
                  : GP.neonBlue,
            }}
          >
            {item.action?.replace(/_/g, " ") || "Event"}
          </div>

          <div style={{ color: GP.textSoft }}>{item.message}</div>

          <div
            style={{
              marginTop: 4,
              fontSize: 11,
              color: GP.textMuted,
            }}
          >
            {formatDateTime(item.created_at)}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- COMPLIANCE SNAPSHOT ---------------- */

function ComplianceSnapshot({ alerts }) {
  if (!alerts.length) {
    return (
      <div style={{ fontSize: 13, color: GP.neonGreen }}>
        ✔ No active alerts. Vendor appears compliant.
      </div>
    );
  }

  const critical = alerts.filter((a) => a.severity === "critical").length;
  const high = alerts.filter((a) => a.severity === "high").length;
  const med = alerts.filter((a) => a.severity === "medium").length;

  return (
    <div style={{ fontSize: 13, lineHeight: 1.5 }}>
      {critical > 0 && (
        <div style={{ color: GP.neonRed }}>
          ⚠ {critical} critical compliance issues detected.
        </div>
      )}
      {high > 0 && (
        <div style={{ color: GP.neonGold }}>
          ⚠ {high} high-severity issues detected.
        </div>
      )}
      {med > 0 && (
        <div style={{ color: GP.neonBlue }}>
          ℹ {med} medium-severity items identified.
        </div>
      )}
      <div style={{ color: GP.textSoft }}>
        Review coverage intel and fix plan for resolution steps.
      </div>
    </div>
  );
}

/* ---------------- ACTION BUTTONS ---------------- */

function ActionButtons({
  onSendEmail,
  onRunEngine,
  emailSending,
  engineRunning,
  emailMessage,
  engineMessage,
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <button
        onClick={() => onSendEmail("request")}
        disabled={emailSending}
        style={{
          padding: "8px 12px",
          borderRadius: 999,
          border: `1px solid ${GP.neonBlue}`,
          background: "rgba(56,189,248,0.2)",
          color: GP.neonBlue,
          cursor: emailSending ? "not-allowed" : "pointer",
          fontSize: 13,
        }}
      >
        📩 Request COI Upload
      </button>

      <button
        onClick={() => onSendEmail("fix")}
        disabled={emailSending}
        style={{
          padding: "8px 12px",
          borderRadius: 999,
          border: `1px solid ${GP.neonGold}`,
          background: "rgba(250,204,21,0.15)",
          color: GP.neonGold,
          cursor: emailSending ? "not-allowed" : "pointer",
          fontSize: 13,
        }}
      >
        ⚠️ Send Fix Issues Email
      </button>

      <button
        onClick={() => onSendEmail("renewal")}
        disabled={emailSending}
        style={{
          padding: "8px 12px",
          borderRadius: 999,
          border: `1px solid ${GP.neonGreen}`,
          background: "rgba(34,197,94,0.2)",
          color: GP.neonGreen,
          cursor: emailSending ? "not-allowed" : "pointer",
          fontSize: 13,
        }}
      >
        ⏰ Renewal Reminder
      </button>

      <button
        onClick={onRunEngine}
        disabled={engineRunning}
        style={{
          padding: "8px 12px",
          borderRadius: 999,
          border: `1px solid ${GP.neonBlue}`,
          background: "rgba(99,102,241,0.2)",
          color: "#c084fc",
          cursor: engineRunning ? "not-allowed" : "pointer",
          fontSize: 13,
        }}
      >
        ⚙️ Run Rule Engine V5
      </button>

      {(emailMessage || engineMessage) && (
        <div style={{ fontSize: 12, color: GP.textSoft }}>
          {emailMessage || engineMessage}
        </div>
      )}
    </div>
  );
}
