console.log("🔥🔥🔥 ONBOARDING PAGE LOADED!!!! 🔥🔥🔥");
// pages/onboarding/index.js
// AI Onboarding Wizard — fullscreen cinematic wizard (hybrid layout).
// Steps:
// 1) Upload CSV
// 2) AI Preview & Confirm
// 3) Apply Plan & Finish

import { useState } from "react";
import { useRouter } from "next/router";
import { useOrg } from "../../context/OrgContext";

const pageBg = {
  minHeight: "100vh",
  width: "100vw",
  background:
    "radial-gradient(circle at 20% 0%, rgba(56,189,248,0.12), transparent 40%), radial-gradient(circle at 80% 0%, rgba(168,85,247,0.10), transparent 35%), radial-gradient(circle at 50% 90%, rgba(34,197,94,0.08), transparent 50%), linear-gradient(180deg, #020617 0%, #000000 100%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "40px 20px",
  color: "#e5e7eb",
  fontFamily:
    'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif',
};

const shell = {
  width: "100%",
  maxWidth: "1100px",
  borderRadius: "24px",
  border: "1px solid rgba(148,163,184,0.4)",
  background:
    "linear-gradient(145deg, rgba(15,23,42,0.9), rgba(15,23,42,0.95))",
  boxShadow:
    "0 25px 60px rgba(15,23,42,0.9), 0 0 0 1px rgba(15,23,42,0.7), 0 0 50px rgba(59,130,246,0.3)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const header = {
  padding: "18px 26px",
  borderBottom: "1px solid rgba(30,64,175,0.7)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  background:
    "linear-gradient(90deg, rgba(15,23,42,0.95), rgba(30,64,175,0.5))",
};

const title = {
  fontSize: "18px",
  fontWeight: 600,
};

const subtitle = {
  fontSize: "12px",
  color: "rgba(148,163,184,0.9)",
};

const stepBar = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
};

const stepPill = (active, done) => ({
  padding: "4px 10px",
  borderRadius: "999px",
  fontSize: "11px",
  display: "flex",
  alignItems: "center",
  gap: "6px",
  border: active
    ? "1px solid rgba(59,130,246,0.9)"
    : "1px solid rgba(55,65,81,0.8)",
  background: active
    ? "rgba(30,64,175,0.6)"
    : done
    ? "rgba(22,163,74,0.18)"
    : "rgba(15,23,42,0.8)",
  color: active ? "#bfdbfe" : done ? "#bbf7d0" : "#9ca3af",
});

const dot = (color) => ({
  width: "8px",
  height: "8px",
  borderRadius: "999px",
  background: color,
  boxShadow: `0 0 6px ${color}`,
});

const body = {
  display: "flex",
  padding: "22px 26px 24px",
  gap: "18px",
};

const leftCol = {
  flex: 1.2,
  display: "flex",
  flexDirection: "column",
  gap: "16px",
};

const rightCol = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: "14px",
};

const panel = {
  borderRadius: "18px",
  padding: "16px 18px",
  background:
    "radial-gradient(circle at top left, rgba(56,189,248,0.18), transparent 60%), rgba(15,23,42,0.9)",
  border: "1px solid rgba(30,64,175,0.75)",
  boxShadow: "0 0 25px rgba(15,23,42,0.8)",
};

const panelHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "10px",
};

const panelTitle = {
  fontSize: "14px",
  fontWeight: 600,
};

const pillTiny = {
  fontSize: "10px",
  borderRadius: "999px",
  padding: "3px 8px",
  background: "rgba(15,23,42,0.9)",
  border: "1px solid rgba(148,163,184,0.4)",
  color: "#9ca3af",
};

const footer = {
  padding: "14px 26px 16px",
  borderTop: "1px solid rgba(31,41,55,0.9)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  background: "rgba(15,23,42,0.98)",
};

const btnPrimary = {
  border: "none",
  borderRadius: "999px",
  padding: "8px 16px",
  fontSize: "12px",
  fontWeight: 600,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  background: "linear-gradient(135deg, #22c55e, #16a34a)",
  color: "#020617",
  boxShadow: "0 0 20px rgba(34,197,94,0.4)",
};

const btnGhost = {
  borderRadius: "999px",
  padding: "6px 12px",
  fontSize: "11px",
  border: "1px solid rgba(148,163,184,0.6)",
  background: "transparent",
  color: "#9ca3af",
  cursor: "pointer",
};

export default function OnboardingWizard() {
  const router = useRouter();
  const { orgId } = useOrg() || {};

  const [step, setStep] = useState("upload"); // 'upload' | 'preview' | 'done'
  const [fileName, setFileName] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [applySummary, setApplySummary] = useState(null);
  const [error, setError] = useState(null);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setFileName(file.name);

    const text = await file.text();
    setAnalyzing(true);
    try {
      const res = await fetch("/api/onboarding/analyze-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: orgId || null,
          csvText: text,
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error || "AI analysis failed");
        setAiResult(null);
      } else {
        setAiResult(json);
        setStep("preview");
      }
    } catch (err) {
      setError(err.message || "Network error during analysis");
      setAiResult(null);
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleApplyPlan() {
    if (!aiResult?.payload) return;
    setApplying(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding/apply-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: orgId || null,
          payload: aiResult.payload,
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error || "Failed to apply onboarding plan");
      } else {
        setApplySummary(json.summary || null);
        setStep("done");
      }
    } catch (err) {
      setError(err.message || "Network error applying plan");
    } finally {
      setApplying(false);
    }
  }

  function handleGoDashboard() {
    router.push("/dashboard");
  }

  const payload = aiResult?.payload || {};
  const vendors = payload.vendors || [];
  const requirements = payload.requirements || [];
  const missing = payload.missingDocuments || [];
  const warnings = payload.confidenceWarnings || [];

  const stepIndex = step === "upload" ? 1 : step === "preview" ? 2 : 3;

  return (
    <div style={pageBg}>
      <div style={shell}>
        {/* HEADER */}
        <div style={header}>
          <div>
            <div style={title}>AI Onboarding Wizard</div>
            <div style={subtitle}>
              10-minute setup — upload, review, and launch full automation.
            </div>
          </div>

          <div style={stepBar}>
            <div style={stepPill(stepIndex === 1, stepIndex > 1)}>
              <span style={dot(stepIndex > 1 ? "#22c55e" : "#60a5fa")} />
              <span>1 · Upload CSV</span>
            </div>
            <div style={stepPill(stepIndex === 2, stepIndex > 2)}>
              <span style={dot(stepIndex > 2 ? "#22c55e" : "#60a5fa")} />
              <span>2 · AI Preview</span>
            </div>
            <div style={stepPill(stepIndex === 3, false)}>
              <span style={dot(stepIndex === 3 ? "#22c55e" : "#6b7280")} />
              <span>3 · Apply & Launch</span>
            </div>
          </div>
        </div>

        {/* BODY */}
        <div style={body}>
          {/* LEFT SIDE */}
          <div style={leftCol}>
            {step === "upload" && (
              <div style={panel}>
                <div style={panelHeader}>
                  <div style={panelTitle}>Step 1 — Upload Vendor CSV</div>
                  <div style={pillTiny}>Any CSV structure</div>
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#9ca3af",
                    marginBottom: "14px",
                  }}
                >
                  Drop your vendor list (.csv). Our AI will detect vendor names,
                  emails, policies, expirations, and missing documents — even in
                  messy, unstructured exports.
                </div>

                <label
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "10px 16px",
                    borderRadius: "999px",
                    border: "1px dashed rgba(148,163,184,0.8)",
                    background: "rgba(15,23,42,0.9)",
                    cursor: "pointer",
                    fontSize: "12px",
                    gap: "8px",
                  }}
                >
                  <span>📂 Choose CSV file</span>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    style={{ display: "none" }}
                    onChange={handleFileChange}
                  />
                </label>

                {fileName && (
                  <div
                    style={{
                      marginTop: "10px",
                      fontSize: "11px",
                      color: "#9ca3af",
                    }}
                  >
                    Selected: <span style={{ color: "#e5e7eb" }}>{fileName}</span>
                  </div>
                )}

                {analyzing && (
                  <div
                    style={{
                      marginTop: "14px",
                      fontSize: "11px",
                      color: "#60a5fa",
                    }}
                  >
                    Analyzing file with AI…
                  </div>
                )}

                {error && (
                  <div
                    style={{
                      marginTop: "12px",
                      fontSize: "11px",
                      color: "#fca5a5",
                    }}
                  >
                    {error}
                  </div>
                )}
              </div>
            )}

            {step === "preview" && (
              <div style={panel}>
                <div style={panelHeader}>
                  <div style={panelTitle}>Step 2 — AI Preview</div>
                  <div style={pillTiny}>
                    {vendors.length} vendors · {requirements.length} requirements
                  </div>
                </div>

                <div
                  style={{
                    fontSize: "12px",
                    color: "#9ca3af",
                    marginBottom: "10px",
                  }}
                >
                  Review how the AI interpreted your vendor file before we apply
                  everything to your account.
                </div>

                <div
                  style={{
                    maxHeight: "230px",
                    overflow: "auto",
                    borderRadius: "12px",
                    border: "1px solid rgba(31,41,55,0.9)",
                    background: "rgba(15,23,42,0.9)",
                  }}
                >
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: "11px",
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          background: "rgba(15,23,42,0.95)",
                          borderBottom: "1px solid rgba(31,41,55,1)",
                        }}
                      >
                        <th
                          style={{
                            textAlign: "left",
                            padding: "8px 10px",
                            color: "#9ca3af",
                            fontWeight: 500,
                          }}
                        >
                          Vendor
                        </th>
                        <th
                          style={{
                            textAlign: "left",
                            padding: "8px 10px",
                            color: "#9ca3af",
                            fontWeight: 500,
                          }}
                        >
                          Email
                        </th>
                        <th
                          style={{
                            textAlign: "left",
                            padding: "8px 10px",
                            color: "#9ca3af",
                            fontWeight: 500,
                          }}
                        >
                          Policies
                        </th>
                        <th
                          style={{
                            textAlign: "left",
                            padding: "8px 10px",
                            color: "#9ca3af",
                            fontWeight: 500,
                          }}
                        >
                          Risk
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendors.slice(0, 25).map((v, idx) => (
                        <tr
                          key={idx}
                          style={{
                            borderBottom: "1px solid rgba(31,41,55,0.9)",
                          }}
                        >
                          <td style={{ padding: "7px 10px" }}>{v.name}</td>
                          <td
                            style={{
                              padding: "7px 10px",
                              color: "#9ca3af",
                            }}
                          >
                            {v.email || "—"}
                          </td>
                          <td
                            style={{
                              padding: "7px 10px",
                              color: "#9ca3af",
                            }}
                          >
                            {(v.policies || [])
                              .map((p) => p.coverageCode || p.policyType)
                              .join(", ") || "—"}
                          </td>
                          <td
                            style={{
                              padding: "7px 10px",
                              color:
                                v.riskTier === "high"
                                  ? "#f97373"
                                  : v.riskTier === "medium"
                                  ? "#facc15"
                                  : "#4ade80",
                            }}
                          >
                            {v.riskTier || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {vendors.length > 25 && (
                  <div
                    style={{
                      marginTop: "6px",
                      fontSize: "11px",
                      color: "#9ca3af",
                    }}
                  >
                    Showing first 25 of {vendors.length} vendors.
                  </div>
                )}

                {error && (
                  <div
                    style={{
                      marginTop: "10px",
                      fontSize: "11px",
                      color: "#fca5a5",
                    }}
                  >
                    {error}
                  </div>
                )}
              </div>
            )}

            {step === "done" && (
              <div style={panel}>
                <div style={panelHeader}>
                  <div style={panelTitle}>Step 3 — Onboarding Complete</div>
                  <div style={pillTiny}>Automation is live</div>
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#9ca3af",
                    marginBottom: "10px",
                  }}
                >
                  Your vendors, policies, renewal schedules, and requirements have
                  been created. Renewal automation and alerts are now running.
                </div>
                <div
                  style={{
                    borderRadius: "12px",
                    border: "1px solid rgba(22,163,74,0.6)",
                    background: "rgba(22,163,74,0.12)",
                    padding: "10px 12px",
                    fontSize: "12px",
                  }}
                >
                  <div style={{ marginBottom: "4px" }}>
                    Vendors created:{" "}
                    <strong>{applySummary?.vendorCount ?? 0}</strong>
                  </div>
                  <div style={{ marginBottom: "4px" }}>
                    Policies created:{" "}
                    <strong>{applySummary?.policyCount ?? 0}</strong>
                  </div>
                  <div style={{ marginBottom: "4px" }}>
                    Renewal schedules:{" "}
                    <strong>{applySummary?.scheduleCount ?? 0}</strong>
                  </div>
                  <div style={{ marginBottom: "4px" }}>
                    Requirements added:{" "}
                    <strong>{applySummary?.requirementCount ?? 0}</strong>
                  </div>
                  <div>
                    Missing-doc alerts:{" "}
                    <strong>{applySummary?.missingDocCount ?? 0}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT SIDE */}
          <div style={rightCol}>
            {step === "preview" && (
              <div style={panel}>
                <div style={panelHeader}>
                  <div style={panelTitle}>AI-Inferred Requirements</div>
                  <div style={pillTiny}>{requirements.length} requirements</div>
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "#9ca3af",
                    marginBottom: "6px",
                  }}
                >
                  These are rules the AI believes should exist, based on your
                  data. They will be saved as “AI Suggested” rules.
                </div>
                <div
                  style={{
                    maxHeight: "140px",
                    overflow: "auto",
                    borderRadius: "10px",
                    border: "1px solid rgba(31,41,55,0.9)",
                    background: "rgba(15,23,42,0.95)",
                    padding: "8px 10px",
                    fontSize: "11px",
                  }}
                >
                  {requirements.length === 0 && (
                    <div style={{ color: "#6b7280" }}>
                      No explicit requirements inferred. You can define rules in
                      the Rule Engine later.
                    </div>
                  )}
                  {requirements.slice(0, 10).map((r, idx) => (
                    <div
                      key={idx}
                      style={{
                        marginBottom: "6px",
                        paddingBottom: "6px",
                        borderBottom:
                          idx === requirements.length - 1
                            ? "none"
                            : "1px solid rgba(31,41,55,0.8)",
                      }}
                    >
                      <div style={{ fontWeight: 500 }}>
                        {r.label || r.coverageCode}
                      </div>
                      <div style={{ color: "#9ca3af" }}>
                        Min limits: {r.minLimits || "—"}
                      </div>
                      <div style={{ color: "#9ca3af" }}>
                        Required for: {r.requiredFor || "all_vendors"}
                      </div>
                      {r.notes && (
                        <div style={{ color: "#6b7280" }}>{r.notes}</div>
                      )}
                    </div>
                  ))}
                  {requirements.length > 10 && (
                    <div style={{ marginTop: "4px", color: "#6b7280" }}>
                      Showing first 10 of {requirements.length}.
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === "preview" && (
              <div style={panel}>
                <div style={panelHeader}>
                  <div style={panelTitle}>Missing Docs & Warnings</div>
                  <div style={pillTiny}>
                    {missing.length} missing docs · {warnings.length} warnings
                  </div>
                </div>

                <div
                  style={{
                    fontSize: "11px",
                    color: "#9ca3af",
                    marginBottom: "6px",
                  }}
                >
                  These vendors will be targeted first in renewal outreach and
                  Fix Mode.
                </div>

                <div
                  style={{
                    maxHeight: "110px",
                    overflow: "auto",
                    borderRadius: "10px",
                    border: "1px solid rgba(127,29,29,0.8)",
                    background:
                      "radial-gradient(circle at top, rgba(248,113,113,0.18), transparent 60%), rgba(15,23,42,0.96)",
                    padding: "8px 10px",
                    fontSize: "11px",
                  }}
                >
                  {missing.length === 0 && (
                    <div style={{ color: "#22c55e" }}>
                      No missing documents detected from the sample.
                    </div>
                  )}
                  {missing.slice(0, 8).map((m, idx) => (
                    <div
                      key={idx}
                      style={{
                        marginBottom: "6px",
                        paddingBottom: "6px",
                        borderBottom:
                          idx === missing.length - 1
                            ? "none"
                            : "1px solid rgba(55,65,81,0.9)",
                      }}
                    >
                      <div style={{ fontWeight: 500, color: "#fecaca" }}>
                        {m.vendorName} — {m.coverageCode}
                      </div>
                      <div style={{ color: "#fca5a5" }}>{m.reason}</div>
                    </div>
                  ))}
                  {missing.length > 8 && (
                    <div style={{ marginTop: "4px", color: "#fca5a5" }}>
                      Showing first 8 of {missing.length}.
                    </div>
                  )}
                </div>

                {warnings.length > 0 && (
                  <div
                    style={{
                      marginTop: "8px",
                      borderRadius: "8px",
                      border: "1px solid rgba(234,179,8,0.6)",
                      background: "rgba(24,24,27,0.9)",
                      padding: "6px 8px",
                      fontSize: "11px",
                      color: "#facc15",
                    }}
                  >
                    {warnings.slice(0, 3).map((w, idx) => (
                      <div key={idx} style={{ marginBottom: "4px" }}>
                        ⚠ {w}
                      </div>
                    ))}
                    {warnings.length > 3 && (
                      <div style={{ color: "#eab308" }}>
                        + {warnings.length - 3} more warning(s)
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div style={footer}>
          <div style={{ fontSize: "11px", color: "#6b7280" }}>
            {step === "upload" && "Step 1 · Upload your vendor CSV."}
            {step === "preview" &&
              "Step 2 · Confirm AI interpretation before we apply changes."}
            {step === "done" &&
              "Onboarding complete. You can now work from the main dashboard."}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {step === "preview" && (
              <button
                style={btnGhost}
                onClick={() => {
                  setStep("upload");
                  setAiResult(null);
                  setError(null);
                  setFileName(null);
                }}
              >
                Back to upload
              </button>
            )}

            {step === "preview" && (
              <button
                style={btnPrimary}
                onClick={handleApplyPlan}
                disabled={applying}
              >
                {applying ? "Applying plan…" : "Apply plan & launch automation"}
              </button>
            )}

            {step === "done" && (
              <button style={btnPrimary} onClick={handleGoDashboard}>
                Go to dashboard
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
