// pages/admin/vendor/[id]/fix.js
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import EliteComplianceBlock from "../../../../components/elite/EliteComplianceBlock";
import { useOrg } from "../../../../context/OrgContext";

function parseExpiration(x) {
  if (!x) return null;
  const [mm, dd, yyyy] = x.split("/");
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

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setLoadingVendor(true);
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
              e.ok ? { overall: e.overall, rules: e.rules || [] } : { error: e.error }
            );
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingVendor(false);
      }
    })();
  }, [id, activeOrgId]);

  async function runEngine() {
    if (!vendor?.id || !org?.id) return;
    const v = Number(vendor.id);
    const o = Number(org.id);
    if (!v || !o) return;

    try {
      setEngineLoading(true);
      setEngineError("");
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
      setEngineError(err.message);
    } finally {
      setEngineLoading(false);
    }
  }

  async function loadFixPlan() {
    if (isDemo) {
      setFixError("Fix Plan disabled for demo vendors.");
      return;
    }
    try {
      setFixLoading(true);
      setFixSteps([]);
      setFixBody("");
      setFixInternalNotes("");
      setFixSubject("");

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
      setFixError(err.message);
    } finally {
      setFixLoading(false);
    }
  }

  async function sendFixEmail() {
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
      setSendError(err.message);
    } finally {
      setSendLoading(false);
    }
  }

  if (loadingVendor)
    return <div style={{ padding: 40, color: "#e5e7eb" }}>Loading…</div>;
  if (error)
    return (
      <div style={{ padding: 40, color: "#fecaca" }}>
        Error: {error}
      </div>
    );
  if (!vendor)
    return (
      <div style={{ padding: 40, color: "#e5e7eb" }}>Vendor not found.</div>
    );

  const primary = policies[0] || null;
  const risk = computeUnified(primary, eliteResult, compliance, engineSummary);

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
      <div
        style={{
          position: "absolute",
          top: -260,
          left: "50%",
          transform: "translateX(-50%)",
          width: 1100,
          height: 1100,
          background:"radial-gradient(circle, rgba(59,130,246,0.35), transparent 60%)",
          filter: "blur(120px)",
        }}
      />

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
              <a href="/vendors" style={{ color: "#93c5fd" }}>Vendors</a> /
              <a href={`/admin/vendor/${vendor.id}`} style={{ color: "#93c5fd" }}>
                {" "}
                {vendor.name}
              </a>{" "}
              / Fix Cockpit
            </div>

            <h1
              style={{
                fontSize: 28,
                fontWeight: 600,
                margin: 0,
                background:"linear-gradient(90deg,#38bdf8,#818cf8,#e5e7eb)",
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

          {/* RISK SCORE BOX */}
          <div
            style={{
              borderRadius: 16,
              padding: "12px 18px",
              background: "rgba(15,23,42,0.9)",
              border: "1px solid rgba(148,163,184,0.5)",
              textAlign: "center",
              minWidth: 140,
            }}
          >
            <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>
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
            gridTemplateColumns: "minmax(0,2fr) minmax(0,1.3fr)",
            gap: 20,
            marginBottom: 30,
          }}
        >
          <div
            style={{
              borderRadius: 20,
              padding: 18,
              background:"rgba(15,23,42,0.95)",
              border:"1px solid rgba(148,163,184,0.5)",
            }}
          >
            {compliance?.error ? (
              <div style={{ color: "#fca5a5", fontSize: 13 }}>{compliance.error}</div>
            ) : (
              <>
                <div style={{ fontSize: 13, marginBottom: 12 }}>
                  {compliance?.summary || "Compliance summary unavailable"}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 14,
                  }}
                >
                  <div
                    style={{
                      borderRadius: 16,
                      padding: 12,
                      background:"rgba(15,23,42,0.95)",
                      border:"1px solid rgba(56,65,85,0.9)",
                    }}
                  >
                    <div style={{ fontSize: 11, marginBottom: 6, color: "#9ca3af" }}>
                      Elite Engine
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
                      borderRadius: 16,
                      padding: 12,
                      background:"rgba(15,23,42,0.95)",
                      border:"1px solid rgba(56,65,85,0.9)",
                    }}
                  >
                    <div style={{ fontSize: 11, marginBottom: 6, color: "#9ca3af" }}>
                      Risk Components
                    </div>

                    <div style={{ fontSize: 12, marginBottom: 6 }}>
                      Expiration: {primary?.expiration_date || "—"} (
                      {risk.exp.left ?? "?"} days)
                    </div>
                    <div style={{ fontSize: 12, marginBottom: 6 }}>
                      Elite: {risk.e.sev}
                    </div>
                    <div style={{ fontSize: 12, marginBottom: 6 }}>
                      Compliance: {risk.c.sev}
                    </div>
                    <div style={{ fontSize: 12 }}>
                      Rule Engine: {risk.r.sev} ({risk.r.score ?? "—"})
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
              "radial-gradient(circle at top right,rgba(15,23,42,0.96),rgba(15,23,42,1))",
            border: "1px solid rgba(148,163,184,0.55)",
            boxShadow: "0 22px 55px rgba(15,23,42,0.98)",
            marginBottom: 30,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
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
                Curated remediation steps for this vendor’s COI and requirements.
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
                  if (t.includes("urgent") || t.includes("immediately")) sev = "critical";
                  else if (
                    t.includes("renew") ||
                    t.includes("missing") ||
                    t.includes("update")
                  )
                    sev = "warning";

                  const borderColor =
                    sev === "critical"
                      ? "rgba(248,113,113,0.8)"
                      : sev === "warning"
                      ? "rgba(250,204,21,0.8)"
                      : "rgba(148,163,184,0.4)";

                  const label =
                    sev === "critical"
                      ? "CRITICAL"
                      : sev === "warning"
                      ? "WARNING"
                      : "RECOMMENDED";

                  const labelColor =
                    sev === "critical"
                      ? "#fca5a5"
                      : sev === "warning"
                      ? "#fde68a"
                      : "#e5e7eb";

                  return (
                    <div
                      key={idx}
                      style={{
                        borderRadius: 12,
                        border: `1px solid ${borderColor}`,
                        padding: 12,
                        background: "rgba(15,23,42,0.96)",
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
                  border: "1px solid rgba(51,65,85,0.9)",
                  background: "rgba(15,23,42,0.98)",
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
                    "radial-gradient(circle at top left,#111827,#020617,#000)",
                  color: "#e5e7eb",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
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
                marginBottom: 30,
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
                Minimum coverages extracted from the contract and matched to uploaded
                policies.
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
                  Rules Evaluated:
                  <strong> {engineSummary.totalRules}</strong> · Failing:
                  <strong> {engineSummary.failedCount}</strong>
                </div>

                <button
                  onClick={() => runEngine()}
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
                  Re-run Engine
                </button>
              </>
            )}
          </div>

          {/* FAILING RULES / TIMELINE */}
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
