// pages/admin/coverage-intel.js
// ==========================================================
// PHASE 6+7 — COVERAGE INTEL + MULTI-PDF RECON (AI INSURANCE BRAIN)
// Analyze → Summarize → Recon PDFs → Build RulePlan → Apply-to-V5
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

  // TEXT MODE STATE
  const [sourceText, setSourceText] = useState("");
  const [coverageSummary, setCoverageSummary] = useState(null);
  const [rulePreview, setRulePreview] = useState(null);

  // PDF RECON STATE
  const [pdfFiles, setPdfFiles] = useState([]);
  const [reconProfile, setReconProfile] = useState(null);

  // LOADING STATES
  const [intelLoading, setIntelLoading] = useState(false);
  const [rulePreviewLoading, setRulePreviewLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [reconLoading, setReconLoading] = useState(false);

  // ==========================================================
  // ANALYZE COVERAGE TEXT → AI SUMMARY
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
      if (!json.ok) throw new Error(json.error);

      setCoverageSummary(json.summary);

      setToast({
        open: true,
        type: "success",
        message: "Coverage analyzed!",
      });
    } catch (err) {
      setToast({ open: true, type: "error", message: err.message });
    } finally {
      setIntelLoading(false);
    }
  }

  // ==========================================================
  // BUILD RULE PREVIEW → rulePlan (V5 Compatible)
  // ==========================================================
  async function handleGenerateRulePreview() {
    if (!coverageSummary) {
      return setToast({
        open: true,
        type: "error",
        message: "Analyze coverage first.",
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
      if (!json.ok) throw new Error(json.error);

      setRulePreview(json.rulePlan);

      setToast({
        open: true,
        type: "success",
        message: "Rule preview generated!",
      });
    } catch (err) {
      setToast({ open: true, type: "error", message: err.message });
    } finally {
      setRulePreviewLoading(false);
    }
  }

  // ==========================================================
  // MULTI-PDF UPLOAD
  // ==========================================================
  const handlePdfUpload = useCallback((e) => {
    const files = Array.from(e.target.files || []);
    const pdfs = files.filter((f) => f.type === "application/pdf");
    setPdfFiles((prev) => [...prev, ...pdfs]);
  }, []);

  function handleRemovePdf(index) {
    setPdfFiles((prev) => prev.filter((_, i) => i !== index));
  }

  // ==========================================================
  // RUN MULTI-PDF RECON ENGINE (AI)
  // ==========================================================
  async function handleRunRecon() {
    if (pdfFiles.length === 0) {
      return setToast({
        open: true,
        type: "error",
        message: "Upload PDFs first.",
      });
    }

    try {
      setReconLoading(true);
      setReconProfile(null);

      const form = new FormData();
      pdfFiles.forEach((f) => form.append("files", f));

      const res = await fetch("/api/coverage/recon", {
        method: "POST",
        body: form,
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error);

      setReconProfile(json.reconProfile);

      setToast({
        open: true,
        type: "success",
        message: "AI Recon complete!",
      });
    } catch (err) {
      setToast({ open: true, type: "error", message: err.message });
    } finally {
      setReconLoading(false);
    }
  }

  // ==========================================================
  // APPLY RULEPLAN TO V5 (Temporary Stub)
  // ==========================================================
  async function handleApplyToV5() {
    if (!rulePreview) {
      return setToast({
        open: true,
        type: "error",
        message: "Generate a rule preview first.",
      });
    }

    try {
      setApplyLoading(true);

      setToast({
        open: true,
        type: "success",
        message: "Apply-to-V5 is wired. Backend engine comes next.",
      });
    } finally {
      setApplyLoading(false);
    }
  }

  // ==========================================================
  // RENDER — PAGE UI
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
        Paste coverage → Upload PDFs → AI Recon → Build RulePlan → Apply to V5
      </p>

      {/* =========================== */}
      {/* MULTI-PDF RECON PANEL */}
      {/* =========================== */}
      <div
        style={{
          marginTop: 20,
          marginBottom: 25,
          padding: "20px 24px",
          borderRadius: 22,
          background: "rgba(15,23,42,0.8)",
          border: "1px solid rgba(80,120,255,0.35)",
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>
          Multi-PDF Coverage Recon (AI)
        </div>

        <input
          type="file"
          multiple
          accept="application/pdf"
          onChange={handlePdfUpload}
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 12,
            background: "rgba(30,41,59,0.6)",
            border: "1px solid rgba(148,163,184,0.3)",
            color: "#e5e7eb",
          }}
        />

        {/* FILE LIST */}
        {pdfFiles.map((f, i) => (
          <div
            key={i}
            style={{
              marginTop: 10,
              padding: "8px 12px",
              background: "rgba(255,255,255,0.05)",
              borderRadius: 10,
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>{f.name}</span>
            <button
              onClick={() => handleRemovePdf(i)}
              style={{
                color: "#f87171",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>
        ))}

        <button
          onClick={handleRunRecon}
          disabled={reconLoading || pdfFiles.length === 0}
          style={{
            marginTop: 14,
            width: "100%",
            padding: "10px",
            borderRadius: 12,
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
          {reconLoading ? "Analyzing PDFs…" : "Run Multi-PDF Recon (AI)"}
        </button>

        {reconProfile && (
          <pre
            style={{
              marginTop: 18,
              padding: 16,
              background: "rgba(15,23,42,0.6)",
              borderRadius: 12,
              border: "1px solid rgba(80,120,255,0.35)",
              whiteSpace: "pre-wrap",
            }}
          >
            {JSON.stringify(reconProfile, null, 2)}
          </pre>
        )}
      </div>

      {/* =========================== */}
      {/* TEXT INTEL + SUMMARY + PREVIEW */}
      {/* =========================== */}
      <div
        style={{
          marginTop: 20,
          display: "grid",
          gridTemplateColumns: "1.2fr 1.8fr 1.4fr",
          gap: 20,
        }}
      >
        {/* LEFT — TEXT INPUT */}
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
              padding: 10,
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

        {/* MIDDLE — SUMMARY */}
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

        {/* RIGHT — RULE PREVIEW + APPLY */}
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
              padding: 10,
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
              padding: 10,
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
      </div>

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
    </div> // END MAIN WRAPPER
  );
} // END COMPONENT

// END OF FILE
