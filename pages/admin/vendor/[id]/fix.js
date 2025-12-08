// pages/admin/vendor/[id]/fix.js
// ============================================================
// Vendor Fix Cockpit V5 — Elite Edition (Full Clean Build)
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
  const [mm, dd, yyyy] = String(dateStr).split("/");
  return new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
}

function computeDaysLeft(dateStr) {
  const d = parseExpiration(dateStr);
  if (!d) return null;
  return Math.floor((d - new Date()) / (1000 * 60 * 60 * 24));
}

/* ============================================================
   EXPIRATION RISK
============================================================ */
function expirationRisk(policy) {
  if (!policy) return { score: 0, severity: "unknown", daysLeft: null };
  const daysLeft = computeDaysLeft(policy.expiration_date);

  if (daysLeft === null) return { score: 0, severity: "unknown", daysLeft };
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
function complianceRisk(data) {
  if (!data || data.error) return { factor: 1.0, severity: "unknown" };
  const missing = (data.missing || []).length > 0;
  const failing = (data.failing || []).length > 0;

  if (failing) return { factor: 0.5, severity: "failing" };
  if (missing) return { factor: 0.7, severity: "missing" };
  return { factor: 1.0, severity: "ok" };
}

/* ============================================================
   RULE ENGINE RISK
============================================================ */
function ruleEngineRisk(summary) {
  if (!summary) return { factor: 1.0, score: null, severity: "unknown" };

  const s = summary.globalScore ?? null;
  if (s === null) return { factor: 1.0, score: null, severity: "unknown" };

  if (s >= 85) return { factor: 1.0, score: s, severity: "elite" };
  if (s >= 70) return { factor: 0.9, score: s, severity: "good" };
  if (s >= 50) return { factor: 0.7, score: s, severity: "watch" };
  return { factor: 0.4, score: s, severity: "critical" };
}

/* ============================================================
   UNIFIED RISK ENGINE
============================================================ */
function computeUnifiedRisk({ primary, elite, compliance, engineSummary }) {
  const exp = expirationRisk(primary);
  const e = eliteRisk(elite);
  const comp = complianceRisk(compliance);
  const re = ruleEngineRisk(engineSummary);

  let score = exp.score * e.factor * comp.factor * re.factor;
  score = Math.max(0, Math.min(100, Math.round(score)));

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
    elite: e,
    compliance: comp,
    ruleEngine: re,
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

          setEliteResult(
            eliteJson.ok
              ? { overall: eliteJson.overall, rules: eliteJson.rules || [] }
              : { error: eliteJson.error }
          );
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
  async function runRuleEngineV5(vId, oId) {
    const vendorIdNum = Number(vId || vendor?.id);
    const orgIdNum = Number(oId || org?.id || activeOrgId);

    if (!vendorIdNum || Number.isNaN(vendorIdNum)) return;
    if (!orgIdNum || Number.isNaN(orgIdNum)) return;

    try {
      setEngineLoading(true);
      setEngineSummary(null);
      setEngineError("");
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
     FIX PLAN V5 LOAD
============================================================ */
  async function loadFixPlan() {
    if (!vendor || !org) return;

    if (isDemoVendor) {
      setFixError("Fix Plan disabled in demo mode.");
      return;
    }

    try {
      setFixLoading(true);
      setFixSteps([]);
      setFixError("");
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
     PDF HELPERS
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

      if (!res.ok) throw new Error("Enterprise PDF failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${vendor.name.replace(/\s+/g, "_")}_Compliance_Report.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Enterprise PDF Error: " + err.message);
    }
  }


  /* ============================================================
     EARLY RETURNS
============================================================ */
  if (loadingVendor) {
    return (
      <div style={{ padding: 40, color: "#e5e7eb" }}>
        <h1>Loading vendor…</h1>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 40, color: "#fecaca" }}>
        <h1>Error</h1>
        <p>{error}</p>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div style={{ padding: 40, color: "#e5e7eb" }}>
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
     MAIN OUTER WRAPPER START
============================================================ */
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at top left,#020617,#000)",
        padding: "28px 40px",
        color: "#e5e7eb",
        position: "relative",
      }}
    >
      {/* Glow */}
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
        }}
      />

      <div style={{ position: "relative", zIndex: 2 }}>
        {/* ============================================================
            HEADER + UNIFIED RISK METER
        ============================================================= */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 24,
            alignItems: "flex-start",
          }}
        >
          {/* LEFT SIDE — TITLE */}
          <div>
            <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 6 }}>
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
              <p style={{ fontSize: 13, color: "#9ca3af", marginTop: 6 }}>
                Org: <span style={{ color: "#e5e7eb" }}>{org.name}</span>
              </p>
            )}
          </div>

          {/* RIGHT SIDE — UNIFIED RISK SCORE */}
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
            COMPLIANCE + ELITE + RISK COMPONENT PANELS
        ============================================================= */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,2fr) minmax(0,1.3fr)",
            gap: 20,
            marginBottom: 26,
          }}
        >
          {/* LEFT PANEL — COMPLIANCE + RISK COMPONENTS */}
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

            {!compliance || compliance.error ? (
              <div style={{ fontSize: 13, color: "#fecaca" }}>
                {compliance?.error || "Compliance unavailable"}
              </div>
            ) : (
              <>
                {/* SUMMARY */}
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: "#e5e7eb",
                    marginBottom: 14,
                  }}
                >
                  {compliance.summary || "No compliance summary available."}
                </div>

                {/* GRID: Elite + Risk Components */}
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
                        textTransform: "uppercase",
                        color: "#9ca3af",
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

          {/* RIGHT PANEL — AI FIX PLAN PANEL BEGINS IN NEXT SECTION */}
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
            marginBottom: 32,
          }}
        >
          {/* HEADER */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 12,
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
                Smart, prioritized remediation generated from this vendor’s
                certificates.
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

          {/* ERRORS */}
          {fixError && (
            <div style={{ color: "#fca5a5", fontSize: 12, marginBottom: 10 }}>
              {fixError}
            </div>
          )}

          {/* FIX STEPS */}
          {fixSteps.length > 0 && (
            <>
              <div
                style={{
                  fontSize: 11,
                  color: "#9ca3af",
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                Recommended Actions
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {fixSteps.map((step, idx) => {
                  const text = step.toLowerCase();
                  let sev = "normal";

                  if (text.includes("urgent") || text.includes("immediately"))
                    sev = "critical";
                  else if (
                    text.includes("renew") ||
                    text.includes("missing") ||
                    text.includes("update")
                  )
                    sev = "warning";

                  const borderColor =
                    sev === "critical"
                      ? "rgba(248,113,113,0.8)"
                      : sev === "warning"
                      ? "rgba(250,204,21,0.8)"
                      : "rgba(148,163,184,0.4)";

                  const labelColor =
                    sev === "critical"
                      ? "#fca5a5"
                      : sev === "warning"
                      ? "#fde68a"
                      : "#e5e7eb";

                  const label =
                    sev === "critical"
                      ? "CRITICAL"
                      : sev === "warning"
                      ? "WARNING"
                      : "RECOMMENDED";

                  return (
                    <div
                      key={idx}
                      style={{
                        padding: 12,
                        borderRadius: 12,
                        background: "rgba(15,23,42,0.96)",
                        border: `1px solid ${borderColor}`,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          textTransform: "uppercase",
                          color: labelColor,
                          marginBottom: 4,
                        }}
                      >
                        {label}
                      </div>

                      <div
                        style={{
                          fontSize: 12,
                          color: "#e5e7eb",
                          lineHeight: 1.35,
                        }}
                      >
                        {step}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* EMAIL + PDF BLOCK */}
          {fixBody && (
            <>
              <div
                style={{
                  fontSize: 11,
                  marginTop: 16,
                  marginBottom: 6,
                  textTransform: "uppercase",
                  color: "#9ca3af",
                }}
              >
                Email to Vendor
              </div>

              <textarea
                readOnly
                value={fixBody}
                style={{
                  width: "100%",
                  minHeight: 130,
                  borderRadius: 12,
                  padding: 10,
                  fontSize: 12,
                  border: "1px solid rgba(51,65,85,0.9)",
                  background: "rgba(15,23,42,0.98)",
                  color: "#e5e7eb",
                  resize: "vertical",
                }}
              />

              {/* SEND BUTTON */}
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
                }}
              >
                {sendLoading ? "Sending…" : "📬 Send Fix Email"}
              </button>

              {sendError && (
                <div style={{ color: "#fecaca", fontSize: 12, marginTop: 6 }}>
                  {sendError}
                </div>
              )}

              {sendSuccess && (
                <div style={{ color: "#bbf7d0", fontSize: 12, marginTop: 6 }}>
                  {sendSuccess}
                </div>
              )}

              {/* PDF BUTTONS */}
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
                    "radial-gradient(circle at top left,#111827,#020617,#000)",
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
                marginBottom: 32,
                padding: 20,
                borderRadius: 22,
                background: "rgba(15,23,42,0.96)",
                border: "1px solid rgba(56,189,248,0.35)",
              }}
            >
              <h3
                style={{
                  marginTop: 0,
                  marginBottom: 8,
                  fontSize: 16,
                  color: "#38bdf8",
                }}
              >
                Contract Requirements (V2)
              </h3>

              <p
                style={{
                  fontSize: 12,
                  color: "#9ca3af",
                  marginBottom: 14,
                }}
              >
                These minimum coverages are extracted from the contract and
                checked against uploaded policies.
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

                  return (
                    <div
                      key={idx}
                      style={{
                        padding: 14,
                        borderRadius: 16,
                        background: "rgba(2,6,23,0.9)",
                        border: `1px solid ${
                          meets
                            ? "rgba(34,197,94,0.4)"
                            : "rgba(248,113,113,0.6)"
                        }`,
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
                          color: meets ? "#22c55e" : "#fb7185",
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
            marginBottom: 40,
            display: "grid",
            gridTemplateColumns: "minmax(0,1.2fr) minmax(0,2fr)",
            gap: 18,
          }}
        >
          {/* ============================================================
              LEFT PANEL — RULE ENGINE V5 SCORE
          ============================================================= */}
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

            {/* LOADING */}
            {engineLoading && (
              <div style={{ fontSize: 13, color: "#9ca3af" }}>
                Running engine…
              </div>
            )}

            {/* ERROR */}
            {!engineLoading && engineError && (
              <div style={{ fontSize: 13, color: "#fca5a5" }}>
                {engineError}
              </div>
            )}

            {/* SCORE DETAILS */}
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

                <div style={{ fontSize: 11, color: "#9ca3af" }}>
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

          {/* ============================================================
              RIGHT PANEL — FAILING RULES + TIMELINE
          ============================================================= */}
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

            {/* ============================================================
                MINI TIMELINE
            ============================================================= */}
            <div
              style={{
                marginTop: 18,
                paddingTop: 10,
                borderTop: "1px solid rgba(56,65,85,0.6)",
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
                Rule Timeline
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 6,
                  overflowX: "auto",
                  paddingBottom: 4,
                }}
              >
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
        </div> {/* END RULE ENGINE GRID */}
      </div> {/* END inner wrapper */}
    </div>   {/* END outer cockpit wrapper */}
  );
}           {/* END VendorFixPage component */}
