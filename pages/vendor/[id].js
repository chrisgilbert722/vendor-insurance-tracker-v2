// pages/vendor/[id].js
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import EliteComplianceBlock from "../../components/elite/EliteComplianceBlock";
import VendorProgressBar from "../../components/vendor/VendorProgressBar";

/* -------------------- SHARED RISK HELPERS -------------------- */
function parseExpiration(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  const [mm, dd, yyyy] = parts;
  return new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
}

function computeDaysLeft(dateStr) {
  const d = parseExpiration(dateStr);
  if (!d) return null;
  return Math.floor((d - new Date()) / (1000 * 60 * 60 * 24));
}

function computeExpirationRisk(policy) {
  if (!policy) {
    return {
      daysLeft: null,
      severity: "unknown",
      baseScore: 0,
      flags: ["Missing policy"],
    };
  }

  const daysLeft = computeDaysLeft(policy.expiration_date);
  const flags = [];

  if (daysLeft === null) {
    return {
      daysLeft: null,
      severity: "unknown",
      baseScore: 0,
      flags: ["Missing expiration date"],
    };
  }

  let severity = "ok";
  let baseScore = 95;

  if (daysLeft < 0) {
    severity = "expired";
    baseScore = 20;
    flags.push("Policy expired");
  } else if (daysLeft <= 30) {
    severity = "critical";
    baseScore = 40;
    flags.push("Expires within 30 days");
  } else if (daysLeft <= 90) {
    severity = "warning";
    baseScore = 70;
    flags.push("Expires within 90 days");
  }

  return { daysLeft, severity, baseScore, flags };
}

/* -------------------- AI UNDERWRITING RISK SCORE -------------------- */
function computeVendorAiRisk({ primaryPolicy, elite, compliance }) {
  const exp = computeExpirationRisk(primaryPolicy);
  let base = exp.baseScore;

  let eliteFactor = 1.0;
  if (elite && !elite.loading && !elite.error) {
    if (elite.overall === "fail") eliteFactor = 0.4;
    else if (elite.overall === "warn") eliteFactor = 0.7;
  }

  let complianceFactor = 1.0;
  if (compliance) {
    if (compliance.error) {
      complianceFactor = 0.7;
    } else {
      const hasMissing = (compliance.missing || []).length > 0;
      const hasFailing = (compliance.failing || []).length > 0;
      if (hasFailing) complianceFactor = 0.5;
      else if (hasMissing) complianceFactor = 0.7;
    }
  }

  let score = Math.round(base * eliteFactor * complianceFactor);
  score = Math.min(Math.max(score, 0), 100);

  let tier = "Unknown";
  if (score >= 85) tier = "Elite Safe";
  else if (score >= 70) tier = "Preferred";
  else if (score >= 55) tier = "Watch";
  else if (score >= 35) tier = "High Risk";
  else tier = "Severe";

  return { score, tier, exp };
}
/* ------------------------- MAIN PAGE ------------------------- */
export default function VendorPage() {
  const router = useRouter();
  const { id } = router.query;

  const [vendor, setVendor] = useState(null);
  const [org, setOrg] = useState(null);
  const [policies, setPolicies] = useState([]);
  const [compliance, setCompliance] = useState(null);

  const [loadingVendor, setLoadingVendor] = useState(true);
  const [loadingCompliance, setLoadingCompliance] = useState(true);
  const [error, setError] = useState("");

  // Fix Plan State
  const [fixLoading, setFixLoading] = useState(false);
  const [fixError, setFixError] = useState("");
  const [fixSteps, setFixSteps] = useState([]);
  const [fixSubject, setFixSubject] = useState("");
  const [fixBody, setFixBody] = useState("");
  const [fixInternalNotes, setFixInternalNotes] = useState("");
  const [sendLoading, setSendLoading] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sendSuccess, setSendSuccess] = useState("");

  const [eliteResult, setEliteResult] = useState(null);

  /* ----------------- LOAD VENDOR + COMPLIANCE + ELITE ----------------- */
  useEffect(() => {
    if (!id) return;

    async function loadAll() {
      try {
        setLoadingVendor(true);

        const res = await fetch(`/api/vendors/${id}`);
        const data = await res.json();
        if (!data.ok) throw new Error(data.error);

        setVendor(data.vendor);
        setOrg(data.organization);
        setPolicies(data.policies);

        if (data.vendor?.org_id) {
          await loadCompliance(data.vendor.id, data.vendor.org_id, data.policies);
        } else {
          setLoadingCompliance(false);
        }
      } catch (err) {
        setError(err.message);
        setLoadingCompliance(false);
      } finally {
        setLoadingVendor(false);
      }
    }

    async function loadCompliance(vendorId, orgId, vendorPolicies) {
      try {
        setLoadingCompliance(true);

        const res = await fetch(
          `/api/requirements/check?vendorId=${vendorId}&orgId=${orgId}`
        );
        const data = await res.json();
        if (!data.ok) throw new Error(data.error);

        setCompliance(data);

        const primary = vendorPolicies?.[0];
        if (primary) {
          const coidata = {
            expirationDate: primary.expiration_date,
            generalLiabilityLimit: primary.limit_each_occurrence,
            autoLimit: primary.auto_limit,
            workCompLimit: primary.work_comp_limit,
            policyType: primary.coverage_type,
          };

          const eliteRes = await fetch("/api/elite/evaluate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ coidata }),
          });

          const eliteData = await eliteRes.json();
          if (eliteData.ok) {
            setEliteResult({
              overall: eliteData.overall,
              rules: eliteData.rules || [],
              loading: false,
            });
          } else {
            setEliteResult({ error: eliteData.error });
          }
        }
      } catch (err) {
        setCompliance({ error: err.message });
      } finally {
        setLoadingCompliance(false);
      }
    }

    loadAll();
  }, [id]);
  /* ----------------- FIX PLAN HELPERS ----------------- */
  async function loadFixPlan() {
    if (!vendor || !org) return;

    try {
      setFixLoading(true);
      setFixError("");
      setFixSteps([]);
      setFixSubject("");
      setFixBody("");
      setFixInternalNotes("");

      const res = await fetch(
        `/api/vendor/fix-plan?vendorId=${vendor.id}&orgId=${org.id}`
      );

      const data = await res.json();
      if (!data.ok) throw new Error(data.error);

      setFixSteps(data.steps || []);
      setFixSubject(data.vendorEmailSubject || "");
      setFixBody(data.vendorEmailBody || "");
      setFixInternalNotes(data.internalNotes || "");
    } catch (err) {
      setFixError(err.message);
    } finally {
      setFixLoading(false);
    }
  }

  async function sendFixEmail() {
    if (!vendor || !org || !fixSubject || !fixBody) return;

    try {
      setSendLoading(true);
      setSendError("");
      setSendSuccess("");

      const res = await fetch("/api/vendor/send-fix-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId: vendor.id,
          orgId: org.id,
          subject: fixSubject,
          body: fixBody,
        }),
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error);

      setSendSuccess(`Email sent to ${data.sentTo}`);
    } catch (err) {
      setSendError(err.message);
    } finally {
      setSendLoading(false);
    }
  }

  async function downloadPDF() {
    try {
      const res = await fetch("/api/vendor/fix-plan-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorName: vendor.name,
          steps: fixSteps,
          subject: fixSubject,
          body: fixBody,
          internalNotes: fixInternalNotes,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "PDF download failed");
      }

      const pdfBlob = await res.blob();
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${vendor.name.replace(/\s+/g, "_")}_Fix_Plan.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("PDF Error: " + err.message);
    }
  }

  async function downloadEnterprisePDF() {
    try {
      const res = await fetch("/api/vendor/enterprise-report-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendor,
          org,
          compliance,
          fixSteps,
          fixSubject,
          fixBody,
          fixInternalNotes,
          policies,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Enterprise PDF failed");
      }

      const pdfBlob = await res.blob();
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${vendor.name.replace(
        /\s+/g,
        "_"
      )}_Compliance_Report.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Enterprise PDF Error: " + err.message);
    }
  }
  /* ----------------- LOADING STATES ----------------- */
  if (loadingVendor) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "radial-gradient(circle at top,#020617 0,#020617 45%,#000 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#e5e7eb",
        }}
      >
        <h1>Loading vendor…</h1>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#020617",
          padding: 40,
          color: "#e5e7eb",
        }}
      >
        <h1>Error</h1>
        <p style={{ color: "#f97373" }}>{error}</p>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#020617",
          padding: 40,
          color: "#e5e7eb",
        }}
      >
        <h1>Vendor not found</h1>
      </div>
    );
  }

  const primaryPolicy = policies[0] || null;
  const aiRisk = computeVendorAiRisk({
    primaryPolicy,
    elite: eliteResult,
    compliance,
  });

  /* ----------------- MAIN UI — CINEMATIC V4 WRAP ----------------- */
  return (
    <div
      style={{
        minHeight: "100vh",
        position: "relative",
        background:
          "radial-gradient(circle at top left,#020617 0,#020617 45%,#000 100%)",
        padding: "32px 40px 40px",
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
            "radial-gradient(circle, rgba(56,189,248,0.32), transparent 65%)",
          filter: "blur(140px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* COCKPIT SHELL */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          borderRadius: 32,
          padding: 20,
          background:
            "radial-gradient(circle at top left,rgba(15,23,42,0.98),rgba(15,23,42,0.95))",
          border: "1px solid rgba(148,163,184,0.45)",
          boxShadow: `
            0 0 60px rgba(15,23,42,0.95),
            0 0 80px rgba(15,23,42,0.9),
            inset 0 0 22px rgba(15,23,42,0.9)
          `,
        }}
      >
        {/* HEADER */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 20,
            marginBottom: 20,
          }}
        >
          {/* Icon bubble */}
          <div
            style={{
              padding: 14,
              borderRadius: 999,
              background:
                "radial-gradient(circle at 20% 0,#38bdf8,#6366f1,#0f172a)",
              boxShadow: "0 0 40px rgba(56,189,248,0.65)",
            }}
          >
            <span style={{ fontSize: 22 }}>🏗️</span>
          </div>

          <div style={{ flex: 1 }}>
            <div
              style={{
                display: "inline-flex",
                gap: 8,
                padding: "4px 10px",
                borderRadius: 999,
                border: "1px solid rgba(148,163,184,0.4)",
                background:
                  "linear-gradient(120deg,rgba(15,23,42,0.92),rgba(15,23,42,0.7))",
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  color: "#9ca3af",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                }}
              >
                Vendor Profile
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: "#38bdf8",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                }}
              >
                Compliance Cockpit
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
              {vendor.name}
            </h1>

            {org && (
              <p
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  color: "#9ca3af",
                }}
              >
                Organization:{" "}
                <span style={{ color: "#e5e7eb" }}>{org.name}</span>
              </p>
            )}

            {/* 🔥 PROGRESS BAR — TOP HERO */}
            <div style={{ maxWidth: 420, marginTop: 10 }}>
              <VendorProgressBar orgId={vendor.org_id} vendorId={vendor.id} />
            </div>
          </div>
        </div>
        {/* MAIN GRID */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1.9fr) minmax(0,1.3fr)",
            gap: 18,
            alignItems: "flex-start",
          }}
        >
          {/* LEFT COLUMN — COMPLIANCE + FIX PLAN + POLICIES */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* COMPLIANCE SUMMARY */}
            <div
              style={{
                borderRadius: 22,
                padding: 18,
                background:
                  "radial-gradient(circle at top left,rgba(15,23,42,0.98),rgba(15,23,42,0.96))",
                border: "1px solid rgba(148,163,184,0.45)",
                boxShadow:
                  "0 0 30px rgba(15,23,42,0.95), inset 0 0 18px rgba(15,23,42,0.85)",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: 1.4,
                  color: "#9ca3af",
                  marginBottom: 6,
                }}
              >
                Compliance Summary
              </div>

              {/* 🔥 PROGRESS BAR — INSIDE SUMMARY */}
              <div style={{ maxWidth: 420, marginBottom: 8 }}>
                <VendorProgressBar
                  orgId={vendor.org_id}
                  vendorId={vendor.id}
                />
              </div>

              {loadingCompliance && (
                <div style={{ fontSize: 12, color: "#9ca3af" }}>
                  Checking compliance…
                </div>
              )}

              {compliance?.error && (
                <div style={{ fontSize: 12, color: "#fecaca" }}>
                  ❌ {compliance.error}
                </div>
              )}

              {!loadingCompliance &&
                compliance &&
                !compliance.error && (
                  <>
                    <p
                      style={{
                        marginTop: 8,
                        fontWeight: 500,
                        fontSize: 13,
                        color: "#e5e7eb",
                      }}
                    >
                      {compliance.summary}
                    </p>

                    <div
                      style={{
                        marginTop: 12,
                        display: "grid",
                        gridTemplateColumns: "minmax(0,1.1fr) minmax(0,1fr)",
                        gap: 14,
                      }}
                    >
                      <div
                        style={{
                          borderRadius: 16,
                          padding: 12,
                          background: "rgba(15,23,42,0.96)",
                          border: "1px solid rgba(51,65,85,0.9)",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 12,
                            color: "#9ca3af",
                            marginBottom: 6,
                          }}
                        >
                          Elite Rule Engine
                        </div>
                        <EliteComplianceBlock
                          coidata={{
                            expirationDate: primaryPolicy?.expiration_date,
                            generalLiabilityLimit:
                              primaryPolicy?.limit_each_occurrence,
                            autoLimit: primaryPolicy?.auto_limit,
                            workCompLimit: primaryPolicy?.work_comp_limit,
                            policyType: primaryPolicy?.coverage_type,
                          }}
                        />
                      </div>

                      <div
                        style={{
                          borderRadius: 16,
                          padding: 12,
                          background: "rgba(15,23,42,0.96)",
                          border: "1px solid rgba(51,65,85,0.9)",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 12,
                            color: "#9ca3af",
                            marginBottom: 6,
                          }}
                        >
                          AI Underwriting Risk Score
                        </div>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            marginBottom: 6,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 28,
                              fontWeight: 700,
                              background:
                                "linear-gradient(120deg,#22c55e,#bef264,#facc15,#fb7185)",
                              WebkitBackgroundClip: "text",
                              color: "transparent",
                            }}
                          >
                            {aiRisk.score}
                          </div>

                          <div>
                            <div
                              style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: "#e5e7eb",
                              }}
                            >
                              {aiRisk.tier}
                            </div>
                            <div
                              style={{
                                marginTop: 4,
                                height: 4,
                                width: 110,
                                borderRadius: 999,
                                background: "rgba(15,23,42,1)",
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  width: `${Math.min(aiRisk.score, 100)}%`,
                                  height: "100%",
                                  background:
                                    aiRisk.score >= 80
                                      ? "#22c55e"
                                      : aiRisk.score >= 60
                                      ? "#facc15"
                                      : "#fb7185",
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        {primaryPolicy && (
                          <div
                            style={{
                              marginTop: 4,
                              fontSize: 11,
                              color: "#9ca3af",
                            }}
                          >
                            <div>
                              <span style={{ color: "#e5e7eb" }}>
                                Primary:
                              </span>{" "}
                              {primaryPolicy.coverage_type || "—"}
                            </div>
                            <div>
                              <span style={{ color: "#e5e7eb" }}>
                                Expires:
                              </span>{" "}
                              {primaryPolicy.expiration_date || "—"} (
                              {aiRisk.exp.daysLeft ?? "—"} days left)
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* RISK LISTS */}
                    <div
                      style={{
                        marginTop: 12,
                        fontSize: 11,
                        color: "#9ca3af",
                      }}
                    >
                      {compliance.missing?.length > 0 && (
                        <>
                          <div style={{ color: "#fecaca", marginTop: 6 }}>
                            Missing Coverage
                          </div>
                          <ul style={{ paddingLeft: 18 }}>
                            {compliance.missing.map((m, i) => (
                              <li key={i}>{m.coverage_type}</li>
                            ))}
                          </ul>
                        </>
                      )}

                      {compliance.failing?.length > 0 && (
                        <>
                          <div style={{ color: "#fed7aa", marginTop: 6 }}>
                            Failing Requirements
                          </div>
                          <ul style={{ paddingLeft: 18 }}>
                            {compliance.failing.map((f, i) => (
                              <li key={i}>
                                {f.coverage_type}: {f.reason}
                              </li>
                            ))}
                          </ul>
                        </>
                      )}

                      {compliance.passing?.length > 0 && (
                        <>
                          <div style={{ color: "#bbf7d0", marginTop: 6 }}>
                            Passing
                          </div>
                          <ul style={{ paddingLeft: 18 }}>
                            {compliance.passing.map((p, i) => (
                              <li key={i}>{p.coverage_type}</li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>
                  </>
                )}
            </div>
            {/* FIX PLAN BOX */}
            <div
              style={{
                borderRadius: 22,
                padding: 18,
                background: "rgba(15,23,42,0.98)",
                border: "1px solid rgba(148,163,184,0.45)",
                boxShadow:
                  "0 0 30px rgba(15,23,42,0.95), inset 0 0 18px rgba(15,23,42,0.85)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 10,
                  alignItems: "center",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: 1.3,
                      color: "#9ca3af",
                    }}
                  >
                    AI Fix Plan
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#cbd5f5",
                      marginTop: 4,
                    }}
                  >
                    Hybrid AI + rule engine remediation guidance.
                  </div>
                </div>

                <button
                  onClick={loadFixPlan}
                  disabled={fixLoading}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 999,
                    background:
                      "radial-gradient(circle at top left,#38bdf8,#0ea5e9,#0f172a)",
                    color: "white",
                    border: "1px solid rgba(56,189,248,0.9)",
                    cursor: fixLoading ? "not-allowed" : "pointer",
                    fontSize: 12,
                    fontWeight: 600,
                    boxShadow: "0 0 20px rgba(56,189,248,0.45)",
                  }}
                >
                  {fixLoading ? "Generating…" : "Generate Fix Plan"}
                </button>
              </div>

              {/* 🔥 PROGRESS BAR — INSIDE FIX PLAN */}
              <div style={{ maxWidth: 420, marginBottom: 10 }}>
                <VendorProgressBar
                  orgId={vendor.org_id}
                  vendorId={vendor.id}
                />
              </div>

              {fixError && (
                <div style={{ fontSize: 12, color: "#fecaca" }}>{fixError}</div>
              )}

              {fixSteps.length > 0 && (
                <>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#e5e7eb",
                      marginTop: 6,
                      marginBottom: 6,
                    }}
                  >
                    Action Steps
                  </div>
                  <ol style={{ paddingLeft: 20, fontSize: 12, color: "#cbd5f5" }}>
                    {fixSteps.map((s, i) => (
                      <li key={i} style={{ marginBottom: 4 }}>
                        {s}
                      </li>
                    ))}
                  </ol>
                </>
              )}

              {fixSubject && (
                <>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#9ca3af",
                      marginTop: 10,
                      marginBottom: 4,
                    }}
                  >
                    Vendor Email Subject
                  </div>
                  <div
                    style={{
                      background: "rgba(15,23,42,0.96)",
                      borderRadius: 10,
                      border: "1px solid rgba(51,65,85,0.9)",
                      padding: 8,
                      fontSize: 12,
                      color: "#e5e7eb",
                    }}
                  >
                    {fixSubject}
                  </div>
                </>
              )}

              {fixBody && (
                <>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#9ca3af",
                      marginTop: 10,
                      marginBottom: 4,
                    }}
                  >
                    Vendor Email Body
                  </div>
                  <textarea
                    readOnly
                    value={fixBody}
                    style={{
                      width: "100%",
                      minHeight: 140,
                      padding: 10,
                      borderRadius: 10,
                      border: "1px solid rgba(51,65,85,0.9)",
                      background: "rgba(15,23,42,0.96)",
                      color: "#e5e7eb",
                      fontSize: 12,
                      fontFamily: "system-ui",
                      whiteSpace: "pre-wrap",
                    }}
                  />

                  <button
                    onClick={sendFixEmail}
                    disabled={sendLoading}
                    style={{
                      width: "100%",
                      marginTop: 14,
                      padding: "10px 14px",
                      borderRadius: 10,
                      background:
                        "linear-gradient(90deg,#22c55e,#16a34a,#14532d)",
                      color: "white",
                      fontWeight: 600,
                      fontSize: 13,
                      border: "none",
                      cursor: sendLoading ? "not-allowed" : "pointer",
                      boxShadow: "0 0 18px rgba(34,197,94,0.5)",
                    }}
                  >
                    {sendLoading ? "Sending…" : "📬 Send Fix Email"}
                  </button>

                  {sendError && (
                    <div
                      style={{
                        fontSize: 12,
                        color: "#fecaca",
                        marginTop: 6,
                      }}
                    >
                      {sendError}
                    </div>
                  )}

                  {sendSuccess && (
                    <div
                      style={{
                        fontSize: 12,
                        color: "#bbf7d0",
                        marginTop: 6,
                      }}
                    >
                      {sendSuccess}
                    </div>
                  )}

                  <button
                    onClick={downloadPDF}
                    style={{
                      width: "100%",
                      marginTop: 10,
                      padding: "10px 14px",
                      borderRadius: 10,
                      background:
                        "linear-gradient(90deg,#3b82f6,#1d4ed8,#1e293b)",
                      color: "white",
                      fontWeight: 600,
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    📄 Download Fix Plan (PDF)
                  </button>

                  <button
                    onClick={downloadEnterprisePDF}
                    style={{
                      width: "100%",
                      marginTop: 10,
                      padding: "10px 14px",
                      borderRadius: 10,
                      background:
                        "linear-gradient(90deg,#0f172a,#020617,#020617)",
                      color: "white",
                      fontWeight: 600,
                      border: "1px solid rgba(148,163,184,0.5)",
                      cursor: "pointer",
                    }}
                  >
                    🧾 Download Enterprise Compliance Report
                  </button>
                </>
              )}

              {fixInternalNotes && (
                <>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#9ca3af",
                      marginTop: 12,
                      marginBottom: 4,
                    }}
                  >
                    Internal Notes
                  </div>
                  <div
                    style={{
                      borderRadius: 10,
                      border: "1px solid rgba(51,65,85,0.9)",
                      background: "rgba(15,23,42,0.96)",
                      padding: 10,
                      fontSize: 12,
                      color: "#e5e7eb",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {fixInternalNotes}
                  </div>
                </>
              )}
            </div>
            {/* POLICIES CARD */}
            <div
              style={{
                borderRadius: 22,
                padding: 18,
                background: "rgba(15,23,42,0.98)",
                border: "1px solid rgba(148,163,184,0.45)",
                boxShadow:
                  "0 0 30px rgba(15,23,42,0.95), inset 0 0 18px rgba(15,23,42,0.85)",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: 1.4,
                  color: "#9ca3af",
                  marginBottom: 6,
                }}
              >
                Policies
              </div>

              {policies.length === 0 && (
                <div style={{ fontSize: 12, color: "#9ca3af" }}>
                  No policies on file.
                </div>
              )}

              {policies.map((p) => (
                <div
                  key={p.id}
                  style={{
                    marginTop: 10,
                    padding: 10,
                    borderRadius: 12,
                    background: "rgba(15,23,42,0.96)",
                    border: "1px solid rgba(51,65,85,0.9)",
                    fontSize: 12,
                    color: "#e5e7eb",
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>
                    {p.coverage_type || "Unknown Coverage"}
                  </div>
                  <div>Policy #: {p.policy_number || "—"}</div>
                  <div>Carrier: {p.carrier || "—"}</div>
                  <div>
                    Effective: {p.effective_date || "—"} — Expires:{" "}
                    {p.expiration_date || "—"}
                  </div>
                  <div>
                    Limits: {p.limit_each_occurrence || "—"} /{" "}
                    {p.limit_aggregate || "—"}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* RIGHT COLUMN — RESERVED FOR FUTURE (Charts/Docs) */}
          <div
            style={{
              borderRadius: 22,
              padding: 18,
              background:
                "radial-gradient(circle at top right,rgba(15,23,42,0.98),rgba(15,23,42,0.96))",
              border: "1px solid rgba(148,163,184,0.45)",
              minHeight: 260,
            }}
          >
            <div
              style={{
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: 1.4,
                color: "#9ca3af",
                marginBottom: 6,
              }}
            >
              Coming Soon
            </div>
            <div style={{ fontSize: 12, color: "#cbd5f5" }}>
              This panel can host vendor-specific timelines, claim history,
              document lists, or AI Copilot summaries.
            </div>
          </div>
        </div>

        {/* FOOTER LINK */}
        <div
          style={{
            marginTop: 20,
            fontSize: 13,
          }}
        >
          <a
            href="/dashboard"
            style={{
              color: "#38bdf8",
              textDecoration: "none",
            }}
          >
            ← Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
