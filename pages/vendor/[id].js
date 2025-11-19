// pages/vendor/[id].js
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import EliteComplianceBlock from "../../components/elite/EliteComplianceBlock";

/* -------------------- SHARED RISK HELPERS -------------------- */
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

/* -------------------- PHASE E: AI UNDERWRITING RISK SCORE -------------------- */
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
    if (compliance.error) complianceFactor = 0.7;
    else if (compliance.failing?.length > 0) complianceFactor = 0.5;
    else if (compliance.missing?.length > 0) complianceFactor = 0.7;
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

  if (loadingVendor) {
    return (
      <div style={{ padding: 40 }}>
        <h1>Loading vendor…</h1>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 40 }}>
        <h1>Error</h1>
        <p style={{ color: "red" }}>{error}</p>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div style={{ padding: 40 }}>
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
  return (
    <div style={{ padding: "30px 40px", maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 6 }}>
        {vendor.name}
      </h1>

      {org && (
        <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 20 }}>
          Organization: <strong>{org.name}</strong>
        </p>
      )}

      <div
        style={{
          background: "white",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 20,
          marginBottom: 30,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>Compliance Summary</h2>

        {loadingCompliance && <p>Checking compliance…</p>}

        {compliance?.error && (
          <p style={{ color: "red" }}>❌ {compliance.error}</p>
        )}

        {!loadingCompliance && compliance && !compliance.error && (
          <>
            <p style={{ marginTop: 8, fontWeight: 600 }}>
              {compliance.summary}
            </p>

            <div
              style={{
                marginTop: 14,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
            >
              <div>
                <h3
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 6,
                    color: "#111827",
                  }}
                >
                  Elite Rule Engine
                </h3>

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
                  padding: 12,
                  borderRadius: 10,
                  background: "#f9fafb",
                  border: "1px solid #e5e7eb",
                }}
              >
                <h3
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 6,
                    color: "#111827",
                  }}
                >
                  AI Underwriting Risk Score
                </h3>

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
                          ? "#16a34a"
                          : aiRisk.score >= 60
                          ? "#facc15"
                          : "#b91c1c",
                    }}
                  >
                    {aiRisk.score}
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#111827",
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
                        background: "#e5e7eb",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.min(aiRisk.score, 100)}%`,
                          height: "100%",
                          background:
                            aiRisk.score >= 80
                              ? "#16a34a"
                              : aiRisk.score >= 60
                              ? "#facc15"
                              : "#b91c1c",
                        }}
                      ></div>
                    </div>
                  </div>
                </div>

                {primaryPolicy && (
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 11,
                      color: "#4b5563",
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

            {/* ⭐ ADDED TREND BOX HERE ⭐ */}
            <div
              style={{
                marginTop: 20,
                padding: 16,
                background: "white",
                borderRadius: 12,
                border: "1px solid #e5e7eb",
              }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>
                Vendor Risk Trend
              </h3>
              <img
                src="/trend-placeholder.png"
                style={{
                  width: "100%",
                  height: 160,
                  opacity: 0.6,
                  borderRadius: 10,
                  marginTop: 10,
                }}
              />
            </div>

            {/* Existing compliance lists */}
            {compliance.missing?.length > 0 && (
              <>
                <h4 style={{ color: "#b91c1c", marginTop: 16 }}>
                  Missing Coverage
                </h4>
                <ul>
                  {compliance.missing.map((m, i) => (
                    <li key={i}>{m.coverage_type}</li>
                  ))}
                </ul>
              </>
            )}

            {compliance.failing?.length > 0 && (
              <>
                <h4 style={{ color: "#b45309" }}>Failing Requirements</h4>
                <ul>
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
                <h4 style={{ color: "#15803d" }}>Passing</h4>
                <ul>
                  {compliance.passing.map((p, i) => (
                    <li key={i}>{p.coverage_type}</li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </div>
      {/* ----------------- FIX PLAN PANEL ----------------- */}
      <div
        style={{
          background: "white",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 20,
          marginBottom: 30,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>AI Fix Plan</h2>
            <p style={{ fontSize: 13, color: "#6b7280" }}>
              Hybrid G+Legal vendor remediation steps.
            </p>
          </div>

          <button
            onClick={loadFixPlan}
            disabled={fixLoading}
            style={{
              padding: "8px 14px",
              borderRadius: 999,
              background: "#0f172a",
              color: "white",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            {fixLoading ? "Generating…" : "Generate Fix Plan"}
          </button> തുട
      </div>
      
      {/* ----------------- POLICIES ----------------- */}
      <div
        style={{
          background: "white",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 20,
          marginBottom: 30,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>Policies</h2>

        {policies.length === 0 && <p>No policies on file.</p>}

        {policies.map((p) => (
          <div
            key={p.id}
            style={{
              padding: 12,
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              marginTop: 10,
            }}
          >
            <p style={{ fontWeight: 600 }}>{p.coverage_type}</p>
            <p>Policy #: {p.policy_number || "—"}</p>
            <p>Carrier: {p.carrier || "—"}</p>
            <p>
              Effective: {p.effective_date || "—"} — Expires:{" "}
              {p.expiration_date || "—"}
            </p>
            <p>
              Limits: {p.limit_each_occurrence || "—"} /{" "}
              {p.limit_aggregate || "—"}
            </p>
          </div>
        ))}
      </div>

      <a href="/dashboard" style={{ fontSize: 14, color: "#2563eb" }}>
        ← Back to Dashboard
      </a>
    </div>
  );
}
