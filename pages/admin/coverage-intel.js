// pages/admin/coverage-intel.js
// ==========================================================
// PHASE 6 — COVERAGE INTEL (AI Insurance Brain)
// Analyze → Summarize → Generate Rules → Apply to V5
// ==========================================================

// ----------------------------
// IMPORTS
// ----------------------------
import { useState } from "react";
import { useOrg } from "../../context/OrgContext";   // <-- NEW
import ToastV2 from "../../components/ToastV2";

// ----------------------------
// CONSTANTS
// ----------------------------
const SAMPLE_PLACEHOLDER = `Paste insurance requirements or carrier policy text...

Example:
"Vendor must maintain GL 1M/2M, Auto 1M CSL,
Workers Comp statutory, Employers Liability 1M,
Additional Insured + Waiver of Subrogation required."`;

// ==========================================================
// MAIN COMPONENT
// ==========================================================
export default function CoverageIntelPage() {
  // Org context (needed for Apply-to-V5)
  const { activeOrgId: orgId } = useOrg();   // <-- REQUIRED

  // Notification system
  const [toast, setToast] = useState({
    open: false,
    message: "",
    type: "success",
  });

  // Source text from user
  const [sourceText, setSourceText] = useState("");

  // AI summary + rule preview data
  const [coverageSummary, setCoverageSummary] = useState(null);
  const [rulePreview, setRulePreview] = useState(null);

  // Loading states
  const [intelLoading, setIntelLoading] = useState(false);
  const [rulePreviewLoading, setRulePreviewLoading] = useState(false);

  // Apply-to-V5 loading
  const [applyLoading, setApplyLoading] = useState(false);
  // ==========================================================
  // HANDLER 1 — Analyze Coverage (AI → summary)
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
  // HANDLER 2 — Build Rule Preview (AI → V5 rulePlan)
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
      if (!json.ok)
        throw new Error(json.error || "Rule preview generation failed.");

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
  // HANDLER 3 — Apply Rule Plan to V5 Engine
  // ==========================================================
  async function handleApplyToV5() {
    if (!orgId) {
      return setToast({
        open: true,
        type: "error",
        message: "No active org selected — cannot apply to V5.",
      });
    }

    if (!rulePreview || !Array.isArray(rulePreview.groups)) {
      return setToast({
        open: true,
        type: "error",
        message: "No rule plan to apply. Generate preview first.",
      });
    }

    try {
      setApplyLoading(true);

      const res = await fetch("/api/coverage/intel/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          rulePlan: rulePreview,
        }),
      });

      const json = await res.json();
      if (!json.ok) {
        throw new Error(json.error || "Apply-to-V5 failed.");
      }

      setToast({
        open: true,
        type: "success",
        message: `Applied ${json.createdRules} rules in ${json.createdGroups} groups to V5.`,
      });
    } catch (err) {
      setToast({
        open: true,
        type: "error",
        message: err.message || "Failed to apply rules to V5.",
      });
    } finally {
      setApplyLoading(false);
    }
  }
  // ==========================================================
  // RENDER — PAGE LAYOUT (Full Cinematic Coverage Intel UI)
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
        Paste carrier requirements → analyze coverage → auto-build rules for V5.
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
        {/* LEFT PANEL — COVERAGE SOURCE TEXT */}
        <div
          style={{
            borderRadius: 20,
            padding: 18,
            background: "rgba(15,23,42,0.75)",
            border: "1px solid rgba(80,120,255,0.35)",
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

        {/* MIDDLE PANEL — AI COVERAGE SUMMARY */}
        <div
          style={{
            borderRadius: 20,
            padding: 18,
            background: "rgba(15,23,42,0.75)",
            border: "1px solid rgba(80,120,255,0.35)",
            overflowY: "auto",
          }}
        >
          <div style={{ fontSize: 14, marginBottom: 10 }}>AI Coverage Summary</div>

          {!coverageSummary ? (
            <div style={{ color: "#667085", fontSize: 13 }}>
              Run “Analyze Coverage” to populate this summary.
            </div>
          ) : (
            <pre style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>
              {JSON.stringify(coverageSummary, null, 2)}
            </pre>
          )}
        </div>

        {/* RIGHT PANEL — RULE PREVIEW + APPLY-TO-V5 */}
        <div
          style={{
            borderRadius: 20,
            padding: 18,
            background: "rgba(15,23,42,0.75)",
            border: "1px solid rgba(80,120,255,0.35)",
            overflowY: "auto",
          }}
        >
          <div style={{ fontSize: 14, marginBottom: 10 }}>Rule Preview (V5 Format)</div>

          {!rulePreview ? (
            <div style={{ color: "#667085", fontSize: 13 }}>
              Analyze coverage → Generate rule preview.
            </div>
          ) : (
            <pre style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>
              {JSON.stringify(rulePreview, null, 2)}
            </pre>
          )}

          {/* Generate Preview Button */}
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

          {/* APPLY TO V5 BUTTON */}
          <button
            onClick={handleApplyToV5}
            disabled={!rulePreview || applyLoading}
            style={{
              marginTop: 12,
              width: "100%",
              padding: "10px",
              borderRadius: 12,
              background:
                !rulePreview
                  ? "rgba(34,197,94,0.15)"
                  : "linear-gradient(90deg,#22c55e,#16a34a)",
              border: "1px solid #22c55e",
              color: "white",
              fontWeight: 600,
              cursor: !rulePreview ? "not-allowed" : "pointer",
            }}
          >
            {applyLoading ? "Applying…" : "Apply Rule Plan to V5"}
          </button>
        </div>
            </div> {/* END MAIN GRID */}
    </div> {/* END MAIN WRAPPER */}

    {/* TOAST */}
    <ToastV2
      open={toast.open}
      message={toast.message}
      type={toast.type}
      onClose={() => setToast((p) => ({ ...p, open: false }))}
    />
  </div> {/* <--- THIS closes the OUTERMOST PAGE DIV */}
  );
}
