// pages/admin/requirements.js
import { useMemo, useState } from "react";
import { useRole } from "../../lib/useRole";
import { useOrg } from "../../context/OrgContext";

/* ===========================
   SEED DATA (MOCKED)
   Later you can swap this for real API data
=========================== */

const initialRequirements = [
  {
    id: "req-gl",
    line: "General Liability",
    code: "GL",
    requiredLimits: {
      eachOccurrence: 1000000,
      aggregate: 2000000,
    },
    actualLimits: {
      eachOccurrence: 1000000,
      aggregate: 2000000,
    },
    status: "Pass",
    missingItems: [],
    aiExtractedFrom: "COI-2025-01.pdf",
    aiConfidence: 0.96,
    lastUpdated: "2025-11-10T14:23:00Z",
    notes:
      "Limits meet or exceed org minimums. No endorsements missing for this line.",
  },
  {
    id: "req-auto",
    line: "Auto Liability",
    code: "AUTO",
    requiredLimits: {
      combinedSingleLimit: 1000000,
    },
    actualLimits: {
      combinedSingleLimit: 500000,
    },
    status: "Fail",
    missingItems: [],
    aiExtractedFrom: "COI-2025-01.pdf",
    aiConfidence: 0.88,
    lastUpdated: "2025-11-09T09:10:00Z",
    notes:
      "Combined single limit below required threshold. Flagged for broker follow-up.",
  },
  {
    id: "req-wc",
    line: "Workers’ Compensation",
    code: "WC",
    requiredLimits: {
      statutory: true,
      employersLiabilityEachAccident: 500000,
    },
    actualLimits: {
      statutory: true,
      employersLiabilityEachAccident: 500000,
    },
    status: "Pass",
    missingItems: [],
    aiExtractedFrom: "COI-2025-02.pdf",
    aiConfidence: 0.92,
    lastUpdated: "2025-11-08T16:45:00Z",
    notes:
      "Workers’ comp is statutory in all listed states. Employers liability meets minimum.",
  },
  {
    id: "req-umbrella",
    line: "Umbrella / Excess",
    code: "UMB",
    requiredLimits: {
      eachOccurrence: 2000000,
    },
    actualLimits: null,
    status: "Missing",
    missingItems: ["No umbrella / excess policy located"],
    aiExtractedFrom: null,
    aiConfidence: null,
    lastUpdated: null,
    notes:
      "Requirement configured but no umbrella / excess policy detected in uploaded COIs.",
  },
  {
    id: "req-ai",
    line: "Additional Insured Endorsement",
    code: "AI",
    requiredLimits: {
      wordingRequired: true,
    },
    actualLimits: {
      wordingFound: false,
    },
    status: "Fail",
    missingItems: ["Required AI wording not located in endorsements"],
    aiExtractedFrom: "Endorsement-A-2025.pdf",
    aiConfidence: 0.81,
    lastUpdated: "2025-11-11T11:32:00Z",
    notes:
      "Endorsement references additional insured status, but required wording is incomplete.",
  },
];

/* ===========================
   HELPERS
=========================== */

function statusMeta(status) {
  switch (status) {
    case "Pass":
      return {
        label: "Compliant",
        bg: "rgba(22,163,74,0.14)",
        border: "rgba(22,163,74,0.9)",
        text: "#bbf7d0",
        dot: "#4ade80",
      };
    case "Fail":
      return {
        label: "Not compliant",
        bg: "rgba(248,113,113,0.12)",
        border: "rgba(248,113,113,0.9)",
        text: "#fecaca",
        dot: "#f97316",
      };
    case "Missing":
      return {
        label: "Missing",
        bg: "rgba(251,191,36,0.12)",
        border: "rgba(251,191,36,0.9)",
        text: "#fef9c3",
        dot: "#facc15",
      };
    default:
      return {
        label: status,
        bg: "rgba(148,163,184,0.14)",
        border: "rgba(148,163,184,0.9)",
        text: "#e5e7eb",
        dot: "#e5e7eb",
      };
  }
}

function formatLimit(value) {
  if (value == null) return "—";
  if (typeof value === "boolean") return value ? "Statutory" : "No";
  if (typeof value === "number") {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}k`;
    }
    return `$${value.toLocaleString()}`;
  }
  return String(value);
}

function formatDateShort(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "2-digit",
  });
}

function percentSafe(n) {
  if (Number.isNaN(n) || !Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return Math.round(n);
}

/* ===========================
   MAIN PAGE
=========================== */

export default function RequirementsPage() {
  const { isAdmin, isManager } = useRole();
  const { orgId } = useOrg();

  const [requirements] = useState(initialRequirements);
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  const canEdit = isAdmin || isManager;

  const filteredRequirements = useMemo(() => {
    return requirements.filter((req) => {
      if (statusFilter !== "All" && req.status !== statusFilter) return false;
      if (!searchTerm) return true;
      const haystack = [
        req.line,
        req.code,
        req.notes,
        req.aiExtractedFrom,
        ...(req.missingItems || []),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(searchTerm.toLowerCase());
    });
  }, [requirements, statusFilter, searchTerm]);

  const metrics = useMemo(() => {
    const total = requirements.length;
    const pass = requirements.filter((r) => r.status === "Pass").length;
    const fail = requirements.filter((r) => r.status === "Fail").length;
    const missing = requirements.filter((r) => r.status === "Missing").length;

    const complianceScore =
      total === 0 ? 0 : percentSafe((pass / total) * 100);
    const riskScore =
      total === 0
        ? 0
        : percentSafe(((fail + missing * 1.3) / total) * 100);

    return {
      total,
      pass,
      fail,
      missing,
      complianceScore,
      riskScore,
    };
  }, [requirements]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left,#0f172a 0,#020617 55%,#020617 100%)",
        padding: "30px 40px 40px",
        color: "#e5e7eb",
        fontFamily:
          "-apple-system,BlinkMacSystemFont,'SF Pro Text','Segoe UI',system-ui,sans-serif",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 18,
          marginBottom: 20,
        }}
      >
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <div
            style={{
              padding: 10,
              borderRadius: 999,
              background:
                "radial-gradient(circle at 30% 0,#38bdf8 0,#1e3a8a 55%,#020617 100%)",
              boxShadow: "0 0 40px rgba(56,189,248,0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: 22 }}>📋</span>
          </div>
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "4px 10px",
                borderRadius: 999,
                border: "1px solid rgba(148,163,184,0.4)",
                marginBottom: 6,
                background:
                  "linear-gradient(120deg,rgba(15,23,42,0.9),rgba(15,23,42,0))",
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  letterSpacing: 1.2,
                  textTransform: "uppercase",
                  color: "#9ca3af",
                }}
              >
                Vendor Requirements
              </span>
              <span
                style={{
                  fontSize: 10,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  color: "#a5b4fc",
                }}
              >
                Limits • Documents • AI Extract
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
              One screen for{" "}
              <span
                style={{
                  background:
                    "linear-gradient(90deg,#38bdf8,#e0f2fe,#a5b4fc)",
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                }}
              >
                every required coverage
              </span>{" "}
              on this vendor.
            </h1>
            <p
              style={{
                marginTop: 6,
                marginBottom: 0,
                fontSize: 13,
                color: "#cbd5f5",
                maxWidth: 640,
              }}
            >
              Compare required vs actual limits, see what&apos;s missing,
              and review what the AI pulled from each COI and endorsement.
            </p>
          </div>
        </div>

        {/* HEADER SIDE INFO */}
        <div style={{ textAlign: "right", minWidth: 180 }}>
          <div
            style={{
              fontSize: 11,
              color: "#9ca3af",
              marginBottom: 4,
            }}
          >
            Org context
          </div>
          <div
            style={{
              fontSize: 12,
              color: "#e5e7eb",
              marginBottom: 10,
            }}
          >
            {orgId ? `Org: ${orgId}` : "Active organization loaded"}
          </div>
          {!canEdit && (
            <div
              style={{
                fontSize: 11,
                color: "#facc15",
                padding: "6px 9px",
                borderRadius: 10,
                border: "1px solid rgba(251,191,36,0.6)",
                background: "rgba(113,63,18,0.5)",
              }}
            >
              Read-only view. Only admins/managers can edit requirements.
            </div>
          )}
        </div>
      </div>

      {/* TOP STRIP METRICS + FILTERS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,2.1fr) minmax(0,1.5fr)",
          gap: 18,
          marginBottom: 18,
          alignItems: "stretch",
        }}
      >
        {/* Gauge / summary */}
        <div
          style={{
            borderRadius: 22,
            padding: 14,
            background:
              "radial-gradient(circle at top left,rgba(15,23,42,0.96),rgba(15,23,42,0.9))",
            border: "1px solid rgba(148,163,184,0.55)",
            boxShadow: "0 22px 55px rgba(15,23,42,0.98)",
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          {/* Gauge */}
          <div
            style={{
              position: "relative",
              width: 110,
              height: 110,
              borderRadius: "50%",
              background:
                "conic-gradient(from 220deg,#22c55e,#eab308,#fb7185,#020617)",
              padding: 4,
              boxShadow:
                "0 0 55px rgba(34,197,94,0.35),0 0 120px rgba(37,99,235,0.25)",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 10,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle at 30% 0,#020617,#020617 65%,#000)",
              }}
            />
            <div
              style={{
                position: "relative",
                zIndex: 1,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: "#e5e7eb",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  color: "#9ca3af",
                  marginBottom: 4,
                }}
              >
                Coverage
              </div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 600,
                  background:
                    "linear-gradient(120deg,#22c55e,#bef264,#eab308)",
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                  marginBottom: 2,
                }}
              >
                {metrics.complianceScore}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "#9ca3af",
                }}
              >
                % requirements passing
              </div>
            </div>
          </div>

          {/* Numbers */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                gap: 14,
                marginBottom: 8,
                flexWrap: "wrap",
              }}
            >
              <MetricChip
                label="Total requirements"
                value={metrics.total}
                tone="neutral"
              />
              <MetricChip
                label="Passing"
                value={metrics.pass}
                tone="good"
              />
              <MetricChip
                label="Not compliant"
                value={metrics.fail}
                tone="bad"
              />
              <MetricChip
                label="Missing"
                value={metrics.missing}
                tone="warn"
              />
            </div>
            <div
              style={{
                fontSize: 11,
                color: "#9ca3af",
                lineHeight: 1.4,
              }}
            >
              This view reflects only this vendor&apos;s requirement profile.
              Rule engine flags, AI extractions, and manual overrides will
              surface here in real time once wired to your backend.
            </div>
          </div>
        </div>

        {/* Filters */}
        <div
          style={{
            borderRadius: 22,
            padding: 14,
            background:
              "linear-gradient(135deg,rgba(15,23,42,0.96),rgba(15,23,42,0.9))",
            border: "1px solid rgba(148,163,184,0.4)",
            boxShadow: "0 22px 50px rgba(15,23,42,0.98)",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div
            style={{
              fontSize: 11,
              letterSpacing: 1.2,
              textTransform: "uppercase",
              color: "#9ca3af",
            }}
          >
            Filters
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              alignItems: "center",
            }}
          >
            {/* Status filter */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "3px 4px",
                borderRadius: 999,
                background: "rgba(15,23,42,0.9)",
                border: "1px solid rgba(51,65,85,0.9)",
              }}
            >
              {["All", "Pass", "Fail", "Missing"].map((status) => {
                const active = statusFilter === status;
                return (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    style={{
                      borderRadius: 999,
                      border: "none",
                      padding: "4px 9px",
                      fontSize: 11,
                      cursor: "pointer",
                      background: active
                        ? "radial-gradient(circle at top,#4ade80,#16a34a,#14532d)"
                        : "transparent",
                      color: active ? "#ecfdf5" : "#cbd5f5",
                    }}
                  >
                    {status === "Pass"
                      ? "Compliant"
                      : status === "Fail"
                      ? "Not compliant"
                      : status}
                  </button>
                );
              })}
            </div>

            {/* Search */}
            <div
              style={{
                flex: 1,
                minWidth: 160,
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 9px",
                borderRadius: 999,
                border: "1px solid rgba(51,65,85,0.9)",
                background: "rgba(15,23,42,0.95)",
              }}
            >
              <span style={{ fontSize: 13, color: "#6b7280" }}>🔎</span>
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search coverage lines, notes, AI source…"
                style={{
                  flex: 1,
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  color: "#e5e7eb",
                  fontSize: 12,
                }}
              />
            </div>
          </div>
          <div
            style={{
              fontSize: 10,
              color: "#6b7280",
            }}
          >
            Tip: later you can add toggles here for{" "}
            <span style={{ color: "#e5e7eb" }}>“Rule engine only”</span>,{" "}
            <span style={{ color: "#e5e7eb" }}>“Manual overrides”</span>, or{" "}
            <span style={{ color: "#e5e7eb" }}>“AI low confidence”</span>.
          </div>
        </div>
      </div>

      {/* MAIN LAYOUT: REQUIREMENTS GRID + SIDE PANEL */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 2.2fr) minmax(0, 1.3fr)",
          gap: 18,
          alignItems: "stretch",
        }}
      >
        {/* LEFT — REQUIREMENTS GRID */}
        <div
          style={{
            borderRadius: 24,
            padding: 14,
            background:
              "radial-gradient(circle at top left,rgba(15,23,42,0.97),rgba(15,23,42,0.92))",
            border: "1px solid rgba(148,163,184,0.6)",
            boxShadow: "0 24px 60px rgba(15,23,42,0.98)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 10,
              marginBottom: 10,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: 1.2,
                  color: "#9ca3af",
                  marginBottom: 4,
                }}
              >
                Coverage Requirements
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "#e5e7eb",
                }}
              >
                Each tile represents one line of coverage and its requirement
                profile for this vendor.
              </div>
            </div>
            <div style={{ fontSize: 11, color: "#6b7280" }}>
              {filteredRequirements.length} of {requirements.length} visible
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))",
              gap: 12,
            }}
          >
            {filteredRequirements.map((req) => (
              <RequirementCard
                key={req.id}
                requirement={req}
                canEdit={canEdit}
              />
            ))}

            {filteredRequirements.length === 0 && (
              <div
                style={{
                  gridColumn: "1 / -1",
                  borderRadius: 18,
                  border: "1px dashed rgba(75,85,99,0.9)",
                  padding: "16px 14px",
                  fontSize: 12,
                  color: "#9ca3af",
                }}
              >
                No requirements match your filters. Try changing status or
                clearing your search.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — RISK PANEL */}
        <div
          style={{
            borderRadius: 24,
            padding: 14,
            background:
              "radial-gradient(circle at top right,rgba(15,23,42,0.96),rgba(15,23,42,1))",
            border: "1px solid rgba(148,163,184,0.5)",
            boxShadow: "0 24px 60px rgba(15,23,42,0.98)",
            display: "flex",
            flexDirection: "column",
            gap: 12,
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
            Risk Snapshot
          </div>

          {/* Risk bar */}
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                color: "#9ca3af",
                marginBottom: 4,
              }}
            >
              <span>Unresolved requirement risk</span>
              <span>{metrics.riskScore}/100</span>
            </div>
            <div
              style={{
                width: "100%",
                height: 8,
                borderRadius: 999,
                background: "rgba(15,23,42,1)",
                overflow: "hidden",
                border: "1px solid rgba(30,64,175,0.9)",
              }}
            >
              <div
                style={{
                  width: `${metrics.riskScore}%`,
                  height: "100%",
                  background:
                    "linear-gradient(90deg,#f97316,#fb7185,#ef4444,#7f1d1d)",
                  boxShadow: "0 0 20px rgba(248,113,113,0.7)",
                }}
              />
            </div>
          </div>

          {/* Issue list */}
          <div
            style={{
              borderRadius: 18,
              padding: 10,
              background: "rgba(15,23,42,0.96)",
              border: "1px solid rgba(55,65,81,0.95)",
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: "#e5e7eb",
                marginBottom: 6,
              }}
            >
              Requirements needing attention
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {requirements
                .filter((r) => r.status === "Fail" || r.status === "Missing")
                .map((r) => (
                  <div
                    key={r.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 8,
                      fontSize: 11,
                      padding: "6px 7px",
                      borderRadius: 12,
                      background: "rgba(15,23,42,0.9)",
                      border: "1px solid rgba(75,85,99,0.9)",
                    }}
                  >
                    <div>
                      <div style={{ color: "#e5e7eb", marginBottom: 2 }}>
                        {r.line}
                      </div>
                      <div
                        style={{
                          color: "#9ca3af",
                          whiteSpace: "nowrap",
                          textOverflow: "ellipsis",
                          overflow: "hidden",
                          maxWidth: 210,
                        }}
                      >
                        {r.notes || "No notes yet."}
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-end",
                        gap: 4,
                        flexShrink: 0,
                      }}
                    >
                      <StatusBadgeInline status={r.status} />
                      <div
                        style={{
                          fontSize: 10,
                          color: "#6b7280",
                        }}
                      >
                        {r.lastUpdated
                          ? `Updated ${formatDateShort(r.lastUpdated)}`
                          : "Not reviewed yet"}
                      </div>
                    </div>
                  </div>
                ))}

              {requirements.filter(
                (r) => r.status === "Fail" || r.status === "Missing"
              ).length === 0 && (
                <div
                  style={{
                    fontSize: 11,
                    color: "#22c55e",
                  }}
                >
                  No failing or missing requirements for this vendor. 🎉
                </div>
              )}
            </div>
          </div>

          {/* AI confidence summary */}
          <div
            style={{
              borderRadius: 18,
              padding: 10,
              background: "rgba(15,23,42,0.96)",
              border: "1px solid rgba(55,65,81,0.95)",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
                alignItems: "center",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: "#e5e7eb",
                }}
              >
                AI extraction confidence
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "#9ca3af",
                }}
              >
                Based on seeded mock data
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
              }}
            >
              {requirements
                .filter((r) => r.aiConfidence != null)
                .map((r) => (
                  <div
                    key={r.id}
                    style={{
                      borderRadius: 999,
                      padding: "3px 8px",
                      fontSize: 11,
                      border: "1px solid rgba(37,99,235,0.8)",
                      background: "rgba(15,23,42,0.9)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: 999,
                        background:
                          r.aiConfidence >= 0.9
                            ? "#22c55e"
                            : r.aiConfidence >= 0.8
                            ? "#eab308"
                            : "#f97316",
                        boxShadow: "0 0 12px rgba(96,165,250,0.8)",
                      }}
                    />
                    <span>{r.code}</span>
                    <span style={{ color: "#9ca3af" }}>
                      {(r.aiConfidence * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}

              {requirements.filter((r) => r.aiConfidence != null).length ===
                0 && (
                <div
                  style={{
                    fontSize: 11,
                    color: "#9ca3af",
                  }}
                >
                  No AI-extracted lines yet. Once wired, each coverage line will
                  show confidence here.
                </div>
              )}
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

function MetricChip({ label, value, tone }) {
  let border;
  let dot;
  switch (tone) {
    case "good":
      border = "rgba(34,197,94,0.85)";
      dot = "#4ade80";
      break;
    case "bad":
      border = "rgba(248,113,113,0.85)";
      dot = "#fb7185";
      break;
    case "warn":
      border = "rgba(234,179,8,0.85)";
      dot = "#facc15";
      break;
    default:
      border = "rgba(148,163,184,0.85)";
      dot = "#9ca3af";
  }

  return (
    <div
      style={{
        borderRadius: 999,
        padding: "4px 9px",
        border: `1px solid ${border}`,
        background: "rgba(15,23,42,0.92)",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 11,
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: 999,
          background: dot,
          boxShadow: `0 0 10px ${dot}`,
          flexShrink: 0,
        }}
      />
      <span style={{ color: "#9ca3af" }}>{label}</span>
      <span style={{ color: "#e5e7eb", fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function RequirementCard({ requirement, canEdit }) {
  const meta = statusMeta(requirement.status);

  return (
    <div
      style={{
        position: "relative",
        borderRadius: 18,
        padding: 11,
        background:
          "radial-gradient(circle at top left,rgba(15,23,42,0.98),rgba(15,23,42,0.92))",
        border: `1px solid ${meta.border}`,
        boxShadow: "0 16px 40px rgba(15,23,42,0.95)",
        overflow: "hidden",
      }}
    >
      {/* subtle glow */}
      <div
        style={{
          position: "absolute",
          inset: -2,
          background:
            "radial-gradient(circle at -10% -20%,rgba(56,189,248,0.22),transparent 55%)",
          opacity: 0.9,
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Header row */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 10,
            marginBottom: 6,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 3,
              }}
            >
              <div
                style={{
                  borderRadius: 999,
                  padding: "2px 8px",
                  fontSize: 11,
                  color: "#e5e7eb",
                  border: "1px solid rgba(148,163,184,0.8)",
                  background: "rgba(15,23,42,0.96)",
                }}
              >
                {requirement.code}
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#e5e7eb",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                  overflow: "hidden",
                }}
              >
                {requirement.line}
              </div>
            </div>
            <div
              style={{
                fontSize: 11,
                color: "#9ca3af",
              }}
            >
              Required vs actual coverage for this vendor.
            </div>
          </div>

          {/* Status badge */}
          <div
            style={{
              alignSelf: "flex-start",
            }}
          >
            <StatusBadge status={requirement.status} />
          </div>
        </div>

        {/* Limits rows */}
        <div
          style={{
            marginTop: 6,
            borderRadius: 12,
            border: "1px solid rgba(31,41,55,0.95)",
            background: "rgba(15,23,42,0.96)",
            padding: "7px 8px",
            fontSize: 11,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0,1.1fr) minmax(0,1.1fr)",
              gap: 6,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 10,
                  color: "#9ca3af",
                  marginBottom: 3,
                }}
              >
                Required
              </div>
              <LimitList limits={requirement.requiredLimits} />
            </div>
            <div>
              <div
                style={{
                  fontSize: 10,
                  color: "#9ca3af",
                  marginBottom: 3,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 6,
                }}
              >
                <span>Actual</span>
                {requirement.aiExtractedFrom && (
                  <span
                    style={{
                      color: "#64748b",
                      whiteSpace: "nowrap",
                      textOverflow: "ellipsis",
                      overflow: "hidden",
                      maxWidth: 120,
                    }}
                  >
                    From {requirement.aiExtractedFrom}
                  </span>
                )}
              </div>
              {requirement.actualLimits ? (
                <LimitList limits={requirement.actualLimits} />
              ) : (
                <div
                  style={{
                    fontSize: 11,
                    color: "#facc15",
                  }}
                >
                  No policy detected for this line.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notes / missing */}
        <div
          style={{
            marginTop: 7,
            fontSize: 11,
            color: "#9ca3af",
          }}
        >
          {requirement.missingItems && requirement.missingItems.length > 0 && (
            <div
              style={{
                marginBottom: 4,
                color: "#fed7aa",
              }}
            >
              {requirement.missingItems.map((item, idx) => (
                <div key={idx}>• {item}</div>
              ))}
            </div>
          )}
          {requirement.notes && (
            <div
              style={{
                maxHeight: 50,
                overflow: "hidden",
              }}
            >
              {requirement.notes}
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div
          style={{
            marginTop: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: "#6b7280",
            }}
          >
            {requirement.lastUpdated
              ? `Last reviewed ${formatDateShort(requirement.lastUpdated)}`
              : "Not reviewed yet"}
          </div>
          <div
            style={{
              display: "flex",
              gap: 6,
            }}
          >
            <button
              disabled={!canEdit}
              style={{
                borderRadius: 999,
                padding: "3px 8px",
                border: "1px solid rgba(148,163,184,0.8)",
                background: "rgba(15,23,42,0.96)",
                color: "#e5e7eb",
                fontSize: 10,
                cursor: canEdit ? "pointer" : "not-allowed",
              }}
            >
              View source
            </button>
            <button
              disabled={!canEdit}
              style={{
                borderRadius: 999,
                padding: "3px 8px",
                border: "1px solid rgba(59,130,246,0.9)",
                background:
                  "radial-gradient(circle at top left,#1d4ed8,#1e40af,#020617)",
                color: "#e0f2fe",
                fontSize: 10,
                cursor: canEdit ? "pointer" : "not-allowed",
                opacity: canEdit ? 1 : 0.6,
              }}
            >
              Fix / override
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LimitList({ limits }) {
  if (!limits) {
    return (
      <div
        style={{
          fontSize: 11,
          color: "#9ca3af",
        }}
      >
        —
      </div>
    );
  }
  const entries = Object.entries(limits);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      {entries.map(([key, value]) => (
        <div
          key={key}
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 6,
          }}
        >
          <span
            style={{
              color: "#6b7280",
              textTransform: "capitalize",
            }}
          >
            {key
              .replace(/([A-Z])/g, " $1")
              .replace(/^./, (s) => s.toUpperCase())}
          </span>
          <span
            style={{
              color: "#e5e7eb",
            }}
          >
            {formatLimit(value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }) {
  const meta = statusMeta(status);
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 8px",
        borderRadius: 999,
        background: meta.bg,
        border: `1px solid ${meta.border}`,
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: 999,
          background: meta.dot,
          boxShadow: `0 0 12px ${meta.dot}`,
        }}
      />
      <span
        style={{
          fontSize: 10,
          letterSpacing: 0.8,
          textTransform: "uppercase",
          color: meta.text,
        }}
      >
        {meta.label}
      </span>
    </div>
  );
}

function StatusBadgeInline({ status }) {
  const meta = statusMeta(status);
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "2px 7px",
        borderRadius: 999,
        background: meta.bg,
        border: `1px solid ${meta.border}`,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: meta.dot,
        }}
      />
      <span
        style={{
          fontSize: 10,
          color: meta.text,
        }}
      >
        {meta.label}
      </span>
    </div>
  );
}
