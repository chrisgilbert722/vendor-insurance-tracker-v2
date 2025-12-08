// pages/admin/vendor/[id]/fix.js
// ============================================================
// Vendor Fix Cockpit V5 — Elite Edition (Merged & Clean)
// ============================================================

import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import EliteComplianceBlock from "../../../../components/elite/EliteComplianceBlock";
import { useOrg } from "../../../../context/OrgContext";

/* ============================================================
   DATE HELPERS
============================================================ */
function parseExpiration(dateStr) {
  if (!dateStr) return null;
  const parts = String(dateStr).split("/");
  if (parts.length !== 3) return null;
  const [mm, dd, yyyy] = parts;
  return new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
}

function computeDaysLeft(dateStr) {
  const dt = parseExpiration(dateStr);
  if (!dt) return null;
  return Math.floor((dt - new Date()) / (1000 * 60 * 60 * 24));
}

/* ============================================================
   EXPIRATION RISK
============================================================ */
function expirationRisk(policy) {
  if (!policy) return { score: 0, severity: "unknown", daysLeft: null };

  const daysLeft = computeDaysLeft(policy.expiration_date);
  if (daysLeft === null)
    return { score: 0, severity: "unknown", daysLeft };

  if (daysLeft < 0) return { score: 20, severity: "expired", daysLeft };
  if (daysLeft <= 30) return { score: 40, severity: "critical", daysLeft };
  if (daysLeft <= 90) return { score: 70, severity: "warning", daysLeft };
  return { score: 95, severity: "ok", daysLeft };
}

/* ============================================================
   ELITE RISK
============================================================ */
function eliteRisk(elite) {
  if (!elite || elite.error || elite.loading)
    return { factor: 1.0, severity: "unknown" };

  switch (elite.overall) {
    case "fail": return { factor: 0.4, severity: "fail" };
    case "warn": return { factor: 0.7, severity: "warn" };
    case "pass": return { factor: 1.0, severity: "pass" };
    default: return { factor: 1.0, severity: "unknown" };
  }
}

/* ============================================================
   COMPLIANCE RISK
============================================================ */
function complianceRisk(compliance) {
  if (!compliance || compliance.error)
    return { factor: 1.0, severity: "unknown" };

  const missing = (compliance.missing || []).length > 0;
  const failing = (compliance.failing || []).length > 0;

  if (failing) return { factor: 0.5, severity: "failing" };
  if (missing) return { factor: 0.7, severity: "missing" };
  return { factor: 1.0, severity: "ok" };
}

/* ============================================================
   RULE ENGINE RISK
============================================================ */
function ruleEngineRisk(engineSummary) {
  if (!engineSummary)
    return { factor: 1.0, score: null, severity: "unknown" };

  const score = engineSummary.globalScore ?? null;
  let factor = 1.0;
  let severity = "unknown";

  if (score !== null) {
    if (score >= 85) { factor = 1.0; severity = "elite"; }
    else if (score >= 70) { factor = 0.9; severity = "good"; }
    else if (score >= 50) { factor = 0.7; severity = "watch"; }
    else { factor = 0.4; severity = "critical"; }
  }

  return { factor, severity, score };
}

/* ============================================================
   UNIFIED RISK ENGINE
============================================================ */
function computeUnifiedRisk({ primary, elite, compliance, engineSummary }) {
  const exp = expirationRisk(primary);
  const eliteR = eliteRisk(elite);
  const compR = complianceRisk(compliance);
  const ruleR = ruleEngineRisk(engineSummary);

  let score = exp.score * eliteR.factor * compR.factor * ruleR.factor;
  score = Math.round(Math.max(0, Math.min(100, score)));

  let tier = "Unknown";
  if (score >= 85) tier = "Elite Safe";
  else if (score >= 70) tier = "Preferred";
  else if (score >= 55) tier = "Watch";
  else if (score >= 35) tier = "High Risk";
  else tier = "Severe";

  return {
    score,
    tier,
    expiration: exp,
    elite: eliteR,
    compliance: compR,
    ruleEngine: ruleR,
  };
}

/* ============================================================
   MAIN COMPONENT — STATE
============================================================ */
export default function VendorFixPage() {
  const router = useRouter();
  const { id } = router.query;
  const { activeOrgId } = useOrg();

  const [vendor, setVendor] = useState(null);
  const [org, setOrg] = useState(null);
  const [policies, setPolicies] = useState([]);

  const [compliance, setCompliance] = useState(null);
  const [eliteResult, setEliteResult] = useState(null);

  const [engineLoading, setEngineLoading] = useState(false);
  const [engineError, setEngineError] = useState("");
  const [engineSummary, setEngineSummary] = useState(null);
  const [failingRules, setFailingRules] = useState([]);

  const [fixLoading, setFixLoading] = useState(false);
  const [fixError, setFixError] = useState("");
  const [fixSteps, setFixSteps] = useState([]);
  const [fixSubject, setFixSubject] = useState("");
  const [fixBody, setFixBody] = useState("");
  const [fixInternalNotes, setFixInternalNotes] = useState("");

  const [sendLoading, setSendLoading] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sendSuccess, setSendSuccess] = useState("");

  const [loadingVendor, setLoadingVendor] = useState(true);
  const [error, setError] = useState("");

  const isDemoVendor = !id || Number.isNaN(Number(id));

  /* ============================================================
     LOAD VENDOR + COMPLIANCE + ELITE
============================================================ */
  useEffect(() => {
    if (!id) return;

    async function loadAll() {
      try {
        setLoadingVendor(true);
        setError("");

        const res = await fetch(`/api/vendors/${id}`);
        const data = await res.json();
        if (!data.ok) throw new Error(data.error);

        setVendor(data.vendor);
        setOrg(data.organization);
        setPolicies(data.policies || []);

        if (data.vendor?.org_id) {
          await loadComplianceAndElite(
            data.vendor.id,
            data.vendor.org_id,
            data.policies || []
          );
        } else {
          setCompliance({ error: "No org ID detected." });
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingVendor(false);
      }
    }

    async function loadComplianceAndElite(vendorId, orgId, vendorPolicies) {
      try {
        const res = await fetch(
          `/api/requirements/check?vendorId=${vendorId}&orgId=${orgId}`
        );
        const comp = await res.json();
        if (!comp.ok) throw new Error(comp.error);
        setCompliance(comp);

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

          const eliteJson = await eliteRes.json();
          if (eliteJson.ok) {
            setEliteResult({
              overall: eliteJson.overall,
              rules: eliteJson.rules || [],
            });
          } else {
            setEliteResult({ error: eliteJson.error });
          }
        }
      } catch (err) {
        setCompliance({ error: err.message });
      }
    }

    loadAll();
  }, [id, activeOrgId]);
  /* ============================================================
     RUN RULE ENGINE V5
============================================================ */
  async function runRuleEngineV5(vendorIdArg, orgIdArg) {
    const vendorIdRaw = vendorIdArg || vendor?.id;
    const orgIdRaw = orgIdArg || org?.id || activeOrgId;

    const vendorIdNum = Number(vendorIdRaw);
    const orgIdNum = Number(orgIdRaw);

    if (!vendorIdNum || Number.isNaN(vendorIdNum)) return;
    if (!orgIdNum || Number.isNaN(orgIdNum)) return;

    try {
      setEngineLoading(true);
      setEngineError("");
      setEngineSummary(null);
      setFailingRules([]);

      const res = await fetch("/api/engine/run-v3", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId: vendorIdNum,
          orgId: orgIdNum,
          dryRun: false,
        }),
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error);

      setEngineSummary({
        vendorId: json.vendorId,
        orgId: json.orgId,
        globalScore: json.globalScore,
        totalRules: json.totalRules,
        failedCount: json.failedCount,
      });

      setFailingRules(json.failingRules || []);
    } catch (err) {
      setEngineError(err.message);
    } finally {
      setEngineLoading(false);
    }
  }

  /* ============================================================
     FIX PLAN LOAD
============================================================ */
  async function loadFixPlan() {
    if (!vendor || !org) return;

    if (isDemoVendor) {
      setFixError("Fix Plan disabled in demo mode.");
      return;
    }

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

  /* ============================================================
     SEND FIX EMAIL
============================================================ */
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

      setSendSuccess("Email sent.");
    } catch (err) {
      setSendError(err.message);
    } finally {
      setSendLoading(false);
    }
  }

  /* ============================================================
     PDF DOWNLOADS
============================================================ */
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

      if (!res.ok) throw new Error("PDF failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${vendor.name.replace(/\s+/g, "_")}_Fix_Plan.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("PDF error: " + err.message);
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

      if (!res.ok) throw new Error("Enterprise PDF failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${vendor.name.replace(/\s+/g, "_")}_Compliance_Report.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Enterprise PDF error: " + err.message);
    }
  }

  /* ============================================================
     EARLY RETURNS
============================================================ */
  if (loadingVendor) {
    return (
      <div
        style={{
          minHeight: "100vh",
          padding: 40,
          background: "radial-gradient(circle at top left,#020617,#000)",
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
          padding: 40,
          background: "radial-gradient(circle at top left,#020617,#000)",
          color: "#fecaca",
        }}
      >
        <h1>Error</h1>
        <p>{error}</p>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div
        style={{
          minHeight: "100vh",
          padding: 40,
          background: "radial-gradient(circle at top left,#020617,#000)",
          color: "#e5e7eb",
        }}
      >
        <h1>Vendor not found</h1>
      </div>
    );
  }

  /* ============================================================
     COMPUTE UNIFIED RISK
============================================================ */
  const primaryPolicy = policies[0] || null;
  const unifiedRisk = computeUnifiedRisk({
    primary: primaryPolicy,
    elite: eliteResult,
    compliance,
    engineSummary,
  });

  /* ============================================================
     MAIN UI RETURN — Wrapper, Header, Risk Meter, Compliance Row
============================================================ */
  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left,#020617 0%,#000 100%)",
        padding: "28px 40px",
        color: "#e5e7eb",
        position: "relative",
      }}
    >
      {/* Glow Aura */}
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
        }}
      />

      <div style={{ position: "relative", zIndex: 2 }}>
        {/* ============================================================
            HEADER + RISK METER
        ============================================================= */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 20,
            alignItems: "center",
          }}
        >
          {/* TITLE */}
          <div>
            <div
              style={{
                fontSize: 12,
                color: "#9ca3af",
                marginBottom: 6,
              }}
            >
              <a href="/vendors" style={{ color: "#93c5fd" }}>
                Vendors
              </a>{" "}
              /{" "}
              <a
                href={`/admin/vendor/${vendor.id}`}
                style={{ color: "#93c5fd" }}
              >
                {vendor.name}
              </a>{" "}
              / Fix Cockpit
            </div>

            <h1
              style={{
                fontSize: 28,
                fontWeight: 600,
                margin: 0,
                background:
                  "linear-gradient(90deg,#38bdf8,#818cf8,#e5e7eb)",
                WebkitBackgroundClip: "text",
                color: "transparent",
              }}
            >
              Fix Cockpit — Elite Risk Intelligence
            </h1>

            {org && (
              <p style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>
                Org:{" "}
                <span style={{ color: "#e5e7eb" }}>{org.name}</span>
              </p>
            )}
          </div>

          {/* UNIFIED RISK METER */}
          <div
            style={{
              borderRadius: 18,
              padding: "12px 18px",
              background: "rgba(15,23,42,0.9)",
              border: "1px solid rgba(148,163,184,0.5)",
              minWidth: 150,
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 12,
                textTransform: "uppercase",
                color: "#9ca3af",
                marginBottom: 4,
              }}
            >
              Unified Risk Score
            </div>

            <div
              style={{
                fontSize: 30,
                fontWeight: 700,
                background:
                  unifiedRisk.score >= 80
                    ? "linear-gradient(120deg,#22c55e,#bef264)"
                    : unifiedRisk.score >= 60
                    ? "linear-gradient(120deg,#facc15,#fde68a)"
                    : "linear-gradient(120deg,#fb7185,#fecaca)",
                WebkitBackgroundClip: "text",
                color: "transparent",
              }}
            >
              {unifiedRisk.score}
            </div>

            <div
              style={{
                marginTop: 2,
                fontSize: 12,
                color: "#e5e7eb",
                fontWeight: 600,
              }}
            >
              {unifiedRisk.tier}
            </div>
          </div>
        </div>

        {/* ============================================================
            COMPLIANCE + ELITE + RISK COMPONENTS
        ============================================================= */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,2fr) minmax(0,1.3fr)",
            gap: 20,
            marginBottom: 20,
          }}
        >
          {/* LEFT PANEL */}
          <div
            style={{
              borderRadius: 24,
              padding: 18,
              background:
                "radial-gradient(circle at top left,rgba(15,23,42,0.97),rgba(15,23,42,0.92))",
              border: "1px solid rgba(148,163,184,0.6)",
              boxShadow: "0 24px 60px rgba(15,23,42,0.95)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                color: "#9ca3af",
                marginBottom: 10,
              }}
            >
              Compliance Intelligence
            </div>

            {loadingVendor || !compliance ? (
              <div style={{ fontSize: 13, color: "#9ca3af" }}>
                Loading compliance…
              </div>
            ) : compliance.error ? (
              <div style={{ fontSize: 13, color: "#fecaca" }}>
                ❌ {compliance.error}
              </div>
            ) : (
              <>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: "#e5e7eb",
                    marginBottom: 12,
                  }}
                >
                  {compliance.summary || "Compliance summary unavailable"}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 14,
                  }}
                >
                  {/* ELITE PANEL */}
                  <div
                    style={{
                      borderRadius: 18,
                      padding: 12,
                      background: "rgba(15,23,42,0.96)",
                      border: "1px solid rgba(56,65,85,0.9)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        textTransform: "uppercase",
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

                  {/* UNIFIED RISK BREAKDOWN */}
                  <div
                    style={{
                      borderRadius: 18,
                      padding: 12,
                      background:
                        "radial-gradient(circle at top,rgba(2,6,23,0.95),rgba(15,23,42,0.98))",
                      border: "1px solid rgba(56,65,85,0.9)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        color: "#9ca3af",
                        textTransform: "uppercase",
                        marginBottom: 6,
                      }}
                    >
                      Risk Components
                    </div>

                    <div style={{ fontSize: 12, marginBottom: 6 }}>
                      <strong>Expiration:</strong>{" "}
                      {primaryPolicy?.expiration_date || "—"} (
                      {unifiedRisk.expiration.daysLeft ?? "?"} days)
                    </div>

                    <div style={{ fontSize: 12, marginBottom: 6 }}>
                      <strong>Elite:</strong> {unifiedRisk.elite.severity}
                    </div>

                    <div style={{ fontSize: 12, marginBottom: 6 }}>
                      <strong>Compliance:</strong>{" "}
                      {unifiedRisk.compliance.severity}
                    </div>

                    <div style={{ fontSize: 12 }}>
                      <strong>Rule Engine:</strong>{" "}
                      {unifiedRisk.ruleEngine.severity} (
                      {unifiedRisk.ruleEngine.score ?? "—"})
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        {/* ============================================================
            FIX PLAN V5 — AI-Guided Remediation
        ============================================================= */}
        <div
          style={{
            borderRadius: 24,
            padding: 20,
            background:
              "radial-gradient(circle at top right,rgba(15,23,42,0.96),rgba(15,23,42,1))",
            border: "1px solid rgba(148,163,184,0.55)",
            boxShadow: "0 22px 55px rgba(15,23,42,0.98)",
            marginBottom: 24,
          }}
        >
          {/* HEADER */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  color: "#9ca3af",
                }}
              >
                AI Fix Plan V5
              </div>
              <div style={{ fontSize: 12, color: "#e5e7eb" }}>
                Smart, prioritized remediation tailored to this vendor’s COI.
              </div>
            </div>

            <button
              onClick={loadFixPlan}
              disabled={fixLoading}
              style={{
                borderRadius: 999,
                padding: "7px 14px",
                border: "1px solid rgba(59,130,246,0.9)",
                background:
                  "radial-gradient(circle at top left,#3b82f6,#1d4ed8,#0f172a)",
                color: "#e5f2ff",
                fontSize: 11,
                fontWeight: 500,
                cursor: fixLoading ? "not-allowed" : "pointer",
              }}
            >
              {fixLoading ? "Generating…" : "⚡ Generate Fix Plan"}
            </button>
          </div>

          {fixError && (
            <div style={{ fontSize: 12, color: "#fecaca", marginBottom: 8 }}>
              {fixError}
            </div>
          )}

          {/* FIX STEPS WITH SEVERITY TAGGING */}
          {fixSteps.length > 0 && (
            <>
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  color: "#9ca3af",
                  marginTop: 12,
                  marginBottom: 6,
                }}
              >
                Recommended Actions (Prioritized)
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {fixSteps.map((raw, idx) => {
                  const txt = String(raw).toLowerCase();
                  let sev = "normal";

                  if (txt.includes("urgent") || txt.includes("immediately"))
                    sev = "critical";
                  else if (
                    txt.includes("renew") ||
                    txt.includes("missing") ||
                    txt.includes("update")
                  )
                    sev = "warning";

                  const borderColor =
                    sev === "critical"
                      ? "rgba(248,113,113,0.8)"
                      : sev === "warning"
                      ? "rgba(250,204,21,0.7)"
                      : "rgba(148,163,184,0.4)";

                  const sevColor =
                    sev === "critical"
                      ? "#fca5a5"
                      : sev === "warning"
                      ? "#fde68a"
                      : "#cbd5e1";

                  return (
                    <div
                      key={idx}
                      style={{
                        padding: 10,
                        borderRadius: 12,
                        border: `1px solid ${borderColor}`,
                        background: "rgba(15,23,42,0.96)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          textTransform: "uppercase",
                          color: sevColor,
                          marginBottom: 4,
                        }}
                      >
                        {sev === "critical"
                          ? "CRITICAL"
                          : sev === "warning"
                          ? "WARNING"
                          : "RECOMMENDED"}
                      </div>

                      <div
                        style={{
                          fontSize: 12,
                          color: "#e5e7eb",
                          lineHeight: 1.4,
                        }}
                      >
                        {raw}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* EMAIL BODY */}
          {fixBody && (
            <>
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  color: "#9ca3af",
                  marginTop: 12,
                  marginBottom: 4,
                }}
              >
                Email to Vendor
              </div>

              <textarea
                readOnly
                value={fixBody}
                style={{
                  width: "100%",
                  minHeight: 140,
                  borderRadius: 12,
                  padding: 10,
                  border: "1px solid rgba(51,65,85,0.9)",
                  background: "rgba(15,23,42,0.98)",
                  color: "#e5e7eb",
                  fontSize: 12,
                  fontFamily: "system-ui",
                  resize: "vertical",
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
                <div style={{ fontSize: 12, color: "#fecaca", marginTop: 6 }}>
                  {sendError}
                </div>
              )}

              {sendSuccess && (
                <div style={{ fontSize: 12, color: "#bbf7d0", marginTop: 6 }}>
                  {sendSuccess}
                </div>
              )}

              {/* PDF Buttons */}
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
                }}
              >
                🧾 Download Enterprise Compliance Report
              </button>
            </>
          )}
        </div>

        {/* ============================================================
            CONTRACT REQUIREMENTS PANEL V2
        ============================================================= */}
        {Array.isArray(vendor.requirements_json) &&
          vendor.requirements_json.length > 0 && (
            <div
              style={{
                marginBottom: 24,
                padding: 20,
                borderRadius: 22,
                background: "rgba(15,23,42,0.96)",
                border: "1px solid rgba(56,189,248,0.35)",
              }}
            >
              <h3
                style={{
                  marginTop: 0,
                  marginBottom: 6,
                  fontSize: 16,
                  color: "#38bdf8",
                }}
              >
                Contract Requirements (V2)
              </h3>

              <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 14 }}>
                These minimum coverages come from the contract. We detect and
                match against all uploaded policies.
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit,minmax(260px,1fr))",
                  gap: 12,
                }}
              >
                {vendor.requirements_json.map((req, idx) => {
                  const coverage = req.coverage || req.name || "Coverage";
                  const rawReq =
                    req.min_required || req.limit || req.value || null;

                  const required = rawReq
                    ? Number(String(rawReq).replace(/[^0-9.-]/g, ""))
                    : null;

                  const matchPolicy = policies.find((p) => {
                    const type = (p.coverage_type || "").toLowerCase();
                    return type === String(coverage).toLowerCase();
                  });

                  const policyLimit = matchPolicy
                    ? Number(
                        String(
                          matchPolicy.limit_each_occurrence ||
                            matchPolicy.auto_limit ||
                            matchPolicy.umbrella_limit ||
                            0
                        ).replace(/[^0-9.-]/g, "")
                      )
                    : null;

                  const meets =
                    required === null ||
                    (policyLimit !== null && policyLimit >= required);

                  const badgeColor = meets
                    ? "rgba(34,197,94,0.4)"
                    : "rgba(248,113,113,0.6)";

                  const textColor = meets ? "#22c55e" : "#fb7185";

                  return (
                    <div
                      key={idx}
                      style={{
                        padding: 14,
                        borderRadius: 16,
                        background: "rgba(2,6,23,0.9)",
                        border: `1px solid ${badgeColor}`,
                      }}
                    >
                      <div
                        style={{
                          color: "#e5e7eb",
                          fontSize: 13,
                          fontWeight: 600,
                          marginBottom: 4,
                        }}
                      >
                        {coverage}
                      </div>

                      <div style={{ fontSize: 11, color: "#9ca3af" }}>
                        Required Minimum:{" "}
                        <span
                          style={{
                            color: "#facc15",
                            fontWeight: 600,
                          }}
                        >
                          {rawReq || "—"}
                        </span>
                      </div>

                      <div
                        style={{
                          fontSize: 11,
                          color: "#9ca3af",
                          marginTop: 6,
                        }}
                      >
                        Policy Found:{" "}
                        {matchPolicy ? (
                          <>
                            <span style={{ color: "#93c5fd" }}>
                              {matchPolicy.policy_number || "—"}
                            </span>
                            <br />
                            Limit:{" "}
                            <strong style={{ color: "#38bdf8" }}>
                              {matchPolicy.limit_each_occurrence ||
                                matchPolicy.auto_limit ||
                                matchPolicy.umbrella_limit ||
                                "—"}
                            </strong>
                          </>
                        ) : (
                          <span style={{ color: "#fb7185" }}>
                            None on file
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          marginTop: 8,
                          fontSize: 12,
                          fontWeight: 600,
                          color: textColor,
                        }}
                      >
                        {meets
                          ? "✓ Meets requirement"
                          : "✗ Does not meet requirement"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        {/* ============================================================
            RULE ENGINE V5 — FULL PANEL + MINI TIMELINE
        ============================================================= */}
        <div
          style={{
            marginTop: 10,
            marginBottom: 40,
            display: "grid",
            gridTemplateColumns: "minmax(0,1.2fr) minmax(0,2fr)",
            gap: 18,
          }}
        >
          {/* SCORE PANEL */}
          <div
            style={{
              borderRadius: 16,
              padding: 16,
              background: "rgba(15,23,42,0.98)",
              border: "1px solid rgba(56,65,85,0.9)",
            }}
          >
            <div
              style={{
                fontSize: 12,
                textTransform: "uppercase",
                color: "#9ca3af",
                marginBottom: 8,
              }}
            >
              Rule Engine V5 — Vendor Risk Score
            </div>

            {engineLoading && (
              <div style={{ fontSize: 13, color: "#9ca3af" }}>
                Running engine…
              </div>
            )}

            {!engineLoading && engineError && (
              <div style={{ fontSize: 13, color: "#fecaca" }}>
                {engineError}
              </div>
            )}

            {!engineLoading && !engineError && engineSummary && (
              <>
                <div
                  style={{
                    fontSize: 32,
                    fontWeight: 700,
                    marginBottom: 4,
                    background:
                      engineSummary.globalScore >= 80
                        ? "linear-gradient(120deg,#22c55e,#bef264)"
                        : engineSummary.globalScore >= 60
                        ? "linear-gradient(120deg,#facc15,#fde68a)"
                        : "linear-gradient(120deg,#fb7185,#fecaca)",
                    WebkitBackgroundClip: "text",
                    color: "transparent",
                  }}
                >
                  {engineSummary.globalScore}
                </div>

                <div style={{ color: "#9ca3af", fontSize: 11 }}>
                  Global Score (V5)
                </div>

                <div
                  style={{
                    marginTop: 8,
                    fontSize: 11,
                    color: "#9ca3af",
                  }}
                >
                  Rules Evaluated:{" "}
                  <strong>{engineSummary.totalRules}</strong> · Failing:{" "}
                  <strong>{engineSummary.failedCount}</strong>
                </div>

                <button
                  onClick={() =>
                    runRuleEngineV5(vendor.id, org?.id || activeOrgId)
                  }
                  style={{
                    marginTop: 12,
                    padding: "6px 12px",
                    borderRadius: 999,
                    border: "1px solid rgba(75,85,99,0.9)",
                    background: "rgba(15,23,42,0.9)",
                    color: "#e5e7eb",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  🔁 Re-run Engine
                </button>
              </>
            )}
          </div>

          {/* FAILING RULES + MINI TIMELINE */}
          <div
            style={{
              borderRadius: 16,
              padding: 16,
              background: "rgba(15,23,42,0.98)",
              border: "1px solid rgba(56,65,85,0.9)",
            }}
          >
            <div
              style={{
                fontSize: 12,
                textTransform: "uppercase",
                color: "#9ca3af",
                marginBottom: 8,
              }}
            >
              Failing Rules (V5 Engine)
            </div>

            {/* NO FAILURES */}
            {failingRules.length === 0 &&
              !engineLoading &&
              !engineError && (
                <div style={{ fontSize: 13, color: "#9ca3af" }}>
                  ✓ No failing V5 rules — vendor appears compliant.
                </div>
              )}

            {/* FAILING RULE LIST */}
            <div
              style={{
                maxHeight: 240,
                overflowY: "auto",
                paddingRight: 6,
              }}
            >
              {failingRules.map((r, idx) => {
                const sev = (r.severity || "medium").toLowerCase();

                const sevColor =
                  sev === "critical"
                    ? "#fecaca"
                    : sev === "high"
                    ? "#fef3c7"
                    : "#bfdbfe";

                const borderColor =
                  sev === "critical"
                    ? "rgba(248,113,113,0.7)"
                    : sev === "high"
                    ? "rgba(250,204,21,0.8)"
                    : "rgba(59,130,246,0.7)";

                return (
                  <div
                    key={idx}
                    style={{
                      borderRadius: 12,
                      padding: 10,
                      border: `1px solid ${borderColor}`,
                      background: "rgba(2,6,23,0.9)",
                      marginBottom: 10,
                      fontSize: 12,
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 600,
                        marginBottom: 4,
                        color: sevColor,
                      }}
                    >
                      [{sev.toUpperCase()}] {r.fieldKey} {r.operator}{" "}
                      {String(r.expectedValue)}
                    </div>

                    <div
                      style={{
                        color: "#e5e7eb",
                        whiteSpace: "pre-wrap",
                        lineHeight: 1.35,
                      }}
                    >
                      {r.message}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* MINI TIMELINE */}
            <div
              style={{
                marginTop: 16,
                paddingTop: 10,
                borderTop: "1px solid rgba(56,65,85,0.6)",
              }}
            >
              <div
                style={{
                 
                {(failingRules || []).slice(0, 20).map((r, idx) => {
                  const sev = (r.severity || "medium").toLowerCase();
                  const dotColor =
                    sev === "critical"
                      ? "#ef4444"
                      : sev === "high"
                      ? "#facc15"
                      : "#3b82f6";

                  return (
                    <div
                      key={idx}
                      style={{
                        minWidth: 14,
                        height: 14,
                        borderRadius: "50%",
                        background: dotColor,
                        boxShadow: `0 0 10px ${dotColor}`,
                      }}
                      title={`${r.fieldKey} ${r.operator} ${r.expectedValue}`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>

      </div> {/* end inner wrapper */}
    </div>   {/* end outer cockpit */}
  );
}           {/* END OF COMPONENT */}
