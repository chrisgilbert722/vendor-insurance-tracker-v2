// components/onboarding/FixPlansStep.js
// STEP 7 — AI Fix Plans Generation for Onboarding

import { useState } from "react";

export default function FixPlansStep({ orgId, wizardState, setWizardState }) {
  const vendors = wizardState?.vendorsAnalyzed?.transformed || [];
  const vendorAi = wizardState?.vendorsAnalyzed?.ai || null;
  const requirements = wizardState?.contracts?.requirements || [];
  const rules = wizardState?.rules?.groups || [];
  const rulesApplied = wizardState?.rulesApplied;

  const [loading, setLoading] = useState(false);
  const [fixData, setFixData] = useState(wizardState?.fixPlans || null);
  const [error, setError] = useState("");

  const canGenerate =
    vendors.length > 0 &&
    vendorAi &&
    requirements.length > 0 &&
    rulesApplied;

  async function runFixPlanGeneration() {
    if (!canGenerate) {
      setError(
        "Complete Steps 2–6 (vendor analysis, contracts, rules) before generating fix plans."
      );
      return;
    }

    setLoading(true);
    setFixData(null);
    setError("");

    try {
      const res = await fetch("/api/onboarding/ai-generate-fix-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          vendors,
          vendorAi,
          requirements,
          rules,
        }),
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error);

      setFixData(json);

      setWizardState((prev) => ({
        ...prev,
        fixPlans: json,
      }));
    } catch (err) {
      console.error("Fix Plan Generation Error:", err);
      setError(err.message || "Fix plan AI failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        padding: 18,
        borderRadius: 18,
        background: "rgba(15,23,42,0.96)",
        border: "1px solid rgba(51,65,85,0.9)",
      }}
    >
      <h2
        style={{
          marginTop: 0,
          fontSize: 18,
          fontWeight: 600,
          color: "#e5e7eb",
        }}
      >
        Step 7 — AI Fix Plans for Onboarding
      </h2>

      <p style={{ fontSize: 13, color: "#9ca3af" }}>
        AI will review the vendor data, contract rules, and required coverages,
        then draft detailed fix plans and email templates for onboarding outreach.
      </p>

      {!canGenerate && (
        <div
          style={{
            marginTop: 12,
            padding: "10px 14px",
            borderRadius: 10,
            background: "rgba(30,64,175,0.9)",
            border: "1px solid rgba(59,130,246,0.8)",
            color: "#bfdbfe",
            fontSize: 13,
          }}
        >
          To enable fix plans, complete:
          <ul style={{ marginTop: 6, marginLeft: 16 }}>
            <li>Vendor CSV → mapping → analysis</li>
            <li>Contract upload + requirement extraction</li>
            <li>AI rule generation + apply rules to engine</li>
          </ul>
        </div>
      )}

      {error && (
        <div
          style={{
            marginTop: 12,
            padding: "10px 14px",
            borderRadius: 10,
            background: "rgba(127,29,29,0.9)",
            border: "1px solid rgba(248,113,113,0.8)",
            color: "#fecaca",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={runFixPlanGeneration}
        disabled={loading || !canGenerate}
        style={{
          marginTop: 16,
          padding: "10px 20px",
          borderRadius: 999,
          border: "1px solid rgba(88,28,135,0.9)",
          background:
            "radial-gradient(circle at top left,#a855f7,#7c3aed,#4c1d95)",
          color: "#f3e8ff",
          fontWeight: 600,
          cursor: loading || !canGenerate ? "not-allowed" : "pointer",
          fontSize: 13,
          opacity: loading || !canGenerate ? 0.6 : 1,
        }}
      >
        {loading ? "Generating Fix Plans…" : "✨ Generate AI Fix Plans"}
      </button>

      {loading && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            borderRadius: 12,
            background: "rgba(2,6,23,0.6)",
            border: "1px solid rgba(71,85,105,0.9)",
            color: "#9ca3af",
            fontSize: 13,
          }}
        >
          AI is drafting fix plans, identifying missing coverages, and preparing
          onboarding emails…
        </div>
      )}

      {/* FIX PLAN OUTPUT */}
      {fixData && (
        <div style={{ marginTop: 26 }}>
          <h3
            style={{ fontSize: 15, marginBottom: 10, color: "#e5e7eb" }}
          >
            🧠 AI Fix Plan Overview
          </h3>

          {fixData.vendors?.map((v, idx) => (
            <div
              key={idx}
              style={{
                marginBottom: 16,
                padding: 14,
                borderRadius: 14,
                background: "rgba(2,6,23,0.65)",
                border: "1px solid rgba(71,85,105,0.9)",
              }}
            >
              <h4
                style={{
                  margin: 0,
                  marginBottom: 6,
                  fontSize: 14,
                  color: "#e5e7eb",
                }}
              >
                {v.name}
              </h4>

              <div style={{ fontSize: 12, color: "#9ca3af" }}>
                <strong style={{ color: "#38bdf8" }}>Issues:</strong>
                <ul style={{ marginTop: 6, marginLeft: 18 }}>
                  {v.issues?.map((iss, ii) => (
                    <li key={ii}>{iss}</li>
                  ))}
                </ul>

                <strong style={{ color: "#38bdf8" }}>Fix Steps:</strong>
                <ul style={{ marginTop: 6, marginLeft: 18 }}>
                  {v.fixSteps?.map((step, si) => (
                    <li key={si}>{step}</li>
                  ))}
                </ul>

                <strong style={{ color: "#38bdf8" }}>Vendor Email Draft:</strong>
                <pre
                  style={{
                    marginTop: 6,
                    whiteSpace: "pre-wrap",
                    background: "rgba(15,23,42,0.6)",
                    padding: 10,
                    borderRadius: 8,
                    fontSize: 12,
                    color: "#cbd5f5",
                  }}
                >
{v.email}
                </pre>

                {v.internalNotes && (
                  <>
                    <strong style={{ color: "#38bdf8" }}>
                      Internal Notes:
                    </strong>
                    <pre
                      style={{
                        marginTop: 6,
                        whiteSpace: "pre-wrap",
                        background: "rgba(15,23,42,0.6)",
                        padding: 10,
                        borderRadius: 8,
                        fontSize: 12,
                        color: "#cbd5f5",
                      }}
                    >
{v.internalNotes}
                    </pre>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
