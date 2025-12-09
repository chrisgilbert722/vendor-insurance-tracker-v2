// pages/admin/vendor/[id]/fix.js
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import EliteComplianceBlock from "../../../../components/elite/EliteComplianceBlock";
import { useOrg } from "../../../../context/OrgContext";

// ---------- RISK HELPERS ----------
function parseExpiration(x) {
  if (!x) return null;
  const [mm, dd, yyyy] = String(x).split("/");
  if (!mm || !dd || !yyyy) return null;
  return new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
}

function daysLeft(x) {
  const d = parseExpiration(x);
  if (!d) return null;
  return Math.floor((d - new Date()) / 86400000);
}

function expirationRisk(policy) {
  if (!policy) return { score: 0, sev: "unknown", left: null };
  const left = daysLeft(policy.expiration_date);
  if (left === null) return { score: 0, sev: "unknown", left };
  if (left < 0) return { score: 20, sev: "expired", left };
  if (left <= 30) return { score: 40, sev: "critical", left };
  if (left <= 90) return { score: 70, sev: "warning", left };
  return { score: 95, sev: "ok", left };
}

function eliteRisk(e) {
  if (!e || e.error || e.loading) return { factor: 1, sev: "unknown" };
  if (e.overall === "fail") return { factor: 0.4, sev: "fail" };
  if (e.overall === "warn") return { factor: 0.7, sev: "warn" };
  return { factor: 1, sev: "pass" };
}

function complianceRisk(c) {
  if (!c || c.error) return { factor: 1, sev: "unknown" };
  const missing = (c.missing || []).length > 0;
  const failing = (c.failing || []).length > 0;
  if (failing) return { factor: 0.5, sev: "failing" };
  if (missing) return { factor: 0.7, sev: "missing" };
  return { factor: 1, sev: "ok" };
}

function ruleRisk(r) {
  if (!r) return { factor: 1, sev: "unknown", score: null };
  const s = r.globalScore;
  if (s == null) return { factor: 1, sev: "unknown", score: null };
  if (s >= 85) return { factor: 1, sev: "elite", score: s };
  if (s >= 70) return { factor: 0.9, sev: "good", score: s };
  if (s >= 50) return { factor: 0.7, sev: "watch", score: s };
  return { factor: 0.4, sev: "critical", score: s };
}

function computeUnified(primary, elite, comp, rule) {
  const exp = expirationRisk(primary);
  const e = eliteRisk(elite);
  const c = complianceRisk(comp);
  const r = ruleRisk(rule);

  let s = exp.score * e.factor * c.factor * r.factor;
  s = Math.max(0, Math.min(100, Math.round(s)));

  let tier = "Severe";
  if (s >= 85) tier = "Elite Safe";
  else if (s >= 70) tier = "Preferred";
  else if (s >= 55) tier = "Watch";
  else if (s >= 35) tier = "High Risk";

  return { score: s, tier, exp, e, c, r };
}

export default function VendorFixPage() {
  const router = useRouter();
  const { id } = router.query;
  const { activeOrgId } = useOrg();

  const [vendor, setVendor] = useState(null);
  const [org, setOrg] = useState(null);
  const [policies, setPolicies] = useState([]);

  const [compliance, setCompliance] = useState(null);
  const [eliteResult, setEliteResult] = useState(null);
  const [engineSummary, setEngineSummary] = useState(null);
  const [failingRules, setFailingRules] = useState([]);

  const [engineLoading, setEngineLoading] = useState(false);
  const [engineError, setEngineError] = useState("");

  const [fixLoading, setFixLoading] = useState(false);
  const [fixError, setFixError] = useState("");
  const [fixSteps, setFixSteps] = useState([]);
  const [fixBody, setFixBody] = useState("");
  const [fixSubject, setFixSubject] = useState("");
  const [fixInternalNotes, setFixInternalNotes] = useState("");

  const [sendLoading, setSendLoading] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sendSuccess, setSendSuccess] = useState("");

  const [loadingVendor, setLoadingVendor] = useState(true);
  const [error, setError] = useState("");

  const isDemo = !id || Number.isNaN(Number(id));

  // ---------- LOAD VENDOR + COMPLIANCE + ELITE ----------
  useEffect(() => {
    if (!id) return;

    (async () => {
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
          const r = await fetch(
            `/api/requirements/check?vendorId=${data.vendor.id}&orgId=${data.vendor.org_id}`
          );
          const comp = await r.json();
          if (comp.ok) setCompliance(comp);
          else setCompliance({ error: comp.error });

          const p = data.policies?.[0];
          if (p) {
            const eliteRes = await fetch("/api/elite/evaluate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                coidata: {
                  expirationDate: p.expiration_date,
                  generalLiabilityLimit: p.limit_each_occurrence,
                  autoLimit: p.auto_limit,
                  workCompLimit: p.work_comp_limit,
                  policyType: p.coverage_type,
                },
              }),
            });
            const e = await eliteRes.json();
            setEliteResult(
              e.ok
                ? { overall: e.overall, rules: e.rules || [] }
                : { error: e.error }
            );
          }
        }
      } catch (err) {
        setError(err.message || "Failed to load vendor.");
      } finally {
        setLoadingVendor(false);
      }
    })();
  }, [id, activeOrgId]);

  // ---------- RUN RULE ENGINE ----------
  async function runEngine() {
    if (!vendor?.id || !org?.id) return;
    const v = Number(vendor.id);
    const o = Number(org.id);
    if (!v || !o) return;

    try {
      setEngineLoading(true);
      setEngineError("");
      setEngineSummary(null);
      setFailingRules([]);

      const res = await fetch("/api/engine/run-v3", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorId: v, orgId: o, dryRun: false }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error);

      setEngineSummary({
        globalScore: j.globalScore,
        totalRules: j.totalRules,
        failedCount: j.failedCount,
      });
      setFailingRules(j.failingRules || []);
    } catch (err) {
      setEngineError(err.message || "Failed to run rule engine.");
    } finally {
      setEngineLoading(false);
    }
  }

  // ---------- FIX PLAN ----------
  async function loadFixPlan() {
    if (!vendor || !org) return;
    if (isDemo) {
      setFixError("Fix Plan disabled for demo vendors.");
      return;
    }
    try {
      setFixLoading(true);
      setFixError("");
      setFixSteps([]);
      setFixBody("");
      setFixSubject("");
      setFixInternalNotes("");

      const res = await fetch(
        `/api/vendor/fix-plan?vendorId=${vendor.id}&orgId=${org.id}`
      );
      const d = await res.json();
      if (!d.ok) throw new Error(d.error);

      setFixSteps(d.steps || []);
      setFixBody(d.vendorEmailBody || "");
      setFixSubject(d.vendorEmailSubject || "");
      setFixInternalNotes(d.internalNotes || "");
    } catch (err) {
      setFixError(err.message || "Failed to load fix plan.");
    } finally {
      setFixLoading(false);
    }
  }

  // ---------- SEND FIX EMAIL ----------
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

      const j = await res.json();
      if (!j.ok) throw new Error(j.error);
      setSendSuccess("Email sent.");
    } catch (err) {
      setSendError(err.message || "Failed to send email.");
    } finally {
      setSendLoading(false);
    }
  }

  // ---------- PDF HELPERS ----------
  async function downloadPDF() {
    if (!vendor) return;
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

      if (!res.ok) throw new Error("PDF generation failed.");
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
    if (!vendor || !org) return;
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

      if (!res.ok) throw new Error("Enterprise PDF failed.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${vendor.name.replace(
        /\s+/g,
        "_"
      )}_Compliance_Report.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Enterprise PDF Error: " + err.message);
    }
  }

  // ---------- EARLY RETURNS ----------
  if (loadingVendor) {
    return (
      <div
        style={{
          minHeight: "100vh",
          padding: 40,
          background: "#020617",
          color: "#e5e7eb",
        }}
      >
        Loading vendor…
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          padding: 40,
          background: "#020617",
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
          background: "#020617",
          color: "#e5e7eb",
        }}
      >
        Vendor not found.
      </div>
    );
  }

  // ---------- RISK + STYLES ----------
  const primary = policies[0] || null;
  const risk = computeUnified(primary, eliteResult, compliance, engineSummary);

  const wrapperStyle = {
    minHeight: "100vh",
    background: "radial-gradient(circle at top left,#020617 0%,#000 100%)",
    padding: "28px 40px",
    color: "#e5e7eb",
    position: "relative",
  };

  const glowStyle = {
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
  };

  return (
    <div style={wrapperStyle}>
      <div style={glowStyle} />
      <div style={{ position: "relative", zIndex: 2 }}>
        {/* HEADER */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 24,
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>
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
              <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>
                Org: <span style={{ color: "#e5e7eb" }}>{org.name}</span>
              </div>
            )}
          </div>

          <div
            style={{
              borderRadius: 18,
              padding: "12px 18px",
              background: "rgba(15,23,42,0.95)",
              border: "1px solid rgba(148,163,184,0.6)",
              textAlign: "center",
              minWidth: 150,
              boxShadow: "0 18px 40px rgba(15,23,42,0.9)",
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: "#9ca3af",
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              Unified Risk
            </div>
            <div
              style={{
                fontSize: 32,
                fontWeight: 700,
                background:
                  risk.score >= 80
                    ? "linear-gradient(120deg,#22c55e,#bef264)"
                    : risk.score >= 60
                    ? "linear-gradient(120deg,#facc15,#fde68a)"
                    : "linear-gradient(120deg,#fb7185,#fecaca)",
                WebkitBackgroundClip: "text",
                color: "transparent",
                marginBottom: 2,
              }}
            >
              {risk.score}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600 }}>{risk.tier}</div>
          </div>
        </div>

        {/* COMPLIANCE + ELITE + BREAKDOWN */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,2.1fr) minmax(0,1.4fr)",
            gap: 20,
            marginBottom: 30,
          }}
        >
          <div
            style={{
              borderRadius: 24,
              padding: 20,
              background:
                "radial-gradient(circle at top left,rgba(15,23,42,0.98),rgba(15,23,42,0.92))",
              border: "1px solid rgba(148,163,184,0.7)",
              boxShadow: "0 30px 80px rgba(15,23,42,0.95)",
            }}
          >
            {compliance?.error ? (
              <div style={{ color: "#fca5a5", fontSize: 13 }}>
                {compliance.error}
              </div>
            ) : (
              <>
                <div
                  style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: 0.08,
                    color: "#9ca3af",
                    marginBottom: 6,
                  }}
                >
                  Compliance Intelligence
                </div>
                <div
                  style={{
                    fontSize: 13,
                    marginBottom: 14,
                    color: "#e5e7eb",
                    maxWidth: 520,
                  }}
                >
                  {compliance?.summary || "Compliance summary unavailable"}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 16,
                  }}
                >
                  <div
                    style={{
                      borderRadius: 18,
                      padding: 12,
                      background:
                        "linear-gradient(145deg,rgba(15,23,42,0.97),rgba(15,23,42,0.94))",
                      border: "1px solid rgba(51,65,85,0.9)",
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
                        expirationDate: primary?.expiration_date,
                        generalLiabilityLimit: primary?.limit_each_occurrence,
                        autoLimit: primary?.auto_limit,
                        workCompLimit: primary?.work_comp_limit,
                        policyType: primary?.coverage_type,
                      }}
                    />
                  </div>

                  <div
                    style={{
                      borderRadius: 18,
                      padding: 12,
                      background:
                        "radial-gradient(circle at top,rgba(2,6,23,0.98),rgba(15,23,42,0.98))",
                      border: "1px solid rgba(51,65,85,0.9)",
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
                      {primary?.expiration_date || "—"} (
                      {risk.exp.left ?? "?"} days)
                    </div>
                    <div style={{ fontSize: 12, marginBottom: 6 }}>
                      <strong>Elite:</strong> {risk.e.sev}
                    </div>
                    <div style={{ fontSize: 12, marginBottom: 6 }}>
                      <strong>Compliance:</strong> {risk.c.sev}
                    </div>
                    <div style={{ fontSize: 12 }}>
                      <strong>Rule Engine:</strong> {risk.r.sev} (
                      {risk.r.score ?? "—"})
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* FIX PLAN V5 */}
        <div
          style={{
            borderRadius: 24,
            padding: 20,
            background:
              "radial-gradient(circle at top right,rgba(15,23,42,0.98),rgba(15,23,42,1))",
            border: "1px solid rgba(148,163,184,0.65)",
            boxShadow: "0 26px 70px rgba(15,23,42,0.98)",
            marginBottom: 32,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "flex-start",
              marginBottom: 10,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  color: "#9ca3af",
                  marginBottom: 4,
                }}
              >
                AI Fix Plan V5
              </div>
              <div style={{ fontSize: 12, color: "#e5e7eb" }}>
                Cinematic remediation playbook generated for this vendor’s
                coverage gaps and contract requirements.
              </div>
            </div>

            <button
              onClick={loadFixPlan}
              disabled={fixLoading}
              style={{
                borderRadius: 999,
                padding: "7px 16px",
                border: "1px solid rgba(59,130,246,0.95)",
                background:
                  "linear-gradient(140deg,#3b82f6,#1d4ed8,#0f172a)",
                color: "#e5f2ff",
                fontSize: 11,
                fontWeight: 500,
                boxShadow: "0 0 18px rgba(59,130,246,0.55)",
                cursor: fixLoading ? "not-allowed" : "pointer",
              }}
            >
              {fixLoading ? "Generating…" : "⚡ Generate Fix Plan"}
            </button>
          </div>

          {fixError && (
            <div style={{ color: "#fca5a5", fontSize: 12, marginBottom: 8 }}>
              {fixError}
            </div>
          )}

          {fixSteps.length > 0 && (
            <>
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  color: "#9ca3af",
                  marginBottom: 6,
                }}
              >
                Recommended Actions
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {fixSteps.map((step, idx) => {
                  const t = String(step).toLowerCase();
                  let sev = "normal";
                  if (t.includes("urgent") || t.includes("immediately"))
                    sev = "critical";
                  else if (
                    t.includes("renew") ||
                    t.includes("missing") ||
                    t.includes("update")
                  )
                    sev = "warning";

                  const borderColor =
                    sev === "critical"
                      ? "rgba(248,113,113,0.9)"
                      : sev === "warning"
                      ? "rgba(250,204,21,0.85)"
                      : "rgba(148,163,184,0.5)";

                  const label =
                    sev === "critical"
                      ? "CRITICAL"
                      : sev === "warning"
                      ? "WARNING"
                      : "RECOMMENDED";

                  const labelColor =
                    sev === "critical"
                      ? "#fecaca"
                      : sev === "warning"
                      ? "#fde68a"
                      : "#e5e7eb";

                  return (
                    <div
                      key={idx}
                      style={{
                        borderRadius: 14,
                        border: `1px solid ${borderColor}`,
                        padding: 12,
                        background: "rgba(15,23,42,0.97)",
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
                          lineHeight: 1.4,
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

          {fixBody && (
            <>
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  color: "#9ca3af",
                  marginTop: 14,
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
                  fontSize: 12,
                  border: "1px solid rgba(51,65,85,0.95)",
                  background: "rgba(15,23,42,0.99)",
                  color: "#e5e7eb",
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
                  border: "1px solid rgba(22,163,74,0.95)",
                  background:
                    "linear-gradient(145deg,#22c55e,#16a34a,#052e16)",
                  color: "#ecfdf5",
                  fontSize: 12,
                  fontWeight: 500,
                  boxShadow: "0 0 16px rgba(34,197,94,0.5)",
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

              <button
                onClick={downloadPDF}
                style={{
                  width: "100%",
                  marginTop: 10,
                  borderRadius: 999,
                  padding: "8px 14px",
                  border: "1px solid rgba(59,130,246,0.9)",
                  background:
                    "linear-gradient(145deg,#2563eb,#1d4ed8,#0f172a)",
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
                  border: "1px solid rgba(148,163,184,0.85)",
                  background:
                    "linear-gradient(145deg,#111827,#020617,#000)",
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

        {/* CONTRACT REQUIREMENTS V2 */}
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
                Contract Requirements
              </h3>

              <p
                style={{
                  fontSize: 12,
                  color: "#9ca3af",
                  marginBottom: 14,
                }}
              >
                Minimum coverages extracted from the contract and matched to
                uploaded policies.
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
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
                            <span style={{ color: "#38bdf8" }}>
                              {matchPolicy.limit_each_occurrence ||
                                matchPolicy.auto_limit ||
                                matchPolicy.umbrella_limit ||
                                "—"}
                            </span>
                          </>
                        ) : (
                          <span style={{ color: "#fb7185" }}>None on file</span>
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

        {/* RULE ENGINE V5 */}
        <div
          style={{
            marginBottom: 40,
            display: "grid",
            gridTemplateColumns: "minmax(0,1.2fr) minmax(0,2fr)",
            gap: 18,
          }}
        >
          <div
            style={{
              borderRadius: 18,
              padding: 16,
              background: "rgba(15,23,42,0.98)",
              border: "1px solid rgba(56,65,85,0.9)",
              boxShadow: "0 24px 60px rgba(15,23,42,0.95)",
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: "#9ca3af",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Rule Engine V5 Score
            </div>

            {engineLoading && (
              <div style={{ fontSize: 13, color: "#9ca3af" }}>
                Running engine…
              </div>
            )}

            {!engineLoading && engineError && (
              <div style={{ fontSize: 13, color: "#fca5a5" }}>
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
                  Rules evaluated:
                  <strong> {engineSummary.totalRules}</strong> · Failing:
                  <strong> {engineSummary.failedCount}</strong>
                </div>

                <button
                  onClick={runEngine}
                  style={{
                    marginTop: 12,
                    padding: "6px 12px",
                    borderRadius: 999,
                    border: "1px solid rgba(75,85,99,0.9)",
                    background: "rgba(15,23,42,0.9)",
                    color: "#e5e7eb",
                    fontSize: 12,
                  }}
                >
                  🔁 Re-run Engine
                </button>
              </>
            )}
          </div>

          <div
            style={{
              borderRadius: 18,
              padding: 16,
              background: "rgba(15,23,42,0.98)",
              border: "1px solid rgba(56,65,85,0.9)",
              boxShadow: "0 24px 60px rgba(15,23,42,0.9)",
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: "#9ca3af",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Failing Rules
            </div>

            {failingRules.length === 0 &&
              !engineLoading &&
              !engineError && (
                <div style={{ fontSize: 13, color: "#9ca3af" }}>
                  ✓ No failing V5 rules
                </div>
              )}

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
                      background: "rgba(2,6,23,0.96)",
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

            <div
              style={{
                marginTop: 16,
                paddingTop: 10,
                borderTop: "1px solid rgba(56,65,85,0.6)",
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
        </div>
      </div>
    </div>
  );
}
