// pages/admin/vendor/[id]/fix.js
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import EliteComplianceBlock from "../../../components/elite/EliteComplianceBlock";

/* ===========================
   RISK HELPERS
=========================== */

function parseExpiration(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  const [mm, dd, yyyy] = parts;
  if (!mm || !dd || !yyyy) return null;
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

function computeVendorAiRisk({ primaryPolicy, elite, compliance }) {
  const exp = computeExpirationRisk(primaryPolicy);
  let base = exp.baseScore;

  let eliteFactor = 1.0;
  if (elite && !elite.loading && !elite.error) {
    if (elite.overall === "fail") eliteFactor = 0.4;
    else if (elite.overall === "warn") eliteFactor = 0.7;
    else if (elite.overall === "pass") eliteFactor = 1.0;
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

/* ===========================
   MAIN PAGE — FIX / ELITE VIEW
=========================== */

export default function VendorFixPage() {
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
          await loadCompliance(
            data.vendor.id,
            data.vendor.org_id,
            data.policies
          );
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
          background:
            "radial-gradient(circle at top left,#020617 0%, #020617 40%, #000 100%)",
          padding: "40px",
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
          background:
            "radial-gradient(circle at top left,#020617 0%, #020617 40%, #000 100%)",
          padding: "40px",
          color: "#e5e7eb",
        }}
      >
        <h1>Error</h1>
        <p style={{ color: "#fecaca" }}>{error}</p>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background:
            "radial-gradient(circle at top left,#020617 0%, #020617 40%, #000 100%)",
          padding: "40px",
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

  /* ----------------- MAIN UI (CINEMATIC) ----------------- */
  return (
    <div
      style={{
        minHeight: "100vh",
        position: "relative",
        background:
          "radial-gradient(circle at top left,#020617 0%, #020617 40%, #000 100%)",
        padding: "30px 40px 40px",
        color: "#e5e7eb",
      }}
    >
      {/* AURA */}
      <div
        style={{
          position: "absolute",
          top: -260,
          left: "50%",
          transform: "translateX(-50%)",
          width: 1100,
          height: 1100,
          background:
            "radial-gradient(circle, rgba(59,130,246,0.35), transparent 60%)",
          filter: "blur(120px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* HEADER */}
      <div style={{ position: "relative", zIndex: 2, marginBottom: 18 }}>
        <div
          style={{
            fontSize: 12,
            color: "#9ca3af",
            marginBottom: 8,
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <a href="/vendors" style={{ color: "#93c5fd" }}>
            Vendors
          </a>
          <span>/</span>
          <a href={`/admin/vendor/${vendor.id}`} style={{ color: "#93c5fd" }}>
            {vendor.name}
          </a>
          <span>/</span>
          <span>Fix Plan</span>
        </div>

        <h1
          style={{
            fontSize: 26,
            fontWeight: 600,
            margin: 0,
          }}
        >
          Fix Plan & Elite Risk for{" "}
          <span
            style={{
              background:
                "linear-gradient(90deg,#38bdf8,#a5b4fc,#e5e7eb)",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            {vendor.name}
          </span>
        </h1>
        {org && (
          <p
            style={{
              fontSize: 13,
              color: "#9ca3af",
              marginTop: 4,
            }}
          >
            Org:{" "}
            <span style={{ color: "#e5e7eb" }}>{org.name || "Unknown"}</span>
          </p>
        )}
      </div>

      {/* TOP ROW — COMPLIANCE + AI RISK + ELITE ENGINE */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "grid",
          gridTemplateColumns: "minmax(0,2.1fr) minmax(0,1.4fr)",
          gap: 18,
          marginBottom: 18,
        }}
      >
        {/* LEFT — Compliance + Elite */}
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
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 1.2,
              color: "#9ca3af",
              marginBottom: 8,
            }}
          >
            Compliance Summary
          </div>

          {loadingCompliance && (
            <div style={{ fontSize: 13, color: "#9ca3af" }}>
              Checking compliance…
            </div>
          )}

          {compliance?.error && (
            <div style={{ color: "#fecaca", fontSize: 12 }}>
              ❌ {compliance.error}
            </div>
          )}

          {!loadingCompliance && compliance && !compliance.error && (
            <>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#e5e7eb",
                  marginBottom: 12,
                }}
              >
                {compliance.summary}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
                  gap: 16,
                }}
              >
                {/* ELITE ENGINE */}
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
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: 1.1,
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

                {/* AI RISK */}
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
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: 1.1,
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
                      gap: 12,
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 28,
                        fontWeight: 700,
                        color:
                          aiRisk.score >= 80
                            ? "#22c55e"
                            : aiRisk.score >= 60
                            ? "#facc15"
                            : "#fb7185",
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
                          background: "#020617",
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
                        fontSize: 11,
                        color: "#9ca3af",
                      }}
                    >
                      <div>
                        <strong>Primary Policy:</strong>{" "}
                        {primaryPolicy.coverage_type || "—"}
                      </div>
                      <div>
                        <strong>Expires:</strong>{" "}
                        {primaryPolicy.expiration_date || "—"} (
                        {aiRisk.exp.daysLeft ?? "—"} days left)
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Compliance lists */}
              <div style={{ marginTop: 14 }}>
                {compliance.missing?.length > 0 && (
                  <>
                    <div
                      style={{ color: "#fb7185", fontSize: 12, marginTop: 8 }}
                    >
                      Missing Coverage
                    </div>
                    <ul
                      style={{
                        marginTop: 4,
                        paddingLeft: 18,
                        fontSize: 12,
                        color: "#e5e7eb",
                      }}
                    >
                      {compliance.missing.map((m, i) => (
                        <li key={i}>{m.coverage_type}</li>
                      ))}
                    </ul>
                  </>
                )}

                {compliance.failing?.length > 0 && (
                  <>
                    <div
                      style={{ color: "#facc15", fontSize: 12, marginTop: 8 }}
                    >
                      Failing Requirements
                    </div>
                    <ul
                      style={{
                        marginTop: 4,
                        paddingLeft: 18,
                        fontSize: 12,
                        color: "#e5e7eb",
                      }}
                    >
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
                    <div
                      style={{ color: "#22c55e", fontSize: 12, marginTop: 8 }}
                    >
                      Passing
                    </div>
                    <ul
                      style={{
                        marginTop: 4,
                        paddingLeft: 18,
                        fontSize: 12,
                        color: "#e5e7eb",
                      }}
                    >
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

        {/* RIGHT — AI FIX PLAN CONTROLS */}
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
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 10,
              gap: 10,
              alignItems: "center",
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
                AI Fix Plan
              </div>
              <div style={{ fontSize: 12, color: "#e5e7eb" }}>
                Hybrid G+Legal vendor remediation steps.
              </div>
            </div>

            <button
              onClick={loadFixPlan}
              disabled={fixLoading}
              style={{
                borderRadius: 999,
                padding: "7px 12px",
                border: "1px solid rgba(59,130,246,0.9)",
                background:
                  "radial-gradient(circle at top left,#3b82f6,#1d4ed8,#0f172a)",
                color: "#e5f2ff",
                fontSize: 11,
                fontWeight: 500,
                cursor: fixLoading ? "not-allowed" : "pointer",
              }}
            >
              {fixLoading ? "Generating…" : "Generate Fix Plan"}
            </button>
          </div>

          {fixError && (
            <div
              style={{
                fontSize: 12,
                color: "#fecaca",
                marginBottom: 10,
              }}
            >
              {fixError}
            </div>
          )}

          {fixSteps.length > 0 && (
            <>
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: 1.1,
                  color: "#9ca3af",
                  marginTop: 8,
                  marginBottom: 4,
                }}
              >
                Action Steps
              </div>
              <ol
                style={{
                  paddingLeft: 18,
                  marginTop: 0,
                  fontSize: 12,
                  color: "#e5e7eb",
                }}
              >
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
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: 1.1,
                  color: "#9ca3af",
                  marginTop: 10,
                  marginBottom: 4,
                }}
              >
                Vendor Email Subject
              </div>
              <div
                style={{
                  borderRadius: 10,
                  padding: 8,
                  background: "rgba(15,23,42,0.96)",
                  border: "1px solid rgba(51,65,85,0.9)",
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
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: 1.1,
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
                  minHeight: 120,
                  borderRadius: 10,
                  padding: 8,
                  border: "1px solid rgba(51,65,85,0.9)",
                  background: "rgba(15,23,42,0.98)",
                  color: "#e5e7eb",
                  fontSize: 12,
                  fontFamily: "system-ui",
                  resize: "vertical",
                  whiteSpace: "pre-wrap",
                }}
              />

              <button
                onClick={sendFixEmail}
                disabled={sendLoading}
                style={{
                  width: "100%",
                  marginTop: 10,
                  borderRadius: 999,
                  padding: "8px 14px",
                  border: "1px solid rgba(22,163,74,0.9)",
                  background:
                    "radial-gradient(circle at top left,#22c55e,#16a34a,#052e16)",
                  color: "#ecfdf5",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: sendLoading ? "not-allowed" : "pointer",
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
                  borderRadius: 999,
                  padding: "8px 14px",
                  border: "1px solid rgba(59,130,246,0.9)",
                  background:
                    "radial-gradient(circle at top left,#2563eb,#1d4ed8,#0f172a)",
                  color: "#eff6ff",
                  fontSize: 12,
                  fontWeight: 500,
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
                  borderRadius: 999,
                  padding: "8px 14px",
                  border: "1px solid rgba(148,163,184,0.8)",
                  background:
                    "radial-gradient(circle at top left,#111827,#020617,#000000)",
                  color: "#e5e7eb",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                🧾 Download Enterprise Compliance Report (PDF)
              </button>
            </>
          )}

          {fixInternalNotes && (
            <>
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: 1.1,
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
                  padding: 8,
                  border: "1px solid rgba(51,65,85,0.9)",
                  background: "rgba(15,23,42,0.98)",
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
      </div>
    </div>
  );
}
