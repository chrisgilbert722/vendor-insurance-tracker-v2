// pages/admin/vendor/[id].js
import { useRouter } from "next/router";
import { useMemo } from "react";

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
   MOCK VENDOR PROFILES
   (Later: replace with real data)
=========================== */
const vendorProfiles = {
  "summit-roofing": {
    id: "summit-roofing",
    name: "Summit Roofing & Coatings",
    category: "Roofing / Exterior Work",
    location: "Denver, CO",
    tags: ["Onsite contractor", "High risk", "Exterior work"],
    complianceScore: 72,
    status: "At Risk",
    riskLevel: "High",
    alertsOpen: 3,
    criticalIssues: 1,
    lastUpdated: "2025-11-20T14:23:00Z",
    aiSummary:
      "Vendor is 72% compliant. GL limits are below blueprint, Workers Comp is missing for onsite crew, and the primary COI expires in 23 days. Treat as high risk until limits and coverage are corrected.",
    coverage: [
      {
        id: "gl-each-occurrence",
        label: "General Liability — Each Occurrence",
        required: 1000000,
        actual: 500000,
        unit: "per occurrence",
        status: "Fail",
        severity: "High",
        field: "Certificate.glEachOccurrence",
      },
      {
        id: "gl-aggregate",
        label: "General Liability — General Aggregate",
        required: 2000000,
        actual: 2000000,
        unit: "aggregate",
        status: "Pass",
        severity: "Medium",
        field: "Certificate.glGeneralAggregate",
      },
      {
        id: "auto-liab",
        label: "Auto Liability — Combined Single Limit",
        required: 1000000,
        actual: 1000000,
        unit: "combined single limit",
        status: "Pass",
        severity: "High",
        field: "Certificate.autoLiability",
      },
      {
        id: "umbrella",
        label: "Umbrella / Excess",
        required: 5000000,
        actual: 3000000,
        unit: "limit",
        status: "Fail",
        severity: "High",
        field: "Certificate.umbrellaLimit",
      },
    ],
    endorsements: [
      {
        id: "ai",
        label: "Additional Insured – Ongoing Operations",
        required: true,
        present: false,
        severity: "Critical",
        expectation: "AI wording (CG 20 10 or equivalent) naming your org.",
        finding: "No AI wording detected on COI or endorsements.",
      },
      {
        id: "waiver",
        label: "Waiver of Subrogation",
        required: true,
        present: true,
        severity: "Medium",
        expectation:
          "Named waiver of subrogation in favor of your organization.",
        finding: "Generic waiver wording present; does not name your org.",
      },
    ],
    documents: [
      {
        id: "coi",
        label: "Certificate of Insurance",
        type: "COI",
        status: "Expires in 23 days",
        severity: "Medium",
        present: true,
      },
      {
        id: "contract",
        label: "Signed Contract / MSA",
        type: "Contract",
        status: "On file",
        severity: "Low",
        present: true,
      },
      {
        id: "safety",
        label: "Safety Program / OSHA Docs",
        type: "Safety",
        status: "Missing",
        severity: "Low",
        present: false,
      },
    ],
    rulesFired: [
      {
        id: "r1",
        severity: "Critical",
        label: "General Liability Below Required",
        description:
          "GL each occurrence limit is below blueprint requirement while vendor is active.",
        dsl: "Certificate.glEachOccurrence < Org.requiredGLEachOccurrence AND Vendor.isActive = true",
        timestamp: "2025-11-20T14:23:00Z",
      },
      {
        id: "r2",
        severity: "High",
        label: "Onsite Contractor Requires Workers Comp",
        description:
          "Vendor flagged as onsite contractor but no Workers Compensation coverage found.",
        dsl: "Vendor.category IN ('Onsite Contractor','Construction') AND Certificate.workersComp IS NULL",
        timestamp: "2025-11-18T13:40:00Z",
      },
      {
        id: "r3",
        severity: "Medium",
        label: "Expires Within 30 Days",
        description:
          "Primary GL policy expiration within next 30 days for active vendor.",
        dsl: "Certificate.glExpirationDate <= today + 30 days AND Vendor.isActive = true",
        timestamp: "2025-11-17T10:30:00Z",
      },
    ],
    requirementsSummary: {
      total: 14,
      passed: 10,
      failed: 4,
      byType: {
        coverage: { passed: 2, failed: 2 },
        endorsements: { passed: 1, failed: 1 },
        documents: { passed: 2, failed: 1 },
        logical: { passed: 5, failed: 0 },
      },
    },
    timeline: [
      {
        id: "t1",
        type: "Rule",
        label: "GL limit below required",
        severity: "Critical",
        timestamp: "2025-11-20T14:23:00Z",
        detail:
          "GL each occurrence $500,000. Blueprint requires $1,000,000 per occurrence.",
      },
      {
        id: "t2",
        type: "Rule",
        label: "Onsite contractor missing Workers Comp",
        severity: "High",
        timestamp: "2025-11-18T13:40:00Z",
        detail:
          "Vendor category = Onsite contractor; Workers Comp coverage not detected on any policy.",
      },
      {
        id: "t3",
        type: "Rule",
        label: "GL policy expires in 23 days",
        severity: "Medium",
        timestamp: "2025-11-17T10:30:00Z",
        detail:
          "Primary GL expiration in 23 days. Email notification sent to vendor contact.",
      },
      {
        id: "t4",
        type: "Document",
        label: "Contract uploaded",
        severity: "Low",
        timestamp: "2025-11-12T09:10:00Z",
        detail: "Signed MSA (3-year term) uploaded and linked to vendor.",
      },
    ],
  },

  // Fallback / example if ID not found
  default: {
    id: "example-vendor",
    name: "Example Vendor, Inc.",
    category: "General Services",
    location: "Your City, USA",
    tags: ["Demo vendor"],
    complianceScore: 88,
    status: "Compliant",
    riskLevel: "Medium",
    alertsOpen: 1,
    criticalIssues: 0,
    lastUpdated: "2025-11-20T11:00:00Z",
    aiSummary:
      "Vendor is 88% compliant with one open medium-severity alert. Coverage and documents match blueprint for most lines.",
    coverage: [],
    endorsements: [],
    documents: [],
    rulesFired: [],
    requirementsSummary: {
      total: 0,
      passed: 0,
      failed: 0,
      byType: {
        coverage: { passed: 0, failed: 0 },
        endorsements: { passed: 0, failed: 0 },
        documents: { passed: 0, failed: 0 },
        logical: { passed: 0, failed: 0 },
      },
    },
    timeline: [],
  },
};

/* ===========================
   HELPERS
=========================== */
function severityStyle(sev) {
  switch (sev) {
    case "Critical":
      return {
        bg: "rgba(248,113,113,0.14)",
        border: "rgba(248,113,113,0.9)",
        text: "#fee2e2",
      };
    case "High":
      return {
        bg: "rgba(250,204,21,0.14)",
        border: "rgba(250,204,21,0.9)",
        text: "#fef9c3",
      };
    case "Medium":
      return {
        bg: "rgba(56,189,248,0.14)",
        border: "rgba(56,189,248,0.9)",
        text: "#e0f2fe",
      };
    case "Low":
      return {
        bg: "rgba(52,211,153,0.14)",
        border: "rgba(52,211,153,0.9)",
        text: "#ccfbf1",
      };
    default:
      return {
        bg: "rgba(148,163,184,0.14)",
        border: "rgba(148,163,184,0.9)",
        text: "#e5e7eb",
      };
  }
}

function formatShortDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimeAgo(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.round(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return diffMins + " min ago";
  const diffHours = Math.round(diffMins / 60);
  if (diffHours < 24) return diffHours + " h ago";
  const diffDays = Math.round(diffHours / 24);
  return diffDays + " d ago";
}

/* ===========================
   MAIN PAGE
=========================== */
export default function VendorProfilePage() {
  const router = useRouter();
  const { id } = router.query;

  const vendor = useMemo(() => {
    if (!id) return vendorProfiles["default"];
    return vendorProfiles[id] || vendorProfiles["default"];
  }, [id]);

  const reqSummary = vendor.requirementsSummary || {
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

  const coveragePassRate =
    reqSummary.byType.coverage.passed + reqSummary.byType.coverage.failed === 0
      ? 0
      : Math.round(
          (reqSummary.byType.coverage.passed /
            (reqSummary.byType.coverage.passed +
              reqSummary.byType.coverage.failed)) *
            100
        );

  const endorsementPassRate =
    reqSummary.byType.endorsements.passed +
      reqSummary.byType.endorsements.failed ===
    0
      ? 0
      : Math.round(
          (reqSummary.byType.endorsements.passed /
            (reqSummary.byType.endorsements.passed +
              reqSummary.byType.endorsements.failed)) *
            100
        );

  const docsPassRate =
    reqSummary.byType.documents.passed + reqSummary.byType.documents.failed === 0
      ? 0
      : Math.round(
          (reqSummary.byType.documents.passed /
            (reqSummary.byType.documents.passed +
              reqSummary.byType.documents.failed)) *
            100
        );

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
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 24,
          marginBottom: 24,
        }}
      >
        {/* Vendor identity + AI summary */}
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
              Rules • Requirements • Alerts
            </span>
          </div>

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
              "AI summary will describe this vendor’s current compliance posture once rules and requirements are evaluated."}
          </div>

          <div
            style={{
              marginTop: 6,
              fontSize: 10,
              color: "#6b7280",
            }}
          >
            Last evaluated:{" "}
            <span style={{ color: "#e5e7eb" }}>
              {formatShortDate(vendor.lastUpdated)}
            </span>
          </div>
        </div>

        {/* Compliance gauge + status */}
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
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 1.2,
              color: "#9ca3af",
            }}
          >
            Compliance score
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            {/* Gauge */}
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
              <div
                style={{
                  position: "absolute",
                  inset: 9,
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle at 30% 0,#020617,#020617 55%,#000)",
                }}
              />
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

            {/* Status labels */}
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
                  Status: {vendor.status || "Unknown"}
                </span>
                <span
                  style={{
                    padding: "3px 9px",
                    borderRadius: 999,
                    fontSize: 11,
                    border: "1px solid rgba(51,65,85,0.98)",
                    background: "rgba(15,23,42,1)",
                    color:
                      vendor.riskLevel === "High"
                        ? "#f97316"
                        : vendor.riskLevel === "Medium"
                        ? "#facc15"
                        : "#22c55e",
                  }}
                >
                  Risk: {vendor.riskLevel || "Unknown"}
                </span>
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "#9ca3af",
                }}
              >
                {vendor.alertsOpen} open alerts ·{" "}
                {vendor.criticalIssues} critical.
              </div>
            </div>
          </div>

          {/* Requirements summary */}
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
                {reqSummary.passed} passed · {reqSummary.failed} failed
              </span>
            </div>
            <div style={{ color: "#6b7280" }}>
              Coverage, endorsements, documents, and logical checks combined.
            </div>
          </div>
        </div>
      </div>

      {/* MAIN GRID */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1.4fr) minmax(0,1.1fr)",
          gap: 18,
          alignItems: "stretch",
        }}
      >
        {/* LEFT — COVERAGE + REQUIREMENTS */}
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
          {/* Coverage panel */}
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
                  Limits by line of coverage.
                </div>
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "#9ca3af",
                  textAlign: "right",
                }}
              >
                {coveragePassRate}% of coverage requirements met
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
              {vendor.coverage?.length ? (
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
                  No coverage data attached yet. Once policies and COIs are
                  parsed, they’ll render here.
                </div>
              )}
            </div>
          </div>

          {/* Endorsements + docs */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0,1.1fr) minmax(0,1fr)",
              gap: 10,
            }}
          >
            {/* Endorsements */}
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
                  fontSize: 11,
                  color: "#9ca3af",
                  marginBottom: 6,
                }}
              >
                {endorsementPassRate}% of endorsement requirements met.
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                {vendor.endorsements?.length ? (
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
                    No endorsement checks configured for this vendor yet.
                  </div>
                )}
              </div>
            </div>

            {/* Documents */}
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
                  fontSize: 11,
                  color: "#9ca3af",
                  marginBottom: 6,
                }}
              >
                {docsPassRate}% of document requirements met.
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                {vendor.documents?.length ? (
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
                    No documents linked yet. COIs, contracts, and supporting
                    docs will show here.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — RULE ACTIVITY + TIMELINE */}
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
          {/* Rules fired */}
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
              Live view from your Elite Compliance Engine. Critical rules should
              be cleared before vendor is fully approved.
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
              {vendor.rulesFired?.length ? (
                vendor.rulesFired.map((rule) => (
                  <RuleRow key={rule.id} rule={rule} />
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
                  No rules have fired for this vendor. Once policies and
                  documents are evaluated, triggered rules will show up here.
                </div>
              )}
            </div>
          </div>

          {/* Timeline */}
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
              Every event — uploads, rule triggers, expirations — in a single
              scroll.
            </div>

            <div
              style={{
                position: "relative",
                flex: 1,
                overflowY: "auto",
                paddingTop: 2,
              }}
            >
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
                {vendor.timeline?.length ? (
                  vendor.timeline.map((evt, idx) => (
                    <TimelineItem
                      key={evt.id}
                      event={evt}
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
                    Timeline will fill as rules fire, documents are uploaded,
                    and expirations approach.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulseDot {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.35);
            opacity: 0.4;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

/* ===========================
   COVERAGE CARD
=========================== */
function CoverageCard({ coverage }) {
  const statusColor =
    coverage.status === "Pass"
      ? { bg: "rgba(34,197,94,0.15)", border: "rgba(34,197,94,0.85)", text: "#bbf7d0" }
      : { bg: "rgba(248,113,113,0.15)", border: "rgba(248,113,113,0.9)", text: "#fecaca" };

  const sev = severityStyle(coverage.severity);

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
      <div
        style={{
          position: "absolute",
          inset: -2,
          background:
            "radial-gradient(circle at -10% -20%,rgba(56,189,248,0.18),transparent 60%)",
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative", zIndex: 1 }}>
        <div
          style={{
            fontSize: 12,
            color: "#e5e7eb",
            marginBottom: 4,
          }}
        >
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
              ${coverage.required?.toLocaleString() || "—"}{" "}
              <span style={{ color: "#9ca3af" }}>{coverage.unit}</span>
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
              ${coverage.actual?.toLocaleString() || "—"}{" "}
              <span style={{ color: "#9ca3af" }}>{coverage.unit}</span>
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 4,
            fontSize: 10,
            color: "#6b7280",
          }}
        >
          Field:{" "}
          <span style={{ color: "#e5e7eb" }}>{coverage.field || "—"}</span>
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
          <div
            style={{
              fontSize: 12,
              color: "#e5e7eb",
              marginBottom: 2,
            }}
          >
            {endorsement.label}
          </div>
          <div
            style={{
              fontSize: 11,
              color: "#9ca3af",
              marginBottom: 4,
            }}
          >
            Expected:{" "}
            <span style={{ color: "#e5e7eb" }}>
              {endorsement.expectation || "Defined in requirements."}
            </span>
          </div>
          <div
            style={{
              fontSize: 11,
              color: "#9ca3af",
            }}
          >
            Found:{" "}
            <span style={{ color: "#e5e7eb" }}>
              {endorsement.finding || "Not evaluated yet."}
            </span>
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
              fontSize: 10,
              color: endorsement.present ? "#bbf7d0" : "#fecaca",
            }}
          >
            {endorsement.present ? "Present" : "Missing"}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===========================
   DOCUMENT ROW
=========================== */
function DocumentRow({ document }) {
  const sev = severityStyle(document.severity);

  return (
    <div
      style={{
        borderRadius: 12,
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
          gap: 8,
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              color: "#e5e7eb",
              marginBottom: 2,
            }}
          >
            {document.label}
          </div>
          <div style={{ color: "#9ca3af" }}>{document.status}</div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
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
            }}
          >
            {document.severity}
          </div>
          <div
            style={{
              padding: "2px 7px",
              borderRadius: 999,
              border: "1px solid rgba(51,65,85,0.98)",
              background: "rgba(15,23,42,1)",
              color: document.present ? "#bbf7d0" : "#fecaca",
            }}
          >
            {document.present ? "On file" : "Missing"}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===========================
   RULE ROW
=========================== */
function RuleRow({ rule }) {
  const sev = severityStyle(rule.severity);

  return (
    <div
      style={{
        borderRadius: 12,
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
          gap: 8,
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              color: "#e5e7eb",
              marginBottom: 2,
            }}
          >
            {rule.label}
          </div>
          <div
            style={{
              color: "#9ca3af",
              marginBottom: 4,
            }}
          >
            {rule.description}
          </div>
        </div>
        <div
          style={{
            textAlign: "right",
            color: "#6b7280",
            fontSize: 10,
          }}
        >
          {formatTimeAgo(rule.timestamp)}
        </div>
      </div>
      <div
        style={{
          marginTop: 4,
          borderRadius: 8,
          padding: "6px 7px",
          border: "1px solid rgba(30,64,175,0.98)",
          background: "rgba(15,23,42,0.98)",
          fontFamily: "ui-monospace,Menlo,SFMono-Regular,monospace",
          fontSize: 10,
          color: "#e5e7eb",
        }}
      >
        {rule.dsl}
      </div>
      <div
        style={{
          marginTop: 4,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <div
          style={{
            padding: "2px 7px",
            borderRadius: 999,
            border: `1px solid ${sev.border}`,
            background: sev.bg,
            color: sev.text,
          }}
        >
          {rule.severity}
        </div>
      </div>
    </div>
  );
}

/* ===========================
   TIMELINE ITEM
=========================== */
function TimelineItem({ event, isFirst }) {
  const sev = severityStyle(event.severity);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "20px minmax(0,1fr)",
        gap: 10,
      }}
    >
      {/* dot */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          paddingTop: 3,
        }}
      >
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: 999,
            border: "2px solid rgba(56,189,248,0.9)",
            background: isFirst
              ? "rgba(56,189,248,0.9)"
              : "rgba(15,23,42,1)",
            boxShadow: isFirst
              ? "0 0 18px rgba(56,189,248,0.9)"
              : "0 0 0 rgba(0,0,0,0)",
            animation: isFirst ? "pulseDot 1300ms ease-in-out infinite" : "none",
          }}
        />
      </div>

      {/* card */}
      <div
        style={{
          borderRadius: 12,
          padding: "8px 9px",
          border: "1px solid rgba(51,65,85,0.98)",
          background: "rgba(15,23,42,1)",
          fontSize: 11,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <div>
            <div
              style={{
                color: "#e5e7eb",
                marginBottom: 2,
              }}
            >
              {event.label}
            </div>
            <div
              style={{
                color: "#9ca3af",
                marginBottom: 4,
              }}
            >
              {event.detail}
            </div>
          </div>
          <div
            style={{
              color: "#6b7280",
              fontSize: 10,
              textAlign: "right",
            }}
          >
            {formatTimeAgo(event.timestamp)}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: 6,
            marginTop: 2,
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
            {event.severity}
          </div>
          <div
            style={{
              padding: "2px 7px",
              borderRadius: 999,
              border: "1px solid rgba(51,65,85,0.98)",
              background: "rgba(15,23,42,1)",
              fontSize: 10,
              color: "#e5e7eb",
            }}
          >
            {event.type}
          </div>
        </div>
      </div>
    </div>
  );
}
