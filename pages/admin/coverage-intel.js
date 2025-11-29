// pages/admin/coverage-intel.js
// ==========================================================
// PHASE 6+7 — COVERAGE INTEL + MULTI-PDF RECON (AI Insurance Brain)
// ==========================================================

import { useState, useCallback } from "react";
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
// PAGE COMPONENT
// ==========================================================
export default function CoverageIntelPage() {
  const [toast, setToast] = useState({
    open: false,
    message: "",
    type: "success",
  });

  // SINGLE-TEXT INTEL STATE
  const [sourceText, setSourceText] = useState("");
  const [coverageSummary, setCoverageSummary] = useState(null);
  const [rulePreview, setRulePreview] = useState(null);

  // MULTI-PDF RECON STATE
  const [pdfFiles, setPdfFiles] = useState([]);
  const [reconLoading, setReconLoading] = useState(false);
  const [reconProfile, setReconProfile] = useState(null);

  // UI Loading State
  const [intelLoading, setIntelLoading] = useState(false);
  const [rulePreviewLoading, setRulePreviewLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  // ==========================================================
  // HANDLER 1 — Analyze Coverage (Text → AI Summary)
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
  // HANDLER 2 — Build Rule Preview (Summary → rulePlan)
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
  // MULTI-PDF UPLOAD HANDLER
  // ==========================================================
  const handlePdfUpload = useCallback((event) => {
    const files = Array.from(event.target.files || []);
    const pdfOnly = files.filter((f) => f.type === "application/pdf");

    setPdfFiles((prev) => [...prev, ...pdfOnly]);
  }, []);

  // ==========================================================
  // REMOVE PDF FROM LIST
  // ==========================================================
  function handleRemovePdf(index) {
    setPdfFiles((prev) => prev.filter((_, i) => i !== index));
  }

  // ==========================================================
  // RUN MULTI-PDF RECON (PDFs → unified reconProfile)
  // ==========================================================
  async function handleRunRecon() {
    if (!pdfFiles.length) {
      return setToast({
        open: true,
        type: "error",
        message: "Upload at least one PDF to run AI Recon.",
      });
    }

    try {
      setReconLoading(true);
      setReconProfile(null);

      const form = new FormData();
      pdfFiles.forEach((file) => form.append("files", file));

      const res = await fetch("/api/coverage/recon", {
        method: "POST",
        body: form,
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Recon failed.");

      setReconProfile(json.reconProfile);

      setToast({
        open: true,
        type: "success",
        message: "AI Recon completed successfully!",
      });
    } catch (err) {
      setToast({
        open: true,
        type: "error",
        message: err.message || "Recon failed.",
      });
    } finally {
      setReconLoading(false);
    }
  }
  // ==========================================================
  // HANDLER 3 — Apply to V5 (UI stub for now)
  // Backend will be connected to /api/coverage/intel/apply next.
  // ==========================================================
  async function handleApplyToV5() {
    if (!rulePreview) {
      return setToast({
        open: true,
        type: "error",
        message: "Generate a rule preview first.",
      });
    }

    setApplyLoading(true);

    try {
      setToast({
        open: true,
        type: "success",
        message:
          "Apply-to-V5 UI is wired. Next: connect backend API to auto-write rules.",
      });
    } finally {
      setApplyLoading(false);
    }
  }
  // ==========================================================
  // RENDER — MULTI-PDF RECON PANEL
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
        Paste coverage → Upload PDFs → AI Recon → RulePlan → Apply to V5.
      </p>

      {/* ====================================================== */}
      {/* MULTI-PDF RECON PANEL */}
      {/* ====================================================== */}
      <div
        style={{
          marginTop: 20,
          marginBottom: 25,
          padding: "20px 24px",
          borderRadius: 22,
          background: "rgba(15,23,42,0.8)",
          border: "1px solid rgba(80,120,255,0.35)",
          boxShadow: "0 0 25px rgba(64,106,255,0.25)",
        }}
      >
        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            marginBottom: 10,
            color: "#e5e7eb",
          }}
        >
          Multi-PDF Coverage Recon (AI)
        </div>

        {/* FILE INPUT */}
        <input
          type="file"
          accept="application/pdf"
          multiple
          onChange={handlePdfUpload}
          style={{
            padding: 10,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(148,163,184,0.25)",
            borderRadius: 12,
            width: "100%",
            marginBottom: 15,
          }}
        />

        {/* FILE LIST */}
        {pdfFiles.length === 0 ? (
          <div style={{ color: "#64748b", fontSize: 13 }}>
            No PDFs uploaded yet.
          </div>
        ) : (
          <div style={{ marginBottom: 14 }}>
            {pdfFiles.map((f, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  background: "rgba(255,255,255,0.05)",
                  padding: "8px 12px",
                  borderRadius: 10,
                  marginBottom: 6,
                  fontSize: 13,
                }}
              >
                <span>{f.name}</span>

                <button
                  onClick={() => handleRemovePdf(i)}
                  style={{
                    color: "#f87171",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* RUN RECON BUTTON */}
        <button
          onClick={handleRunRecon}
          disabled={reconLoading || pdfFiles.length === 0}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            width: "100%",
            background:
              pdfFiles.length === 0
                ? "rgba(56,189,248,0.25)"
                : "linear-gradient(90deg,#38bdf8,#0ea5e9)",
            border: "1px solid #38bdf8",
            color: "white",
            fontWeight: 600,
            cursor: pdfFiles.length === 0 ? "not-allowed" : "pointer",
          }}
        >
          {reconLoading ? "Analyzing PDFs…" : "Analyze All PDFs (AI Recon)"}
        </button>

        {/* RECON RESULTS */}
        {reconProfile && (
          <div
            style={{
              marginTop: 20,
              padding: "16px 18px",
              background: "rgba(15,23,42,0.7)",
              borderRadius: 14,
              border: "1px solid rgba(80,120,255,0.3)",
            }}
          >
            <div style={{ fontSize: 14, marginBottom: 8 }}>
              Recon Results (Unified Coverage Profile)
            </div>

            <pre
              style={{
                whiteSpace: "pre-wrap",
                fontSize: 13,
                color: "#cbd5f5",
              }}
            >
              {JSON.stringify(reconProfile, null, 2)}
            </pre>
          </div>
        )}
      </div>
      {/* ====================================================== */}
      {/* ORIGINAL TEXT INTEL + RULE PREVIEW + APPLY PANEL */}
      {/* ====================================================== */}
      <div
        style={{
          marginTop: 20,
          display: "grid",
          gridTemplateColumns: "1.2fr 1.8fr 1.4fr",
          gap: 20,
        }}
      >
        {/* LEFT — TEXT INPUT PANEL */}
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

        {/* MIDDLE — COVERAGE SUMMARY PANEL */}
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

        {/* RIGHT — RULE PREVIEW + APPLY BUTTONS */}
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

          <button
            onClick={handleApplyToV5}
            disabled={applyLoading || !rulePreview}
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
            {applyLoading ? "Applying…" : "Apply Rule Plan to V5 (UI Stub)"}
          </button>
        </div>
      </div>
      {/* ====================================================== */}
      {/* TOAST NOTIFICATIONS */}
      {/* ====================================================== */}
      <ToastV2
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((p) => ({ ...p, open: false }))}
      />

      {/* ====================================================== */}
      {/* GLOBAL ANIMATIONS */}
      {/* ====================================================== */}
      <style jsx global>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>  {/* END MAIN WRAPPER */}
  ); // END RETURN
} // END PAGE COMPONENT
// ==========================================================
// HELPER — Label formatting for UI
// ==========================================================
function formatKeyLabel(key) {
  if (!key) return "";

  return key
    .replace(/policy\./g, "")
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toUpperCase();
}

// ==========================================================
// HELPER — Format coverage summary block
// ==========================================================
function prettyJson(obj) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch (e) {
    return String(obj);
  }
}

// ==========================================================
// HELPER — Validate Coverage Summary Before RulePlan
// ==========================================================
function validateCoverageSummary(summary) {
  if (!summary) return false;
  if (typeof summary !== "object") return false;
  if (!summary.coverages || !Array.isArray(summary.coverages)) return false;

  return summary.coverages.length > 0;
}

// ==========================================================
// HELPER — Convert AI Recon Result to Display-Friendly Format
// ==========================================================
function flattenRecon(recon) {
  if (!recon) return {};

  return {
    coverages: recon.coverages || [],
    conflicts: recon.globalConflicts || [],
    endorsements: recon.endorsements || [],
    notes: recon.notes || "",
  };
}
// ==========================================================
// END OF COVERAGE INTEL (AI INSURANCE BRAIN)
// ==========================================================

// No more code below this line.
// File closes cleanly with no dangling braces or JSX.
// If adding new UI panels or engines later, create them ABOVE Section 8.
