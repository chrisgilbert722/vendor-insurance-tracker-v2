// pages/admin/vendor/[id].js
import { useRouter } from "next/router";
import { useMemo, useState, useEffect } from "react";

/* ===========================
   THEME TOKENS
=========================== */
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
  inkSoft: "#64748B",
  surface: "#020617",
  border: "#1E293B",
};

/* ===========================
   COMPONENT: Vendor Profile Page
=========================== */
export default function VendorProfilePage() {
  const router = useRouter();
  const { id } = router.query;

  // MAIN VENDOR OBJECT
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  // LIVE ALERTS FOR THIS VENDOR
  const [vendorAlerts, setVendorAlerts] = useState([]);

  // Default summary if backend hasn't populated yet
  const defaultSummary = {
    total: 0,
    passed: 0,
    failed: 0,
    byType: {
      coverage: { passed: 0, failed: 0 },
      endorsements: { passed: 0, failed: 0 },
      documents: { passed: 0, failed: 0 },
      logical: { passed: 0, failed: 0 },
    },
  };

  /* ============================================================
     LOAD LIVE VENDOR DATA
     Normalized so UI NEVER breaks even if fields are missing
  ============================================================ */
  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    async function loadVendor() {
      try {
        setLoading(true);
        setLoadError("");

        const res = await fetch(`/api/vendors/${id}`);
        if (!res.ok) throw new Error(`API returned ${res.status}`);

        const data = await res.json();
        if (!data.ok || !data.vendor) throw new Error("Missing vendor");

        const v = data.vendor;

        // ⭐ Full normalization for safety
        const normalized = {
          ...v,
          name: v.name || "Unnamed Vendor",
          category: v.category || "General Services",
          location: v.location || v.address || "",
          contactEmail: v.contactEmail || v.email || "",

          tags: Array.isArray(v.tags) ? v.tags : [],

          complianceScore: v.complianceScore ?? 0,
          status: v.status || "Unknown",
          riskLevel: v.riskLevel || "Medium",
          alertsOpen: v.alertsOpen ?? 0,
          criticalIssues: v.criticalIssues ?? 0,

          lastUpdated: v.lastUpdated || new Date().toISOString(),

          coverage: Array.isArray(v.coverage) ? v.coverage : [],
          endorsements: Array.isArray(v.endorsements) ? v.endorsements : [],
          documents: Array.isArray(v.documents) ? v.documents : [],
          rulesFired: Array.isArray(v.rulesFired) ? v.rulesFired : [],
          timeline: Array.isArray(v.timeline) ? v.timeline : [],

          requirementsSummary: v.requirementsSummary || defaultSummary,
        };

        if (!cancelled) setVendor(normalized);
      } catch (err) {
        console.error("Vendor API error: ", err);

        if (!cancelled) {
          setLoadError("Using demo vendor profile until real data is wired.");
          // fallback demo vendor
          setVendor({
            id: "demo",
            name: "Demo Vendor",
            category: "General Services",
            location: "Unknown",
            tags: [],
            contactEmail: "",
            complianceScore: 0,
            status: "Unknown",
            riskLevel: "Medium",
            alertsOpen: 0,
            criticalIssues: 0,
            lastUpdated: new Date().toISOString(),
            coverage: [],
            endorsements: [],
            documents: [],
            rulesFired: [],
            timeline: [],
            requirementsSummary: defaultSummary,
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadVendor();
    return () => {
      cancelled = true;
    };
  }, [id]);


  /* ============================================================
     LOAD LIVE ALERTS FOR THIS VENDOR
     Filters by vendor.name or vendor.id
  ============================================================ */
  useEffect(() => {
    if (!vendor?.name) return;

    async function loadVendorAlerts() {
      try {
        const res = await fetch(`/api/alerts/list?orgId=2`);
        const data = await res.json();

        if (data.ok && Array.isArray(data.alerts)) {
          const filtered = data.alerts.filter((a) => {
            const matchName =
              a.vendorName?.toLowerCase() === vendor.name.toLowerCase();
            const matchId = a.vendorId && a.vendorId == vendor.id;
            return matchName || matchId;
          });

          const processed = filtered.map((a) => ({
            ...a,
            severity:
              a.severity ||
              (a.type === "rule_failure" &&
              a.message?.includes("Critical")
                ? "Critical"
                : a.type === "rule_failure" &&
                  a.message?.includes("High")
                ? "High"
                : a.type === "rule_failure"
                ? "Medium"
                : a.type === "requirement_failure"
                ? "High"
                : "Low"),
          }));

          setVendorAlerts(processed);
        }
      } catch (err) {
        console.error("Failed to load vendor alerts:", err);
      }
    }

    loadVendorAlerts();
  }, [vendor]);


  // LOADING STATE
  if (!vendor) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background:
            "radial-gradient(circle at top left,#020617 0,#020617 45%,#000000 100%)",
          padding: "32px 40px 40px",
          color: "white",
          fontFamily:
            "-apple-system,BlinkMacSystemFont,system-ui,Segoe UI,sans-serif",
        }}
      >
        {loading ? "Loading vendor profile…" : "Vendor not found."}
      </div>
    );
  }
  /* ============================================================
     HEADER SECTION
  ============================================================ */
  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left,#020617 0,#020617 45%,#000000 100%)",
        padding: "32px 40px 40px",
        color: "white",
        fontFamily:
          "-apple-system,BlinkMacSystemFont,system-ui,Segoe UI,sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 24,
          marginBottom: 24,
        }}
      >
        {/* ===========================
            LEFT — Vendor Identity + AI Summary
        ============================ */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "4px 10px",
              borderRadius: 999,
              border: "1px solid rgba(148,163,184,0.45)",
              background:
                "linear-gradient(90deg,rgba(15,23,42,0.95),rgba(15,23,42,0.35))",
              marginBottom: 10,
            }}
          >
            <span
              style={{
                width: 26,
                height: 26,
                borderRadius: "999px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background:
                  "radial-gradient(circle at 30% 0,#38bdf8,#4f46e5,#0f172a)",
                boxShadow: "0 0 28px rgba(96,165,250,0.7)",
                fontSize: 15,
              }}
            >
              {vendor.name?.[0] || "V"}
            </span>

            <span
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 1.3,
                color: "#e5e7eb",
              }}
            >
              Vendor Compliance Profile
            </span>

            <span
              style={{
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: 1,
                color: "#a5b4fc",
              }}
            >
              Rules · Requirements · Alerts
            </span>
          </div>

          {/* Vendor name + category */}
          <h1
            style={{
              fontSize: 26,
              fontWeight: 600,
              margin: 0,
              letterSpacing: 0.1,
            }}
          >
            {vendor.name}{" "}
            <span
              style={{
                fontSize: 14,
                color: "#9ca3af",
                fontWeight: 400,
              }}
            >
              · {vendor.category}
            </span>
          </h1>

          {/* Location + Tags */}
          <div
            style={{
              marginTop: 6,
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
              fontSize: 11,
            }}
          >
            {vendor.location && (
              <span style={{ color: "#9ca3af" }}>{vendor.location}</span>
            )}

            {vendor.tags?.map((tag) => (
              <span
                key={tag}
                style={{
                  padding: "2px 8px",
                  borderRadius: 999,
                  border: "1px solid rgba(55,65,81,0.9)",
                  background: "rgba(15,23,42,0.98)",
                  color: "#e5e7eb",
                }}
              >
                {tag}
              </span>
            ))}
          </div>

          {/* AI summary */}
          <div
            style={{
              marginTop: 10,
              borderRadius: 16,
              padding: 10,
              border: "1px solid rgba(51,65,85,0.98)",
              background:
                "radial-gradient(circle at top left,rgba(15,23,42,0.98),rgba(15,23,42,0.96))",
              fontSize: 12,
              color: "#cbd5f5",
              maxWidth: 720,
              lineHeight: 1.5,
            }}
          >
            <span
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 1.1,
                color: "#9ca3af",
                marginRight: 8,
              }}
            >
              AI overview
            </span>
            {vendor.aiSummary ||
              "AI summary goes here once rules & requirements evaluate this vendor."}
          </div>

          {loadError && (
            <div
              style={{
                marginTop: 6,
                fontSize: 11,
                color: "#f97316",
              }}
            >
              {loadError}
            </div>
          )}

          <div
            style={{
              marginTop: 6,
              fontSize: 10,
              color: "#6b7280",
            }}
          >
            Last evaluated:{" "}
            <span style={{ color: "#e5e7eb" }}>
              {new Date(vendor.lastUpdated).toLocaleDateString()}
            </span>
          </div>
        </div>
        {/* ===========================
            RIGHT — SCORE PANEL
        ============================ */}
        <div
          style={{
            padding: 12,
            borderRadius: 20,
            border: "1px solid rgba(148,163,184,0.55)",
            background:
              "radial-gradient(circle at top,#020617,#020617 70%,#020617 100%)",
            boxShadow: "0 22px 50px rgba(15,23,42,0.95)",
            minWidth: 260,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {/* SCORE HEADER */}
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 1.2,
              color: "#9ca3af",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>Compliance score</span>

            <button
              onClick={() => setOutreachOpen(true)}
              style={{
                borderRadius: 999,
                padding: "4px 9px",
                border: "1px solid rgba(56,189,248,0.8)",
                background:
                  "radial-gradient(circle at top left,#22c55e,#16a34a,#0f766e)",
                color: "#ecfdf5",
                fontSize: 10,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                cursor: "pointer",
              }}
            >
              <span>✨</span> <span>AI outreach</span>
            </button>
          </div>

          {/* SCORE GAUGE */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            {/* CIRCULAR GAUGE */}
            <div
              style={{
                position: "relative",
                width: 92,
                height: 92,
                borderRadius: "50%",
                background:
                  "conic-gradient(from 220deg,#22c55e,#a3e635,#facc15,#fb7185,#0f172a)",
                padding: 4,
                boxShadow:
                  "0 0 40px rgba(34,197,94,0.35),0 0 80px rgba(248,250,252,0.15)",
              }}
            >
              {/* Inner Circle */}
              <div
                style={{
                  position: "absolute",
                  inset: 9,
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle at 30% 0,#020617,#020617 55%,#000)",
                }}
              />

              {/* Score Text */}
              <div
                style={{
                  position: "relative",
                  zIndex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: 1.1,
                    color: "#9ca3af",
                    marginBottom: 2,
                  }}
                >
                  Score
                </div>

                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 600,
                    background:
                      "linear-gradient(120deg,#22c55e,#bef264,#facc15)",
                    WebkitBackgroundClip: "text",
                    color: "transparent",
                  }}
                >
                  {vendor.complianceScore ?? 0}
                </div>

                <div
                  style={{
                    fontSize: 10,
                    color: "#6b7280",
                  }}
                >
                  /100
                </div>
              </div>
            </div>

            {/* STATUS + LIVE RISK + LIVE ALERT COUNTS */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 4,
                  flexWrap: "wrap",
                }}
              >
                {/* STATUS */}
                <span
                  style={{
                    padding: "3px 9px",
                    borderRadius: 999,
                    fontSize: 11,
                    border: "1px solid rgba(51,65,85,0.98)",
                    background: "rgba(15,23,42,1)",
                    color: "#e5e7eb",
                  }}
                >
                  Status: {vendor.status}
                </span>

                {/* LIVE RISK LEVEL */}
                {(() => {
                  const hasCritical = vendorAlerts.some(
                    (a) => a.severity === "Critical"
                  );
                  const hasHigh = vendorAlerts.some(
                    (a) => a.severity === "High"
                  );

                  const risk = hasCritical
                    ? "High"
                    : hasHigh
                    ? "Medium"
                    : "Low";

                  const riskColor =
                    risk === "High"
                      ? "#f97316"
                      : risk === "Medium"
                      ? "#facc15"
                      : "#22c55e";

                  return (
                    <span
                      style={{
                        padding: "3px 9px",
                        borderRadius: 999,
                        fontSize: 11,
                        border: "1px solid rgba(51,65,85,0.98)",
                        background: "rgba(15,23,42,1)",
                        color: riskColor,
                      }}
                    >
                      Risk: {risk}
                    </span>
                  );
                })()}
              </div>

              {/* LIVE OPEN ALERTS + CRITICAL COUNT */}
              <div
                style={{
                  fontSize: 11,
                  color: "#9ca3af",
                }}
              >
                {vendorAlerts.length} open alerts ·{" "}
                {
                  vendorAlerts.filter((a) => a.severity === "Critical")
                    .length
                }{" "}
                critical.
              </div>
            </div>
          </div>

          {/* REQUIREMENTS SUMMARY */}
          <div
            style={{
              marginTop: 4,
              borderRadius: 14,
              padding: 8,
              border: "1px solid rgba(51,65,85,0.98)",
              background: "rgba(15,23,42,1)",
              fontSize: 11,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 3,
              }}
            >
              <span style={{ color: "#9ca3af" }}>Requirements</span>
              <span style={{ color: "#e5e7eb" }}>
                {vendor.requirementsSummary.passed} passed ·{" "}
                {vendor.requirementsSummary.failed} failed
              </span>
            </div>

            <div style={{ color: "#6b7280" }}>
              Coverage, endorsements, documents, and logical checks.
            </div>
          </div>
        </div>
      </div>
      {/* ===========================
          MAIN GRID
      ============================ */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1.4fr) minmax(0,1.1fr)",
          gap: 18,
          alignItems: "stretch",
        }}
      >
        {/* ===========================
            LEFT — COVERAGE + ENDORSEMENTS + DOCUMENTS
        ============================ */}
        <div
          style={{
            borderRadius: 24,
            padding: 16,
            background:
              "radial-gradient(circle at top left,rgba(15,23,42,0.98),rgba(15,23,42,0.9))",
            border: "1px solid rgba(148,163,184,0.55)",
            boxShadow: "0 24px 60px rgba(15,23,42,0.95)",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {/* ===========================
              COVERAGE PANEL
          ============================ */}
          <div
            style={{
              borderRadius: 18,
              padding: 10,
              border: "1px solid rgba(51,65,85,0.98)",
              background: "rgba(15,23,42,0.98)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: 1.2,
                    color: "#9ca3af",
                    marginBottom: 3,
                  }}
                >
                  Coverage vs blueprint
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "#e5e7eb",
                  }}
                >
                  Limits by line of coverage
                </div>
              </div>

              <div
                style={{
                  fontSize: 11,
                  color: "#9ca3af",
                  textAlign: "right",
                }}
              >
                {vendor.requirementsSummary.byType.coverage.failed +
                vendor.requirementsSummary.byType.coverage.passed >
                0
                  ? Math.round(
                      (vendor.requirementsSummary.byType.coverage.passed /
                        (vendor.requirementsSummary.byType.coverage.passed +
                          vendor.requirementsSummary.byType.coverage.failed)) *
                        100
                    )
                  : 0}
                % met
              </div>
            </div>
            <div
              style={{
                marginTop: 6,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))",
                gap: 8,
              }}
            >
              {(vendor.coverage ?? []).length > 0 ? (
                vendor.coverage.map((cov) => (
                  <CoverageCard key={cov.id} coverage={cov} />
                ))
              ) : (
                <div
                  style={{
                    borderRadius: 12,
                    padding: 10,
                    border: "1px dashed rgba(75,85,99,0.98)",
                    fontSize: 12,
                    color: "#9ca3af",
                  }}
                >
                  No coverage data found.
                </div>
              )}
            </div>
          </div>
          {/* ===========================
              ENDORSEMENTS + DOCUMENTS
          ============================ */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0,1.1fr) minmax(0,1fr)",
              gap: 10,
            }}
          >
            {/* ===== ENDORSEMENTS ===== */}
            <div
              style={{
                borderRadius: 18,
                padding: 10,
                border: "1px solid rgba(51,65,85,0.98)",
                background: "rgba(15,23,42,0.98)",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: 1.2,
                  color: "#9ca3af",
                  marginBottom: 4,
                }}
              >
                Endorsements
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                {(vendor.endorsements ?? []).length > 0 ? (
                  vendor.endorsements.map((e) => (
                    <EndorsementRow key={e.id} endorsement={e} />
                  ))
                ) : (
                  <div
                    style={{
                      borderRadius: 12,
                      padding: 8,
                      border: "1px dashed rgba(75,85,99,0.98)",
                      fontSize: 12,
                      color: "#9ca3af",
                    }}
                  >
                    No endorsement checks found.
                  </div>
                )}
              </div>
            </div>

            {/* ===== DOCUMENTS ===== */}
            <div
              style={{
                borderRadius: 18,
                padding: 10,
                border: "1px solid rgba(51,65,85,0.98)",
                background: "rgba(15,23,42,0.98)",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: 1.2,
                  color: "#9ca3af",
                  marginBottom: 4,
                }}
              >
                Documents on file
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                {(vendor.documents ?? []).length > 0 ? (
                  vendor.documents.map((doc) => (
                    <DocumentRow key={doc.id} document={doc} />
                  ))
                ) : (
                  <div
                    style={{
                      borderRadius: 12,
                      padding: 8,
                      border: "1px dashed rgba(75,85,99,0.98)",
                      fontSize: 12,
                      color: "#9ca3af",
                    }}
                  >
                    No documents available.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div> {/* END LEFT COLUMN */}

        {/* ===========================
            RIGHT — RULE ACTIVITY + TIMELINE
        ============================ */}
        <div
          style={{
            borderRadius: 24,
            padding: 16,
            background:
              "radial-gradient(circle at top right,rgba(15,23,42,0.92),rgba(15,23,42,1))",
            border: "1px solid rgba(148,163,184,0.55)",
            boxShadow: "0 24px 60px rgba(15,23,42,0.95)",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >

          {/* ===========================
              RULES FIRED — LIVE ALERTS
          ============================ */}
          <div
            style={{
              borderRadius: 18,
              padding: 10,
              border: "1px solid rgba(51,65,85,0.98)",
              background: "rgba(15,23,42,0.98)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 1.2,
                color: "#9ca3af",
                marginBottom: 4,
              }}
            >
              Rules firing for this vendor
            </div>

            <div
              style={{
                fontSize: 11,
                color: "#9ca3af",
                marginBottom: 6,
              }}
            >
              Selected live rule-based alerts from your compliance engine.
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                maxHeight: 220,
                overflowY: "auto",
              }}
            >
              {vendorAlerts.filter((a) => a.type === "rule_failure").length > 0 ? (
                vendorAlerts
                  .filter((a) => a.type === "rule_failure")
                  .map((alert) => (
                    <RuleRow
                      key={alert.id}
                      rule={{
                        id: alert.id,
                        label: alert.ruleLabel || alert.title || "Rule triggered",
                        description:
                          alert.message ||
                          "Rule fired by compliance engine.",
                        severity: alert.severity || "Medium",
                        timestamp: alert.createdAt,
                        dsl: alert.dsl || "—",
                      }}
                    />
                  ))
              ) : (
                <div
                  style={{
                    borderRadius: 12,
                    padding: 8,
                    border: "1px dashed rgba(75,85,99,0.98)",
                    fontSize: 12,
                    color: "#9ca3af",
                  }}
                >
                  No rule-based alerts for this vendor.
                </div>
              )}
            </div>
          </div>
          {/* ===========================
              COMPLIANCE TIMELINE — LIVE ALERTS
          ============================ */}
          <div
            style={{
              borderRadius: 18,
              padding: 10,
              border: "1px solid rgba(51,65,85,0.98)",
              background: "rgba(15,23,42,0.98)",
              flex: 1,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 1.2,
                color: "#9ca3af",
                marginBottom: 4,
              }}
            >
              Compliance timeline
            </div>

            <div
              style={{
                fontSize: 11,
                color: "#9ca3af",
                marginBottom: 6,
              }}
            >
              Every event — rules, requirements, expirations, uploads — shown in order.
            </div>

            <div
              style={{
                position: "relative",
                flex: 1,
                overflowY: "auto",
                paddingTop: 2,
              }}
            >
              {/* Vertical line */}
              <div
                style={{
                  position: "absolute",
                  left: 10,
                  top: 0,
                  bottom: 0,
                  width: 2,
                  background:
                    "linear-gradient(to bottom,rgba(56,189,248,0.35),rgba(56,189,248,0))",
                }}
              />

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  paddingLeft: 0,
                }}
              >
                {vendorAlerts.length > 0 ? (
                  [...vendorAlerts]
                    .sort(
                      (a, b) =>
                        new Date(b.createdAt).getTime() -
                        new Date(a.createdAt).getTime()
                    )
                    .map((alert, idx) => (
                      <TimelineItem
                        key={alert.id}
                        event={{
                          id: alert.id,
                          label: alert.title || alert.ruleLabel || "Alert",
                          detail: alert.message || "",
                          severity: alert.severity || "Medium",
                          timestamp: alert.createdAt,
                          type: alert.type || "Alert",
                        }}
                        isFirst={idx === 0}
                      />
                    ))
                ) : (
                  <div
                    style={{
                      marginTop: 8,
                      borderRadius: 12,
                      padding: 8,
                      border: "1px dashed rgba(75,85,99,0.98)",
                      fontSize: 12,
                      color: "#9ca3af",
                    }}
                  >
                    No timeline activity yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div> {/* END MAIN GRID */}
      {/* ===========================
          AI OUTREACH DRAWER
      ============================ */}
      <AiOutreachDrawer
        open={outreachOpen}
        onClose={() => setOutreachOpen(false)}
        vendor={vendor}
        coverage={vendor.coverage ?? []}
        endorsements={vendor.endorsements ?? []}
        documents={vendor.documents ?? []}
        rules={vendorAlerts.filter((a) => a.type === "rule_failure")}
        requirementsSummary={vendor.requirementsSummary}
      />

      <style jsx>{`
        @keyframes pulseDot {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.35); opacity: 0.4; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
/* ===========================
   COVERAGE CARD
=========================== */
function CoverageCard({ coverage }) {
  const sev = severityStyle(coverage.severity);

  const statusColor =
    coverage.status === "Pass"
      ? { bg: "rgba(34,197,94,0.15)", border: "rgba(34,197,94,0.85)", text: "#bbf7d0" }
      : { bg: "rgba(248,113,113,0.15)", border: "rgba(248,113,113,0.9)", text: "#fecaca" };

  return (
    <div
      style={{
        position: "relative",
        borderRadius: 14,
        padding: 10,
        border: "1px solid rgba(51,65,85,0.98)",
        background:
          "radial-gradient(circle at top left,rgba(15,23,42,0.98),rgba(15,23,42,0.94))",
        boxShadow: "0 16px 34px rgba(15,23,42,0.9)",
      }}
    >
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ fontSize: 12, color: "#e5e7eb", marginBottom: 4 }}>
          {coverage.label}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 6,
            fontSize: 10,
          }}
        >
          <div
            style={{
              padding: "2px 7px",
              borderRadius: 999,
              border: `1px solid ${statusColor.border}`,
              background: statusColor.bg,
              color: statusColor.text,
            }}
          >
            {coverage.status === "Pass" ? "Meets requirement" : "Below required"}
          </div>

          <div
            style={{
              padding: "2px 7px",
              borderRadius: 999,
              border: `1px solid ${sev.border}`,
              background: sev.bg,
              color: sev.text,
            }}
          >
            {coverage.severity}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            fontSize: 11,
          }}
        >
          <div
            style={{
              flex: 1,
              borderRadius: 10,
              padding: "6px 7px",
              border: "1px solid rgba(30,64,175,0.9)",
              background: "rgba(15,23,42,0.98)",
            }}
          >
            <div style={{ color: "#9ca3af", marginBottom: 2 }}>Required</div>
            <div style={{ color: "#e5e7eb" }}>
              ${coverage.required?.toLocaleString() || "—"}
            </div>
          </div>

          <div
            style={{
              flex: 1,
              borderRadius: 10,
              padding: "6px 7px",
              border: "1px solid rgba(51,65,85,0.98)",
              background: "rgba(15,23,42,0.98)",
            }}
          >
            <div style={{ color: "#9ca3af", marginBottom: 2 }}>Detected</div>
            <div
              style={{
                color:
                  coverage.status === "Pass" ? "#bbf7d0" : "#fecaca",
              }}
            >
              ${coverage.actual?.toLocaleString() || "—"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===========================  
   ENDORSEMENT ROW  
=========================== */
function EndorsementRow({ endorsement }) {
  const sev = severityStyle(endorsement.severity);

  return (
    <div
      style={{
        borderRadius: 12,
        padding: 8,
        border: "1px solid rgba(51,65,85,0.98)",
        background: "rgba(15,23,42,1)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: "#e5e7eb", marginBottom: 2 }}>
            {endorsement.label}
          </div>
          <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4 }}>
            Expected: {endorsement.expectation || "—"}
          </div>
          <div style={{ fontSize: 11, color: "#9ca3af" }}>
            Found: {endorsement.finding || "—"}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            alignItems: "flex-end",
            minWidth: 70,
          }}
        >
          <div
            style={{
              padding: "2px 7px",
              borderRadius: 999,
              border: `1px solid ${sev.border}`,
              background: sev.bg,
              color: sev.text,
              fontSize: 10,
            }}
          >
            {endorsement.severity}
          </div>

          <div
            style={{
              padding: "2px 7px",
              borderRadius: 999,
              border: "1px solid rgba(51,65,85,0.98)",
              background: "rgba(15,23,42,1)",
              color: endorsement.present ? "#bbf7d0" : "#fecaca",
              fontSize: 10,
            }}
          >
            {endorsement.present ? "Present" : "Missing"}
          </div>
        </div>
      </div>
    </div>
  );
}
