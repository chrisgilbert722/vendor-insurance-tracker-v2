// components/onboarding/RulesGenerateStep.js
// STEP 6 — AI Rule Generation + APPLY TO RULE ENGINE V5

import { useState } from "react";

export default function RulesGenerateStep({
  orgId,
  wizardState,
  setWizardState,
}) {
  const vendorsAnalyzed = wizardState?.vendorsAnalyzed;
  const contracts = wizardState?.contracts;
  const requirements = contracts?.requirements || [];

  const [aiLoading, setAiLoading] = useState(false);
  const [aiRules, setAiRules] = useState(wizardState?.rules || null);
  const [error, setError] = useState("");

  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState("");
  const [applySuccess, setApplySuccess] = useState("");

  const canGenerate =
    vendorsAnalyzed?.transformed?.length > 0 || requirements.length > 0;

  // ---------------------------------------------------------
  // RUN AI RULE GENERATION
  // ---------------------------------------------------------
  async function runAiRuleGenerator() {
    if (!canGenerate) {
      setError(
        "We need vendor analysis and/or contract requirements before generating rules."
      );
      return;
    }

    setError("");
    setAiLoading(true);
    setApplyError("");
    setApplySuccess("");

    try {
      const res = await fetch("/api/onboarding/ai-generate-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          vendors: vendorsAnalyzed?.transformed || [],
          vendorAi: vendorsAnalyzed?.ai || null,
          requirements,
        }),
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "AI rule generation failed");

      setAiRules(json);

      setWizardState((prev) => ({
        ...prev,
        rules: json,
      }));
    } catch (err) {
      console.error("AI Rule Generation Error:", err);
      setError(err.message || "Rule generation failed.");
    } finally {
      setAiLoading(false);
    }
  }

  // ---------------------------------------------------------
  // APPLY GENERATED RULES INTO RULE ENGINE V5
  // ---------------------------------------------------------
  async function applyRulesToEngine() {
    if (!aiRules?.groups || aiRules.groups.length === 0) {
      setApplyError("Generate rules first.");
      return;
    }

    setApplying(true);
    setApplyError("");
    setApplySuccess("");

    try {
      const res = await fetch("/api/onboarding/apply-rules-v5", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          groups: aiRules.groups,
        }),
      });

      const json = await res.json();
      if (!json.ok)
        throw new Error(json.error || "Failed to apply rules to engine.");

      setApplySuccess(
        json.message ||
          `Rule Engine V5 updated (${json.count || 0} rules installed).`
      );

      setWizardState((prev) => ({
        ...prev,
        rulesApplied: true,
      }));
    } catch (err) {
      console.error("Apply Rules Error:", err);
      setApplyError(err.message || "Could not apply rules.");
    } finally {
      setApplying(false);
    }
  }

  // ---------------------------------------------------------
  // UI
  // ---------------------------------------------------------
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
        Step 6 — AI Rule Generation
      </h2>

      <p style={{ fontSize: 13, color: "#9ca3af" }}>
        AI will combine your vendor analysis and contract requirements to
        generate enforceable compliance rules for Rule Engine V5.
      </p>

      {/* Missing prerequisites */}
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
          Before generating rules:
          <ul style={{ margin: "6px 0 0 16px" }}>
            <li>Vendor CSV upload + mapping + analysis</li>
            <li>Contract upload + AI requirement extraction</li>
          </ul>
        </div>
      )}

      {/* Errors */}
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

      {/* Generate Rules Button */}
      <button
        type="button"
        onClick={runAiRuleGenerator}
        disabled={aiLoading || !canGenerate}
        style={{
          marginTop: 16,
          padding: "10px 18px",
          borderRadius: 999,
          border: "1px solid rgba(34,197,94,0.9)",
          background:
            "radial-gradient(circle at top left,#22c55e,#16a34a,#052e16)",
          color: "#ecfdf5",
          fontSize: 13,
          fontWeight: 600,
          cursor: aiLoading || !canGenerate ? "not-allowed" : "pointer",
          opacity: aiLoading || !canGenerate ? 0.65 : 1,
        }}
      >
        {aiLoading ? "Generating rules…" : "✨ Generate AI Rule Sets"}
      </button>

      {/* Loading */}
      {aiLoading && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            borderRadius: 12,
            background: "rgba(2,6,23,0.65)",
            border: "1px solid rgba(71,85,105,0.9)",
            color: "#9ca3af",
            fontSize: 13,
          }}
        >
          AI is building rule groups, conditions, and severities…
        </div>
      )}

      {/* AI Results */}
      {aiRules && (
        <div style={{ marginTop: 24 }}>
          <h3
            style={{
              fontSize: 15,
              marginBottom: 10,
              color: "#e5e7eb",
            }}
          >
            📘 Generated Rule Groups
          </h3>

          {aiRules.groups?.length === 0 && (
            <p style={{ fontSize: 12, color: "#9ca3af" }}>
              No rules generated. Try adjusting input or re-running analysis.
            </p>
          )}

          {aiRules.groups?.map((group, idx) => (
            <div
              key={idx}
              style={{
                marginBottom: 14,
                padding: 12,
                borderRadius: 14,
                background: "rgba(2,6,23,0.6)",
                border: "1px solid rgba(71,85,105,0.9)",
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#e5e7eb",
                  marginBottom: 4,
                }}
              >
                {group.label}
              </div>

              {group.description && (
                <div
                  style={{
                    fontSize: 12,
                    color: "#9ca3af",
                    marginBottom: 6,
                  }}
                >
                  {group.description}
                </div>
              )}

              {group.rules?.map((rule, rIdx) => (
                <div
                  key={rIdx}
                  style={{
                    marginTop: 6,
                    padding: 8,
                    borderRadius: 10,
                    background: "rgba(15,23,42,0.95)",
                    border: "1px solid rgba(51,65,85,0.9)",
                    fontSize: 12,
                    color: "#e5e7eb",
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{rule.title}</div>
                  <div style={{ color: "#9ca3af", marginTop: 2 }}>
                    {rule.message}
                  </div>

                  <div
                    style={{
                      fontSize: 11,
                      color: "#64748b",
                      marginTop: 4,
                    }}
                  >
                    Field: {rule.field} · Condition: {rule.condition} · Value:{" "}
                    {String(rule.value)} · Severity:{" "}
                    {rule.severity?.toUpperCase?.() || rule.severity}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* APPLY TO RULE ENGINE V5 */}
      {aiRules && aiRules.groups?.length > 0 && (
        <>
          {applyError && (
            <div
              style={{
                marginTop: 20,
                padding: "10px 14px",
                borderRadius: 10,
                background: "rgba(127,29,29,0.9)",
                border: "1px solid rgba(248,113,113,0.8)",
                color: "#fecaca",
                fontSize: 13,
              }}
            >
              {applyError}
            </div>
          )}

          {applySuccess && (
            <div
              style={{
                marginTop: 20,
                padding: "10px 14px",
                borderRadius: 10,
                background: "rgba(22,163,74,0.3)",
                border: "1px solid rgba(34,197,94,0.9)",
                color: "#bbf7d0",
                fontSize: 13,
              }}
            >
              {applySuccess}
            </div>
          )}

          <button
            type="button"
            onClick={applyRulesToEngine}
            disabled={applying}
            style={{
              marginTop: 12,
              padding: "10px 20px",
              borderRadius: 999,
              border: "1px solid rgba(34,197,94,0.9)",
              background:
                "radial-gradient(circle at top left,#22c55e,#16a34a,#052e16)",
              color: "#ecfdf5",
              fontSize: 13,
              fontWeight: 600,
              cursor: applying ? "not-allowed" : "pointer",
              opacity: applying ? 0.65 : 1,
            }}
          >
            {applying ? "Applying rules…" : "✔ Apply Rules to Engine V5"}
          </button>
        </>
      )}
    </div>
  );
}
