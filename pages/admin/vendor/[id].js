import { useRouter } from "next/router";
export default function VendorProfilePage() {
  const router = useRouter();
  const { id } = router.query;

  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  // Default summary fallback (never crash even if missing)
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
     LOAD VENDOR — WITH FULL NORMALIZATION (NO CRASHES)
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

        // ⭐ Patch ALL possible missing fields so UI never breaks
        const normalized = {
          ...v,
          // identity
          name: v.name || "Unnamed Vendor",
          category: v.category || "General Services",
          location: v.location || v.address || "",
          contactEmail: v.contactEmail || v.email || "",

          // tags
          tags: Array.isArray(v.tags) ? v.tags : [],

          // compliance basics
          complianceScore: v.complianceScore ?? 0,
          status: v.status || "Unknown",
          riskLevel: v.riskLevel || "Medium",
          alertsOpen: v.alertsOpen ?? 0,
          criticalIssues: v.criticalIssues ?? 0,

          // last updated
          lastUpdated: v.lastUpdated || new Date().toISOString(),

          // sections — ALWAYS arrays
          coverage: Array.isArray(v.coverage) ? v.coverage : [],
          endorsements: Array.isArray(v.endorsements) ? v.endorsements : [],
          documents: Array.isArray(v.documents) ? v.documents : [],
          rulesFired: Array.isArray(v.rulesFired) ? v.rulesFired : [],
          timeline: Array.isArray(v.timeline) ? v.timeline : [],

          // requirements summary
          requirementsSummary: v.requirementsSummary || defaultSummary,
        };

        if (!cancelled) setVendor(normalized);
      } catch (err) {
        console.error("Vendor API error — using fallback:", err);

        if (!cancelled) {
          setLoadError("Using demo vendor profile until real data is wired.");
          const fallback =
            vendorProfiles[id] || vendorProfiles["default"] || null;
          setVendor(fallback);
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

  // Loading state
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
        <div style={{ fontSize: 14, color: "#e5e7eb" }}>
          {loading ? "Loading vendor profile…" : "No vendor found."}
        </div>
      </div>
    );
  }
  const [outreachOpen, setOutreachOpen] = useState(false);

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

  // PASS RATES (safe defaults)
  const coveragePassRate =
    reqSummary.byType?.coverage?.passed + reqSummary.byType?.coverage?.failed ===
    0
      ? 0
      : Math.round(
          (reqSummary.byType.coverage.passed /
            (reqSummary.byType.coverage.passed +
              reqSummary.byType.coverage.failed)) *
            100
        );

  const endorsementPassRate =
    reqSummary.byType?.endorsements?.passed +
      reqSummary.byType?.endorsements?.failed ===
    0
      ? 0
      : Math.round(
          (reqSummary.byType.endorsements.passed /
            (reqSummary.byType.endorsements.passed +
              reqSummary.byType.endorsements.failed)) *
            100
        );

  const docsPassRate =
    reqSummary.byType?.documents?.passed + reqSummary.byType?.documents?.failed ===
    0
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
      {/* ===========================
          HEADER
      ============================ */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 24,
          marginBottom: 24,
        }}
      >
        {/* LEFT — Vendor identity + AI summary */}
        <div style={{ flex: 1 }}>
          {/* IDENTITY HEADER */}
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

          {/* NAME + CATEGORY */}
          <h1
            style={{
              fontSize: 26,
              fontWeight: 600,
              margin: 0,
              letterSpacing: 0.1,
            }}
          >
            {vendor.name || "Unnamed Vendor"}{" "}
            <span
              style={{
                fontSize: 14,
                color: "#9ca3af",
                fontWeight: 400,
              }}
            >
              · {vendor.category || "General Services"}
            </span>
          </h1>

          {/* TAGS + LOCATION */}
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
            {vendor.location ? (
              <span style={{ color: "#9ca3af" }}>{vendor.location}</span>
            ) : null}

            {(vendor.tags || []).map((tag) => (
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

          {/* AI SUMMARY */}
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
              "AI summary will appear when rules + requirements are fully wired."}
          </div>

          {/* ERROR (if using fallback) */}
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

          {/* LAST UPDATED */}
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

        {/* ===========================
            RIGHT — COMPLIANCE SCORE CARD
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
              <span>✨</span>
              <span>AI outreach</span>
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
            {/* Circle Gauge */}
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

            {/* STATUS */}
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
                  Risk: {vendor.riskLevel || "Medium"}
                </span>
              </div>

              <div
                style={{
                  fontSize: 11,
                  color: "#9ca3af",
                }}
              >
                {vendor.alertsOpen ?? 0} open alerts ·{" "}
                {vendor.criticalIssues ?? 0} critical.
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
              Coverage, endorsements, documents, logical checks.
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
                {coveragePassRate}% requirements met
              </div>
            </div>

            {/* Coverage grid */}
            <div
              style={{
                marginTop: 6,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))",
                gap: 8,
              }}
            >
              {(vendor.coverage ?? []).length > 0 ? (
                (vendor.coverage ?? []).map((cov) => (
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
                  No coverage data available yet. Once policies and COIs are
                  parsed, they will appear here.
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
                {(vendor.endorsements ?? []).length > 0 ? (
                  (vendor.endorsements ?? []).map((e) => (
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
                    No endorsement evaluations yet.
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
                {(vendor.documents ?? []).length > 0 ? (
                  (vendor.documents ?? []).map((doc) => (
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
                    No documents found. Uploads will appear here.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
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
              RULES FIRED PANEL
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
              Live view from your Elite Rule Engine. Critical issues should be
              resolved before vendor approval.
            </div>

            {/* Rule list */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                maxHeight: 220,
                overflowY: "auto",
              }}
            >
              {(vendor.rulesFired ?? []).length > 0 ? (
                (vendor.rulesFired ?? []).map((rule) => (
                  <RuleRow key={rule.id || rule.label} rule={rule} />
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
                  No rules have fired yet for this vendor.
                </div>
              )}
            </div>
          </div>

          {/* ===========================
              TIMELINE PANEL
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
              Every event — uploads, rule triggers, expirations — in one list.
            </div>

            {/* TIMELINE LIST */}
            <div
              style={{
                position: "relative",
                flex: 1,
                overflowY: "auto",
                paddingTop: 2,
              }}
            >
              {/* Vertical guide line */}
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
                {(vendor.timeline ?? []).length > 0 ? (
                  (vendor.timeline ?? []).map((evt, idx) => (
                    <TimelineItem
                      key={evt.id || idx}
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
                    Timeline will populate as rules fire, documents are uploaded,
                    and expirations are detected.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===========================
          AI OUTREACH SLIDE-OVER
      ============================ */}
      <AiOutreachDrawer
        open={outreachOpen}
        onClose={() => setOutreachOpen(false)}
        vendor={vendor}
        coverage={vendor.coverage ?? []}
        endorsements={vendor.endorsements ?? []}
        documents={vendor.documents ?? []}
        rules={vendor.rulesFired ?? []}
        requirementsSummary={reqSummary}
      />

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
