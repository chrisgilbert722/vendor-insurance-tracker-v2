// pages/admin/coverage-intel.js
// ==========================================================
// PHASE 6 — COVERAGE INTEL (AI Insurance Brain)
// ==========================================================

import { useState } from "react";
import ToastV2 from "../../components/ToastV2";

// ==========================================================
// CONSTANTS
// ==========================================================
const SAMPLE_PLACEHOLDER = `Paste insurance requirements or carrier policy text...

Example:
"Vendor must maintain GL 1M/2M, Auto 1M CSL,
Workers Comp statutory, Employers Liability 1M,
Additional Insured + Waiver of Subrogation required."`;

// ==========================================================
// MAIN COMPONENT
// ==========================================================
export default function CoverageIntelPage() {
  const [toast, setToast] = useState({
    open: false,
    message: "",
    type: "success",
  });

  const [sourceText, setSourceText] = useState("");
  const [coverageSummary, setCoverageSummary] = useState(null);
  const [rulePreview, setRulePreview] = useState(null);

  const [intelLoading, setIntelLoading] = useState(false);
  const [rulePreviewLoading, setRulePreviewLoading] = useState(false);

  // ==========================================================
  // HANDLER: AI Coverage Analysis
  // ==========================================================
  async function handleAnalyzeCoverage() {
    if (!sourceText.trim()) {
      return setToast({
        open: true,
        type: "error",
        message: "Paste some coverage text first.",
      });
    }

    try {
      setIntelLoading(true);
      setCoverageSummary(null);
      setRulePreview(null);

      const res = await fetch("/api/coverage/intel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: sourceText }),
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Coverage analysis failed.");

      setCoverageSummary(json.summary);
      setToast({
        open: true,
        type: "success",
        message: "Coverage analyzed successfully!",
      });
    } catch (err) {
      setToast({
        open: true,
        type: "error",
        message: err.message || "Failed to analyze coverage.",
      });
    } finally {
      setIntelLoading(false);
    }
  }

  // ==========================================================
  // HANDLER: Generate V5 Rule Preview
  // ==========================================================
  async function handleGenerateRulePreview() {
    if (!coverageSummary) {
      return setToast({
        open: true,
        type: "error",
        message: "Run Analyze Coverage first.",
      });
    }

    try {
      setRulePreviewLoading(true);
      setRulePreview(null);

      const res = await fetch("/api/coverage/intel/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary: coverageSummary }),
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Rule preview generation failed.");

      setRulePreview(json.rulePlan);
      setToast({
        open: true,
        type: "success",
        message: "Rule preview generated!",
      });
    } catch (err) {
      setToast({
        open: true,
        type: "error",
        message: err.message || "Failed to generate rule preview.",
      });
    } finally {
      setRulePreviewLoading(false);
    }
  }
  // ==========================================================
  // RENDER — FULL PAGE LAYOUT
  // ==========================================================
  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "32px 40px",
        background: "radial-gradient(circle at top,#020617,#000)",
        color: "#e5e7eb",
      }}
    >
      {/* HEADER */}
      <h1
        style={{
          margin: 0,
          fontSize: 28,
          fontWeight: 600,
          background: "linear-gradient(90deg,#38bdf8,#a5b4fc,#e5e7eb)",
          WebkitBackgroundClip: "text",
          color: "transparent",
        }}
      >
        Coverage Intelligence (AI)
      </h1>

      <p style={{ marginTop: 6, fontSize: 14, color: "#94a3b8" }}>
        Paste carrier requirements → extract coverages → generate rule plan for V5.
      </p>

      {/* MAIN 3-COLUMN GRID */}
      <div
        style={{
          marginTop: 20,
          display: "grid",
          gridTemplateColumns: "1.2fr 1.8fr 1.4fr",
          gap: 20,
        }}
      >
        {/* LEFT PANEL — SOURCE TEXT */}
        <div
          style={{
            borderRadius: 20,
            padding: 18,
            background: "rgba(15,23,42,0.75)",
            border: "1px solid rgba(80,120,255,0.35)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ fontSize: 14, marginBottom: 10 }}>Coverage Text</div>

          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder={SAMPLE_PLACEHOLDER}
            rows={16}
            style={{
              width: "100%",
              borderRadius: 12,
              padding: 12,
              background: "#0f172a",
              color: "#e5e7eb",
              border: "1px solid #334155",
              fontSize: 13,
            }}
          />

          <button
            onClick={handleAnalyzeCoverage}
            disabled={intelLoading}
            style={{
              marginTop: 12,
              width: "100%",
              padding: "10px",
              borderRadius: 12,
              background: intelLoading
                ? "rgba(56,189,248,0.35)"
                : "linear-gradient(90deg,#38bdf8,#0ea5e9)",
              border: "1px solid #38bdf8",
              color: "white",
              fontWeight: 600,
              cursor: intelLoading ? "not-allowed" : "pointer",
            }}
          >
            {intelLoading ? "Analyzing…" : "Analyze Coverage (AI)"}
          </button>
        </div>

        {/* MIDDLE PANEL — COVERAGE SUMMARY */}
        <div
          style={{
            borderRadius: 20,
            padding: 18,
            background: "rgba(15,23,42,0.75)",
            border: "1px solid rgba(80,120,255,0.35)",
            overflowY: "auto",
          }}
        >
          <div style={{ fontSize: 14, marginBottom: 10 }}>
            AI Coverage Summary
          </div>

          {!coverageSummary ? (
            <div style={{ color: "#667085", fontSize: 13 }}>
              Run “Analyze Coverage” to populate this summary.
            </div>
          ) : (
            <pre
              style={{
                whiteSpace: "pre-wrap",
                fontSize: 13,
                color: "#e2e8f0",
              }}
            >
              {JSON.stringify(coverageSummary, null, 2)}
            </pre>
          )}
        </div>
        {/* RIGHT PANEL — RULE PREVIEW */}
        <div
          style={{
            borderRadius: 20,
            padding: 18,
            background: "rgba(15,23,42,0.75)",
            border: "1px solid rgba(80,120,255,0.35)",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ fontSize: 14, marginBottom: 10 }}>
            Rule Preview (V5)
          </div>

          {!rulePreview ? (
            <div style={{ color: "#667085", fontSize: 13 }}>
              Analyze coverage → then generate rule preview.
            </div>
          ) : (
            <pre
              style={{
                whiteSpace: "pre-wrap",
                fontSize: 13,
                color: "#e2e8f0",
              }}
            >
              {JSON.stringify(rulePreview, null, 2)}
            </pre>
          )}

          <button
            onClick={handleGenerateRulePreview}
            disabled={rulePreviewLoading || !coverageSummary}
            style={{
              marginTop: 12,
              width: "100%",
              padding: "10px",
              borderRadius: 12,
              background:
                !coverageSummary
                  ? "rgba(129,140,248,0.15)"
                  : "linear-gradient(90deg,#6366f1,#4f46e5)",
              border: "1px solid #6366f1",
              color: "white",
              fontWeight: 600,
              cursor: !coverageSummary ? "not-allowed" : "pointer",
            }}
          >
            {rulePreviewLoading ? "Generating…" : "Generate Rule Preview"}
          </button>
        </div>
      </div> {/* END GRID */}
      {/* TOAST */}
      <ToastV2
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((p) => ({ ...p, open: false }))}
      />

      <style jsx global>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div> {/* END MAIN WRAPPER */}
  ); // END RETURN
} // END PAGE COMPONENT
// ==========================================================
// HELPERS — (Optional future transforms, safe stubs)
// ==========================================================

// You can extend this later if you want to normalize carrier text,
// extract numeric limits, validate formats, or auto-detect coverage types.
function normalizeCoverageText(text) {
  if (!text) return "";
  return text.trim();
}

// Validate AI output shape
function validateCoverageSummary(summary) {
  if (!summary) return false;
  if (typeof summary !== "object") return false;
  return true;
}

// Validate rulePreview shape
function validateRulePlan(plan) {
  if (!plan) return false;
  if (typeof plan !== "object") return false;
  if (!plan.groups) return false;
  return true;
}

// END OF FILE
