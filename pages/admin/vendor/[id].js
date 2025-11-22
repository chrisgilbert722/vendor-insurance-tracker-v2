// pages/admin/vendor/[id].js
import { useMemo } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useOrg } from "../../context/OrgContext";
import { useRole } from "../../lib/useRole";

/* ===========================
   MOCK DATA (REPLACE LATER)
=========================== */

const MOCK_VENDORS = {
  "summit-roofing": {
    id: "summit-roofing",
    name: "Summit Roofing & Coatings",
    location: "Denver, CO",
    category: "Roofing / Exterior Work",
    tags: ["Onsite contractor", "High risk"],
    status: "At Risk",
    complianceScore: 72,
    lastEvaluated: "2025-11-20T09:15:00Z",
    alertsOpen: 2,
    alertsRecent: [
      {
        id: "a1",
        severity: "Critical",
        title: "GL limit below required",
        message:
          "General Liability each occurrence is $500,000. Blueprint requires $1,000,000.",
        createdAt: "2025-11-20T08:12:00Z",
        type: "Coverage",
      },
      {
        id: "a2",
        severity: "High",
        title: "Missing Additional Insured endorsement",
        message:
          "Required AI wording not found in any uploaded endorsement documents.",
        createdAt: "2025-11-19T14:40:00Z",
        type: "Endorsement",
      },
    ],
    coverage: [
      {
        line: "General Liability — Each Occurrence",
        required: "$1,000,000",
        actual: "$500,000",
        status: "Below required",
        severity: "Critical",
        field: "Certificate.glEachOccurrence",
      },
      {
        line: "General Liability — Aggregate",
        required: "$2,000,000",
        actual: "$2,000,000",
        status: "Meets requirement",
        severity: "Medium",
        field: "Certificate.glAggregate",
      },
      {
        line: "Auto Liability — Combined Single Limit",
        required: "$1,000,000",
        actual: "$1,000,000",
        status: "Meets requirement",
        severity: "High",
        field: "Certificate.autoLiability",
      },
      {
        line: "Umbrella / Excess",
        required: "$2,000,000",
        actual: "No policy on file",
        status: "Missing",
        severity: "High",
        field: "Certificate.umbrella",
      },
    ],
    requirements: {
      total: 10,
      passing: 7,
      failing: 3,
      failingLabels: [
        "GL Each Occurrence below required",
        "Umbrella missing",
        "Additional Insured language missing",
      ],
    },
    documents: [
      {
        id: "doc1",
        type: "COI",
        name: "Summit Roofing - COI - 2025.pdf",
        uploadedAt: "2025-11-18T12:05:00Z",
        status: "Current",
      },
      {
        id: "doc2",
        type: "Endorsement",
        name: "Summit - AI Endorsement.pdf",
        uploadedAt: "2025-11-10T10:42:00Z",
        status: "Under review",
      },
    ],
    timeline: [
      {
        id: "t1",
        timestamp: "2025-11-20T08:12:00Z",
        label: "GL limit below required",
        severity: "Critical",
        detail:
          "GL Each Occurrence is $500,000. Blueprint requires $1,000,000.",
      },
      {
        id: "t2",
        timestamp: "2025-11-19T14:40:00Z",
        label: "Missing Additional Insured endorsement",
        severity: "High",
        detail:
          "Required AI wording not found on CG 20 10 or equivalents for Summit Roofing.",
      },
      {
        id: "t3",
        timestamp: "2025-11-15T09:20:00Z",
        label: "New COI uploaded",
        severity: "Info",
        detail: "Primary GL policy updated by broker.",
      },
    ],
  },
  "northline-mech": {
    id: "northline-mech",
    name: "Northline Mechanical Services",
    location: "Seattle, WA",
    category: "HVAC / Mechanical",
    tags: ["Interior contractor"],
    status: "Needs Review",
    complianceScore: 83,
    lastEvaluated: "2025-11-19T14:40:00Z",
    alertsOpen: 1,
    alertsRecent: [
      {
        id: "b1",
        severity: "High",
        title: "Awaiting signed Waiver of Subrogation",
        message: "Waiver required by contract; endorsement not yet uploaded.",
        createdAt: "2025-11-19T10:22:00Z",
        type: "Endorsement",
      },
    ],
    coverage: [
      {
        line: "General Liability — Each Occurrence",
        required: "$1,000,000",
        actual: "$1,000,000",
        status: "Meets requirement",
        severity: "Medium",
        field: "Certificate.glEachOccurrence",
      },
      {
        line: "Workers’ Compensation",
        required: "Statutory",
        actual: "Statutory",
        status: "Meets requirement",
        severity: "Low",
        field: "Certificate.workersComp",
      },
    ],
    requirements: {
      total: 11,
      passing: 9,
      failing: 2,
      failingLabels: [
        "Waiver of Subrogation not verified",
        "Primary & non-contributory language missing",
      ],
    },
    documents: [
      {
        id: "doc3",
        type: "COI",
        name: "Northline - COI - 2025.pdf",
        uploadedAt: "2025-11-18T15:00:00Z",
        status: "Current",
      },
    ],
    timeline: [
      {
        id: "u1",
        timestamp: "2025-11-19T10:22:00Z",
        label: "Waiver of Subrogation not found",
        severity: "High",
        detail: "No waiver language present in uploaded endorsements.",
      },
      {
        id: "u2",
        timestamp: "2025-11-16T11:00:00Z",
        label: "New vendor onboarded",
        severity: "Info",
        detail: "Vendor added to program and baseline requirements applied.",
      },
    ],
  },
  "brightline-janitorial": {
    id: "brightline-janitorial",
    name: "Brightline Janitorial Group",
    location: "Austin, TX",
    category: "Janitorial / Cleaning",
    tags: ["Service vendor"],
    status: "Compliant",
    complianceScore: 91,
    lastEvaluated: "2025-11-18T11:05:00Z",
    alertsOpen: 0,
    alertsRecent: [],
    coverage: [
      {
        line: "General Liability — Each Occurrence",
        required: "$1,000,000",
        actual: "$1,000,000",
        status: "Meets requirement",
        severity: "Low",
        field: "Certificate.glEachOccurrence",
      },
      {
        line: "Workers’ Compensation",
        required: "Statutory",
        actual: "Statutory",
        status: "Meets requirement",
        severity: "Low",
        field: "Certificate.workersComp",
      },
      {
        line: "Auto Liability",
        required: "$1,000,000",
        actual: "$1,000,000",
        status: "Meets requirement",
        severity: "Low",
        field: "Certificate.autoLiability",
      },
    ],
    requirements: {
      total: 8,
      passing: 8,
      failing: 0,
      failingLabels: [],
    },
    documents: [
      {
        id: "doc4",
        type: "COI",
        name: "Brightline - COI - 2025.pdf",
        uploadedAt: "2025-11-17T13:30:00Z",
        status: "Current",
      },
    ],
    timeline: [
      {
        id: "v1",
        timestamp: "2025-11-18T11:05:00Z",
        label: "All requirements met",
        severity: "Low",
        detail: "All coverage and endorsement requirements currently satisfied.",
      },
      {
        id: "v2",
        timestamp: "2025-11-16T09:10:00Z",
        label: "COI uploaded",
        severity: "Info",
        detail: "New COI received and processed.",
      },
    ],
  },
};

function getVendorById(id) {
  if (!id) return null;
  return MOCK_VENDORS[id] || null;
}

/* ===========================
   MAIN PROFILE COMPONENT
=========================== */

export default function VendorProfilePage() {
  const router = useRouter();
  const { id } = router.query;
  const { orgId } = useOrg();
  const { isAdmin, isManager } = useRole();

  const vendor = useMemo(() => getVendorById(id), [id]);

  if (!vendor) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background:
            "radial-gradient(circle at top left,#020617 0%, #020617 40%, #000 100%)",
          padding: "30px 40px 40px",
          color: "#e5e7eb",
        }}
      >
        <div
          style={{
            fontSize: 12,
            color: "#9ca3af",
            marginBottom: 10,
          }}
        >
          <Link href="/vendors" style={{ color: "#93c5fd" }}>
            ← Back to Vendors
          </Link>
        </div>
        <div
          style={{
            borderRadius: 24,
            padding: 20,
            background:
              "radial-gradient(circle at top left,rgba(15,23,42,0.97),rgba(15,23,42,0.92))",
            border: "1px solid rgba(148,163,184,0.6)",
            boxShadow: "0 24px 60px rgba(15,23,42,0.98)",
          }}
        >
          <h1
            style={{
              fontSize: 22,
              marginBottom: 8,
            }}
          >
            Vendor not found
          </h1>
          <p style={{ fontSize: 13, color: "#cbd5f5" }}>
            We couldn&apos;t find a vendor with id <code>{id}</code>. Check the
            URL or return to the{" "}
            <Link href="/vendors" style={{ color: "#93c5fd" }}>
              Vendors directory
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }

  const { name, location, category, tags, status, complianceScore } = vendor;

  return (
    <div
      style={{
        minHeight: "100vh",
        position: "relative",
        background:
          "radial-gradient(circle at top left,#020617 0%, #020617 40%, #000 100%)",
        padding: "30px 40px 40px",
        color: "#e5e7eb",
        overflowX: "hidden",
      }}
    >
      {/* AURA */}
      <div
        style={{
          position: "absolute",
          top: -260,
          left: "50%",
          transform: "translateX(-50%)",
          width: 1200,
          height: 1200,
          background:
            "radial-gradient(circle, rgba(59,130,246,0.35), transparent 60%)",
          filter: "blur(130px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* HEADER + BREADCRUMB */}
      <div style={{ position: "relative", zIndex: 2, marginBottom: 16 }}>
        <div
          style={{
            fontSize: 12,
            color: "#9ca3af",
            marginBottom: 8,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Link href="/vendors" style={{ color: "#93c5fd" }}>
            Vendors
          </Link>
          <span>/</span>
          <span>{name}</span>
        </div>

        <div
          style={{
            display: "flex",
            gap: 16,
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              padding: 12,
              borderRadius: 999,
              background:
                "radial-gradient(circle at 30% 0,#3b82f6,#6366f1,#0f172a)",
              boxShadow: "0 0 40px rgba(59,130,246,0.5)",
            }}
          >
            <span style={{ fontSize: 22 }}>🏢</span>
          </div>

          <div>
            <div
              style={{
                display: "inline-flex",
                gap: 8,
                padding: "4px 10px",
                borderRadius: 999,
                border: "1px solid rgba(148,163,184,0.4)",
                background:
                  "linear-gradient(120deg,rgba(15,23,42,0.9),rgba(15,23,42,0))",
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  color: "#9ca3af",
                  letterSpacing: 1.2,
                  textTransform: "uppercase",
                }}
              >
                Vendor Compliance Profile
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: "#38bdf8",
                  letterSpacing: 1,
                  textTransform: "uppercase",
                }}
              >
                Coverage · Risk · Activity
              </span>
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: 26,
                fontWeight: 600,
                letterSpacing: 0.2,
              }}
            >
              {name}
            </h1>
            <div
              style={{
                marginTop: 4,
                fontSize: 13,
                color: "#cbd5f5",
              }}
            >
              {location} · {category}
            </div>

            <div
              style={{
                marginTop: 8,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              {tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    borderRadius: 999,
                    padding: "3px 8px",
                    border: "1px solid rgba(51,65,85,0.9)",
                    background: "rgba(15,23,42,0.9)",
                    fontSize: 11,
                    color: "#9ca3af",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* TOP ROW: SCORE + OVERVIEW + ACTIONS */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "grid",
          gridTemplateColumns: "minmax(0,2fr) minmax(0,1.2fr)",
          gap: 18,
          marginBottom: 18,
        }}
      >
        {/* LEFT — SCORE + REQUIREMENTS SUMMARY */}
        <div
          style={{
            borderRadius: 24,
            padding: 16,
            background:
              "radial-gradient(circle at top left,rgba(15,23,42,0.97),rgba(15,23,42,0.92))",
            border: "1px solid rgba(148,163,184,0.6)",
            boxShadow: "0 24px 60px rgba(15,23,42,0.98)",
            display: "grid",
            gridTemplateColumns: "260px minmax(0,1fr)",
            gap: 16,
            alignItems: "center",
          }}
        >
          {/* SCORE GAUGE */}
          <div
            style={{
              position: "relative",
              width: 220,
              height: 220,
              borderRadius: "999px",
              background:
                "conic-gradient(from 220deg,#22c55e,#facc15,#fb7185,#0f172a 70%)",
              padding: 12,
              boxShadow:
                "0 0 70px rgba(34,197,94,0.3),0 0 70px rgba(248,113,113,0.2)",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 18,
                borderRadius: "999px",
                background:
                  "radial-gradient(circle at 30% 0,#0f172a,#020617 70%,#000)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  color: "#9ca3af",
                  letterSpacing: 1.2,
                  marginBottom: 6,
                }}
              >
                Score
              </div>
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 600,
                  background:
                    complianceScore >= 85
                      ? "linear-gradient(120deg,#22c55e,#a3e635)"
                      : complianceScore >= 75
                      ? "linear-gradient(120deg,#facc15,#f97316)"
                      : "linear-gradient(120deg,#ef4444,#fb7185)",
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                }}
              >
                {complianceScore}
              </div>
              <div style={{ fontSize: 11, color: "#9ca3af" }}>
                out of 100 · {status}
              </div>
            </div>
          </div>

          {/* REQUIREMENTS SNAPSHOT */}
          <div>
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                color: "#9ca3af",
                letterSpacing: 1.2,
                marginBottom: 6,
              }}
            >
              Requirements snapshot
            </div>

            <div
              style={{
                fontSize: 13,
                color: "#e5e7eb",
                marginBottom: 8,
              }}
            >
              {vendor.requirements.passing}/{vendor.requirements.total}{" "}
              requirements passing ·{" "}
              <span style={{ color: "#f97316" }}>
                {vendor.requirements.failing} open gaps
              </span>
            </div>

            <div
              style={{
                width: "100%",
                height: 8,
                borderRadius: 999,
                background: "rgba(15,23,42,1)",
                overflow: "hidden",
                border: "1px solid rgba(30,64,175,0.9)",
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  width: `${
                    (vendor.requirements.passing /
                      Math.max(vendor.requirements.total || 1, 1)) *
                    100
                  }%`,
                  height: "100%",
                  background:
                    "linear-gradient(90deg,#22c55e,#a3e635,#facc15,#fb7185)",
                }}
              />
            </div>

            <div
              style={{
                fontSize: 11,
                color: "#9ca3af",
                marginBottom: 10,
              }}
            >
              When this bar is above{" "}
              <span style={{ color: "#22c55e" }}>90%</span>, this vendor is
              fully aligned to your blueprint risk posture.
            </div>

            {/* Failing bullets */}
            {vendor.requirements.failing > 0 && (
              <div
                style={{
                  borderRadius: 14,
                  padding: 10,
                  background: "rgba(15,23,42,0.96)",
                  border: "1px solid rgba(55,65,81,0.9)",
                  fontSize: 11,
                  color: "#e5e7eb",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    color: "#9ca3af",
                    marginBottom: 4,
                  }}
                >
                  Open gaps
                </div>
                <ul
                  style={{
                    paddingLeft: 18,
                    margin: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 3,
                  }}
                >
                  {vendor.requirements.failingLabels.map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — ORG + ACTIONS */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div
            style={{
              borderRadius: 24,
              padding: 16,
              background:
                "radial-gradient(circle at top right,rgba(15,23,42,0.96),rgba(15,23,42,1))",
              border: "1px solid rgba(148,163,184,0.55)",
              boxShadow: "0 22px 55px rgba(15,23,42,0.98)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 1.2,
                color: "#9ca3af",
                marginBottom: 6,
              }}
            >
              Org & Channel
            </div>
            <div
              style={{
                fontSize: 12,
                color: "#e5e7eb",
                marginBottom: 4,
              }}
            >
              Org: {orgId || "Org context active"}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "#9ca3af",
                marginBottom: 10,
              }}
            >
              When wired, this vendor profile will pull live data from your
              policy & COI tables, your workflow system, and your broker
              integrations.
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <Link href="/upload-coi">
                <button
                  style={{
                    borderRadius: 999,
                    padding: "6px 11px",
                    border: "1px solid rgba(59,130,246,0.9)",
                    background:
                      "radial-gradient(circle at top left,#3b82f6,#1d4ed8,#0f172a)",
                    color: "#e5f2ff",
                    fontSize: 11,
                    cursor: "pointer",
                  }}
                >
                  Upload COI for this vendor
                </button>
              </Link>
              <Link href="/admin/requirements">
                <button
                  style={{
                    borderRadius: 999,
                    padding: "6px 11px",
                    border: "1px solid rgba(148,163,184,0.8)",
                    background: "rgba(15,23,42,0.96)",
                    color: "#e5e7eb",
                    fontSize: 11,
                    cursor: "pointer",
                  }}
                >
                  View requirements
                </button>
              </Link>
              <Link href={`/admin/alerts?vendor=${encodeURIComponent(
                vendor.id
              )}`}
              >
                <button
                  style={{
                    borderRadius: 999,
                    padding: "6px 11px",
                    border: "1px solid rgba(248,113,113,0.8)",
                    background: "rgba(127,29,29,0.95)",
                    color: "#fecaca",
                    fontSize: 11,
                    cursor: "pointer",
                  }}
                >
                  View alerts ({vendor.alertsOpen})
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
      {/* MIDDLE + BOTTOM ROWS */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "grid",
          gridTemplateColumns: "minmax(0,1.8fr) minmax(0,1.2fr)",
          gap: 18,
        }}
      >
        {/* LEFT COLUMN: COVERAGE + TIMELINE */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* COVERAGE VS BLUEPRINT */}
          <div
            style={{
              borderRadius: 24,
              padding: 16,
              background:
                "radial-gradient(circle at top left,rgba(15,23,42,0.97),rgba(15,23,42,0.92))",
              border: "1px solid rgba(148,163,184,0.6)",
              boxShadow: "0 24px 60px rgba(15,23,42,0.98)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 8,
                alignItems: "baseline",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    color: "#9ca3af",
                    letterSpacing: 1.2,
                    marginBottom: 4,
                  }}
                >
                  Coverage vs Blueprint
                </div>
                <div style={{ fontSize: 13, color: "#e5e7eb" }}>
                  Limits by line of coverage. Quickly see where this vendor is
                  above, at, or below your required minimums.
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 10,
                display: "grid",
                gridTemplateColumns: "minmax(0,1fr)",
                gap: 8,
              }}
            >
              {vendor.coverage.map((line) => (
                <CoverageRow key={line.line} item={line} />
              ))}
            </div>
          </div>

          {/* TIMELINE */}
          <div
            style={{
              borderRadius: 24,
              padding: 16,
              background:
                "radial-gradient(circle at bottom left,rgba(15,23,42,0.97),rgba(15,23,42,0.92))",
              border: "1px solid rgba(148,163,184,0.6)",
              boxShadow: "0 24px 60px rgba(15,23,42,0.98)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                color: "#9ca3af",
                letterSpacing: 1.2,
                marginBottom: 8,
              }}
            >
              Compliance timeline
            </div>
            <div
              style={{
                fontSize: 13,
                color: "#e5e7eb",
                marginBottom: 8,
              }}
            >
              Every event — uploads, rule hits, renewals — in a single scroll.
            </div>

            <div
              style={{
                marginTop: 8,
                borderLeft: "2px solid rgba(55,65,81,0.9)",
                paddingLeft: 12,
              }}
            >
              {vendor.timeline.map((event, idx) => (
                <TimelineEvent key={event.id} event={event} isFirst={idx === 0} />
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: ALERTS + DOCS */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* ALERTS SNAPSHOT */}
          <div
            style={{
              borderRadius: 24,
              padding: 16,
              background:
                "radial-gradient(circle at top right,rgba(15,23,42,0.96),rgba(15,23,42,1))",
              border: "1px solid rgba(148,163,184,0.55)",
              boxShadow: "0 22px 55px rgba(15,23,42,0.98)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 1.2,
                color: "#9ca3af",
                marginBottom: 6,
              }}
            >
              Rules firing for this vendor
            </div>

            {vendor.alertsRecent && vendor.alertsRecent.length > 0 ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {vendor.alertsRecent.map((a) => (
                  <AlertChip key={a.id} alert={a} />
                ))}
                <Link
                  href={`/admin/alerts?vendor=${encodeURIComponent(
                    vendor.id
                  )}`}
                  style={{ alignSelf: "flex-start" }}
                >
                  <button
                    style={{
                      marginTop: 4,
                      borderRadius: 999,
                      padding: "5px 10px",
                      border: "1px solid rgba(148,163,184,0.8)",
                      background: "rgba(15,23,42,0.96)",
                      color: "#e5e7eb",
                      fontSize: 11,
                      cursor: "pointer",
                    }}
                  >
                    View all alerts ({vendor.alertsOpen})
                  </button>
                </Link>
              </div>
            ) : (
              <div
                style={{
                  fontSize: 12,
                  color: "#9ca3af",
                }}
              >
                No open alerts. When rule or requirement violations occur,
                they’ll appear here with severity, timing, and details.
              </div>
            )}
          </div>

          {/* DOCUMENTS & ENDORSEMENTS */}
          <div
            style={{
              borderRadius: 24,
              padding: 16,
              background:
                "radial-gradient(circle at top right,rgba(15,23,42,0.96),rgba(15,23,42,1))",
              border: "1px solid rgba(148,163,184,0.55)",
              boxShadow: "0 22px 55px rgba(15,23,42,0.98)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 1.2,
                color: "#9ca3af",
                marginBottom: 6,
              }}
            >
              COIs & Endorsements
            </div>

            {vendor.documents && vendor.documents.length > 0 ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {vendor.documents.map((doc) => (
                  <DocumentRow key={doc.id} doc={doc} />
                ))}
              </div>
            ) : (
              <div
                style={{
                  fontSize: 12,
                  color: "#9ca3af",
                }}
              >
                No documents uploaded yet. Once wired, this panel will show COIs,
                auto IDs, umbrella schedules, and endorsements for this vendor.
              </div>
            )}

            <div
              style={{
                marginTop: 10,
                fontSize: 10,
                color: "#6b7280",
              }}
            >
              When you click a document, we’ll open a full-screen viewer showing
              extracted text, highlighted coverage values, and linked rules.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
/* ===========================
   SUBCOMPONENTS
=========================== */

function CoverageRow({ item }) {
  const palette = {
    Critical: {
      border: "rgba(248,113,113,0.85)",
      dot: "#fb7185",
      text: "#fecaca",
    },
    High: {
      border: "rgba(250,204,21,0.85)",
      dot: "#facc15",
      text: "#fef9c3",
    },
    Medium: {
      border: "rgba(56,189,248,0.85)",
      dot: "#38bdf8",
      text: "#e0f2fe",
    },
    Low: {
      border: "rgba(34,197,94,0.85)",
      dot: "#22c55e",
      text: "#bbf7d0",
    },
  }[item.severity] || {
    border: "rgba(148,163,184,0.85)",
    dot: "#9ca3af",
    text: "#e5e7eb",
  };

  return (
    <div
      style={{
        borderRadius: 14,
        padding: "8px 10px",
        background: "rgba(15,23,42,0.96)",
        border: `1px solid ${palette.border}`,
        display: "grid",
        gridTemplateColumns: "minmax(0,1.4fr) 0.9fr 0.9fr",
        gap: 10,
        alignItems: "center",
      }}
    >
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 4,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: palette.dot,
              boxShadow: `0 0 10px ${palette.dot}`,
            }}
          />
          <span
            style={{
              fontSize: 12,
              color: "#e5e7eb",
              fontWeight: 500,
            }}
          >
            {item.line}
          </span>
        </div>
        <div style={{ fontSize: 11, color: "#9ca3af" }}>
          Field: <code>{item.field}</code>
        </div>
      </div>

      <div>
        <div
          style={{
            fontSize: 11,
            color: "#9ca3af",
            marginBottom: 2,
          }}
        >
          Required
        </div>
        <div style={{ fontSize: 12, color: "#e5e7eb" }}>{item.required}</div>
      </div>

      <div>
        <div
          style={{
            fontSize: 11,
            color: "#9ca3af",
            marginBottom: 2,
          }}
        >
          Detected
        </div>
        <div style={{ fontSize: 12, color: "#e5e7eb" }}>{item.actual}</div>
        <div
          style={{
            fontSize: 11,
            color: palette.text,
            marginTop: 4,
          }}
        >
          {item.status}
        </div>
      </div>
    </div>
  );
}

/* ===========================
   TIMELINE EVENT
=========================== */

function TimelineEvent({ event, isFirst }) {
  const palette = {
    Critical: "#fb7185",
    High: "#facc15",
    Medium: "#38bdf8",
    Low: "#34d399",
    Info: "#93c5fd",
  }[event.severity] || "#9ca3af";

  return (
    <div
      style={{
        position: "relative",
        marginBottom: 14,
        paddingLeft: 10,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: -10,
          top: 4,
          width: 10,
          height: 10,
          borderRadius: 999,
          background: palette,
          boxShadow: `0 0 10px ${palette}`,
        }}
      />
      <div
        style={{
          fontSize: 11,
          color: "#9ca3af",
        }}
      >
        {formatRelative(event.timestamp)}
      </div>
      <div
        style={{
          fontSize: 12,
          color: "#e5e7eb",
          marginTop: 2,
        }}
      >
        {event.label}
      </div>
      <div
        style={{
          fontSize: 11,
          color: "#9ca3af",
          marginTop: 2,
        }}
      >
        {event.detail}
      </div>
    </div>
  );
}

/* ===========================
   ALERT CHIP
=========================== */

function AlertChip({ alert }) {
  const palette = {
    Critical: {
      border: "rgba(248,113,113,0.85)",
      bg: "rgba(127,29,29,0.9)",
      text: "#fecaca",
      dot: "#fb7185",
    },
    High: {
      border: "rgba(250,204,21,0.85)",
      bg: "rgba(113,63,18,0.9)",
      text: "#fef9c3",
      dot: "#facc15",
    },
    Medium: {
      border: "rgba(56,189,248,0.85)",
      bg: "rgba(15,23,42,0.9)",
      text: "#e0f2fe",
      dot: "#38bdf8",
    },
    Low: {
      border: "rgba(34,197,94,0.85)",
      bg: "rgba(22,101,52,0.9)",
      text: "#bbf7d0",
      dot: "#22c55e",
    },
  }[alert.severity] || {
    border: "rgba(148,163,184,0.85)",
    bg: "rgba(15,23,42,0.9)",
    text: "#e5e7eb",
    dot: "#9ca3af",
  };

  return (
    <div
      style={{
        borderRadius: 14,
        padding: "8px 10px",
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 2,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: palette.dot,
                boxShadow: `0 0 10px ${palette.dot}`,
              }}
            />
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: palette.text,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {alert.title}
            </span>
          </div>
          <div
            style={{
              fontSize: 11,
              color: "#f9fafb",
            }}
          >
            {alert.message}
          </div>
        </div>

        <div
          style={{
            fontSize: 10,
            color: "#e5e7eb",
            textAlign: "right",
            flexShrink: 0,
          }}
        >
          {alert.severity} · {alert.type}
          <br />
          {formatRelative(alert.created)}
        </div>
      </div>
    </div>
  );
}

/* ===========================
   END OF FILE — SAFE CLOSE
=========================== */

// VendorProfilePage is default export.
// All subcomponents & mock data are defined above.
// Wire this to your real backend when ready.
//
// File ends here.
