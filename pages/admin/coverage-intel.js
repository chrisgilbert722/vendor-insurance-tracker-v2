// pages/admin/coverage-intel.js
// ==========================================================
// Coverage Intel — Text + Multi-PDF Recon + Cinematic Apply Overlay
// ==========================================================

import { useState, useCallback, useMemo } from "react";
import { useOrg } from "../../context/OrgContext";
import ToastV2 from "../../components/ToastV2";

const SAMPLE_PLACEHOLDER = `Paste insurance requirements or carrier policy text...

Example:
"Vendor must maintain GL 1M/2M, Auto 1M CSL,
Workers Comp statutory, Employers Liability 1M,
Additional Insured + Waiver of Subrogation required."`;

export default function CoverageIntelPage() {
  const { activeOrgId: orgId } = useOrg();

  const [toast, setToast] = useState({
    open: false,
    message: "",
    type: "success",
  });

  // TEXT FLOW
  const [sourceText, setSourceText] = useState("");
  const [coverageSummary, setCoverageSummary] = useState(null);
  const [rulePreview, setRulePreview] = useState(null);

  // MULTI-PDF RECON
  const [pdfFiles, setPdfFiles] = useState([]);
  const [reconProfile, setReconProfile] = useState(null);

  // LOADING FLAGS
  const [intelLoading, setIntelLoading] = useState(false);
  const [rulePreviewLoading, setRulePreviewLoading] = useState(false);
  const [reconLoading, setReconLoading] = useState(false);

  // APPLY OVERLAY STATE
  const [applyOverlayOpen, setApplyOverlayOpen] = useState(false);
  const [applySubmitting, setApplySubmitting] = useState(false);
  const [applyStats, setApplyStats] = useState(null);

  // ==========================================================
  // ANALYZE COVERAGE (TEXT → SUMMARY)
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
      setReconProfile(null);
      setApplyStats(null);
      setApplyOverlayOpen(false);

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
  // BUILD RULE PREVIEW (SUMMARY → rulePlan)
// ==========================================================
  async function handleGenerateRulePreview() {
    if (!coverageSummary) {
      return setToast({
        open: true,
        type: "error",
        message: "Run Analyze Coverage (Text or PDF Recon) first.",
      });
    }

    try {
      setRulePreviewLoading(true);
      setRulePreview(null);
      setApplyStats(null);
      setApplyOverlayOpen(false);

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
        message: "Rule preview generated.",
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
  // MULTI-PDF RECON: UPLOAD + REMOVE
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
  // MULTI-PDF RECON: RUN /api/coverage/recon
  // ==========================================================
  async function handleRunRecon() {
    if (pdfFiles.length === 0) {
      return setToast({
        open: true,
        type: "error",
        message: "Upload one or more PDFs first.",
      });
    }

    try {
      setReconLoading(true);
      setReconProfile(null);
      setCoverageSummary(null);
      setRulePreview(null);
      setApplyStats(null);
      setApplyOverlayOpen(false);

      const form = new FormData();
      pdfFiles.forEach((file) => form.append("files", file));

      const res = await fetch("/api/coverage/recon", {
        method: "POST",
        body: form,
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Recon failed.");

      setReconProfile(json.reconProfile || null);

      // OPTION: pipe reconProfile into coverageSummary for preview
      if (json.reconProfile) {
        setCoverageSummary(json.reconProfile);
      }

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
  // APPLY BUTTON → OPEN CINEMATIC OVERLAY
// ==========================================================
  const previewCounts = useMemo(() => {
    if (!rulePreview || !Array.isArray(rulePreview.groups)) {
      return { groups: 0, rules: 0 };
    }
    const groups = rulePreview.groups.length;
    let rules = 0;
    rulePreview.groups.forEach((g) => {
      if (Array.isArray(g.rules)) rules += g.rules.length;
    });
    return { groups, rules };
  }, [rulePreview]);

  function handleOpenApplyOverlay() {
    if (!rulePreview) {
      return setToast({
        open: true,
        type: "error",
        message: "Generate a rule preview first.",
      });
    }
    if (!orgId) {
      return setToast({
        open: true,
        type: "error",
        message: "No active org selected — cannot apply to V5.",
      });
    }
    setApplyStats(null);
    setApplyOverlayOpen(true);
  }

  // ==========================================================
  // CONFIRM APPLY (INSIDE OVERLAY) → /api/coverage/apply
// ==========================================================
  async function handleConfirmApply() {
    if (!orgId || !rulePreview || !Array.isArray(rulePreview.groups)) return;

    try {
      setApplySubmitting(true);
      setApplyStats(null);

      const res = await fetch("/api/coverage/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          rulePlan: rulePreview,
        }),
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Apply-to-V5 failed.");

      setApplyStats({
        createdGroups: json.createdGroups ?? 0,
        reusedGroups: json.reusedGroups ?? 0,
        createdRules: json.createdRules ?? 0,
        skippedDuplicates: json.skippedDuplicates ?? 0,
      });

      setToast({
        open: true,
        type: "success",
        message: "Rule plan applied to V5 (Smart Merge).",
      });
    } catch (err) {
      setToast({
        open: true,
        type: "error",
        message: err.message || "Failed to apply rule plan.",
      });
    } finally {
      setApplySubmitting(false);
    }
  }

  // ==========================================================
  // RENDER
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
        Paste coverage or upload PDFs → AI Recon → RulePlan → Apply to V5.
      </p>

      {/* =========================== */}
      {/* MULTI-PDF RECON PANEL      */}
      {/* =========================== */}
      <div
        style={{
          marginTop: 20,
          marginBottom: 25,
          padding: "20px 24px",
          borderRadius: 22,
          background: "rgba(15,23,42,0.82)",
          border: "1px solid rgba(80,120,255,0.35)",
          boxShadow: "0 0 25px rgba(64,106,255,0.25)",
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
            background: "rgba(15,23,42,0.9)",
            border: "1px solid rgba(148,163,184,0.4)",
            color: "#e5e7eb",
          }}
        />
        {pdfFiles.length === 0 ? (
          <div style={{ marginTop: 8, color: "#64748b", fontSize: 13 }}>
            No PDFs uploaded yet.
          </div>
        ) : (
          <div style={{ marginTop: 10 }}>
            {pdfFiles.map((f, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 12px",
                  marginBottom: 6,
                  borderRadius: 10,
                  background: "rgba(15,23,42,0.9)",
                  border: "1px solid rgba(51,65,85,0.7)",
                  fontSize: 13,
                }}
              >
                <span>{f.name}</span>
                <button
                  onClick={() => handleRemovePdf(i)}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#f87171",
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

        <button
          onClick={handleRunRecon}
          disabled={reconLoading || pdfFiles.length === 0}
          style={{
            marginTop: 12,
            width: "100%",
            padding: 10,
            borderRadius: 12,
            background:
              pdfFiles.length === 0
                ? "rgba(56,189,248,0.25)"
                : "linear-gradient(90deg,#38bdf8,#0ea5e9)",
            border: "1px solid #38bdf8",
            color: "#e5e7eb",
            fontWeight: 600,
            cursor: pdfFiles.length === 0 ? "not-allowed" : "pointer",
          }}
        >
          {reconLoading ? "Analyzing PDFs…" : "Run Multi-PDF Recon (AI)"}
        </button>

        {reconProfile && (
          <div
            style={{
              marginTop: 18,
              padding: 16,
              background: "rgba(15,23,42,0.9)",
              borderRadius: 14,
              border: "1px solid rgba(80,120,255,0.4)",
              maxHeight: 260,
              overflowY: "auto",
              fontSize: 12,
            }}
          >
            <div style={{ fontSize: 13, marginBottom: 6, color: "#e5e7eb" }}>
              Recon Results (Unified Coverage Profile)
            </div>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                color: "#cbd5f5",
              }}
            >
              {JSON.stringify(reconProfile, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* =========================== */}
      {/* TEXT INTEL + SUMMARY + PREVIEW */}
      {/* =========================== */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 1.8fr 1.4fr",
          gap: 20,
          marginTop: 10,
        }}
      >
        {/* LEFT — TEXT INPUT */}
        <div
          style={{
            borderRadius: 20,
            padding: 18,
            background: "rgba(15,23,42,0.8)",
            border: "1px solid rgba(80,120,255,0.35)",
          }}
        >
          <div style={{ fontSize: 14, marginBottom: 10 }}>Coverage Text</div>
          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder={SAMPLE_PLACEHOLDER}
            rows={12}
            style={{
              width: "100%",
              borderRadius: 12,
              padding: 12,
              background: "#020617",
              color: "#e5e7eb",
              border: "1px solid #334155",
              fontSize: 13,
            }}
          />
          <button
            onClick={handleAnalyzeCoverage}
            disabled={intelLoading}
            style={{
              marginTop: 10,
              width: "100%",
              padding: 10,
              borderRadius: 12,
              background: intelLoading
                ? "rgba(56,189,248,0.35)"
                : "linear-gradient(90deg,#38bdf8,#0ea5e9)",
              border: "1px solid #38bdf8",
              color: "#e5e7eb",
              fontWeight: 600,
              cursor: intelLoading ? "not-allowed" : "pointer",
            }}
          >
            {intelLoading ? "Analyzing…" : "Analyze Coverage (Text)"}
          </button>
        </div>

        {/* MIDDLE — COVERAGE SUMMARY */}
        <div
          style={{
            borderRadius: 20,
            padding: 18,
            background: "rgba(15,23,42,0.85)",
            border: "1px solid rgba(80,120,255,0.35)",
            overflowY: "auto",
          }}
        >
          <div style={{ fontSize: 14, marginBottom: 10 }}>
            AI Coverage Summary
          </div>
          {!coverageSummary ? (
            <div style={{ color: "#64748b", fontSize: 13 }}>
              Run Analyze Coverage (or Multi-PDF Recon) to populate this.
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
            background: "rgba(15,23,42,0.85)",
            border: "1px solid rgba(80,120,255,0.35)",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ fontSize: 14, marginBottom: 10 }}>
            Rule Preview (V5 Format)
          </div>
          {!rulePreview ? (
            <div style={{ color: "#64748b", fontSize: 13 }}>
              Generate a rule preview to see what will be applied.
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
              marginTop: 10,
              width: "100%",
              padding: 10,
              borderRadius: 12,
              background:
                !coverageSummary
                  ? "rgba(129,140,248,0.25)"
                  : "linear-gradient(90deg,#6366f1,#4f46e5)",
              border: "1px solid #6366f1",
              color: "#e5e7eb",
              fontWeight: 600,
              cursor: !coverageSummary ? "not-allowed" : "pointer",
            }}
          >
            {rulePreviewLoading ? "Generating…" : "Generate Rule Preview"}
          </button>
          <button
            onClick={handleOpenApplyOverlay}
            disabled={!rulePreview}
            style={{
              marginTop: 10,
              width: "100%",
              padding: 10,
              borderRadius: 12,
              background: !rulePreview
                ? "rgba(34,197,94,0.25)"
                : "linear-gradient(90deg,#22c55e,#16a34a)",
              border: "1px solid #22c55e",
              color: "#e5e7eb",
              fontWeight: 600,
              cursor: !rulePreview ? "not-allowed" : "pointer",
            }}
          >
            🚀 Apply Rule Plan to V5
          </button>
        </div>
      </div>

      {/* CINEMATIC APPLY OVERLAY */}
      {applyOverlayOpen && (
        <ApplyOverlay
          onClose={() => setApplyOverlayOpen(false)}
          onConfirm={handleConfirmApply}
          submitting={applySubmitting}
          applyStats={applyStats}
          previewCounts={previewCounts}
        />
      )}

      {/* TOAST */}
      <ToastV2
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() =>
          setToast((p) => ({
            ...p,
            open: false,
          }))
        }
      />

      <style jsx global>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

// ==========================================================
// APPLY OVERLAY COMPONENT (CINEMATIC)
// ==========================================================
function ApplyOverlay({ onClose, onConfirm, submitting, applyStats, previewCounts }) {
  const hasApplied = !!applyStats;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.9)",
        backdropFilter: "blur(12px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 640,
          borderRadius: 24,
          padding: 24,
          background:
            "radial-gradient(circle at top,#0f172a,#020617 60%,#000)",
          border: "1px solid rgba(56,189,248,0.7)",
          boxShadow: "0 30px 70px rgba(0,0,0,0.9)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "#e5e7eb",
            }}
          >
            {hasApplied ? "✅ Applied to Requirements V5" : "Confirm Apply to V5 Engine"}
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            style={{
              borderRadius: 999,
              padding: "4px 10px",
              fontSize: 12,
              background: "rgba(15,23,42,0.9)",
              border: "1px solid rgba(148,163,184,0.7)",
              color: "#9ca3af",
              cursor: submitting ? "not-allowed" : "pointer",
            }}
          >
            Close
          </button>
        </div>

        {!hasApplied && (
          <>
            <p
              style={{
                fontSize: 13,
                color: "#cbd5f5",
                marginBottom: 12,
              }}
            >
              You are about to apply an AI-generated rule plan into your live V5
              Requirements Engine. Review the high-level summary below, then
              confirm deployment.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                marginBottom: 18,
              }}
            >
              <SummaryCard
                label="Groups in Preview"
                value={previewCounts.groups}
                color="#38bdf8"
              />
              <SummaryCard
                label="Rules in Preview"
                value={previewCounts.rules}
                color="#a855f7"
              />
            </div>

            <button
              onClick={onConfirm}
              disabled={submitting}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 12,
                background: submitting
                  ? "rgba(59,130,246,0.35)"
                  : "linear-gradient(90deg,#22c55e,#16a34a)",
                border: "1px solid rgba(34,197,94,0.9)",
                color: "#e5e7eb",
                fontWeight: 600,
                fontSize: 14,
                cursor: submitting ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {submitting ? (
                <>
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: "999px",
                      border: "2px solid rgba(187,247,208,0.9)",
                      borderTopColor: "transparent",
                      animation: "spin 0.9s linear infinite",
                    }}
                  />
                  Applying to V5…
                </>
              ) : (
                <>
                  <span>🚀</span>
                  Confirm Apply to V5
                </>
              )}
            </button>
          </>
        )}

        {hasApplied && (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                marginTop: 10,
                marginBottom: 18,
              }}
            >
              <SummaryCard
                label="New Groups"
                value={applyStats.createdGroups}
                color="#38bdf8"
              />
              <SummaryCard
                label="Reused Groups"
                value={applyStats.reusedGroups}
                color="#a855f7"
              />
              <SummaryCard
                label="New Rules"
                value={applyStats.createdRules}
                color="#22c55e"
              />
              <SummaryCard
                label="Duplicates Skipped"
                value={applyStats.skippedDuplicates}
                color="#f97316"
              />
            </div>
            <p
              style={{
                fontSize: 13,
                color: "#cbd5f5",
                marginBottom: 12,
              }}
            >
              Smart Merge has updated your V5 engine while avoiding duplicates and
              reusing compatible existing groups.
            </p>

            <div
              style={{
                display: "flex",
                gap: 10,
              }}
            >
              <button
                onClick={() => {
                  window.location.href = "/admin/requirements-v5";
                }}
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  borderRadius: 12,
                  background:
                    "linear-gradient(90deg,#38bdf8,#0ea5e9,#6366f1)",
                  border: "1px solid rgba(56,189,248,0.9)",
                  color: "white",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Open V5 Engine
              </button>
              <button
                onClick={onClose}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  background: "rgba(15,23,42,0.9)",
                  border: "1px solid rgba(148,163,184,0.7)",
                  color: "#e5e7eb",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Stay on Coverage Intel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ==========================================================
// REUSABLE SUMMARY CARD
// ==========================================================
function SummaryCard({ label, value, color }) {
  return (
    <div
      style={{
        borderRadius: 14,
        padding: 12,
        background:
          "linear-gradient(145deg,rgba(15,23,42,0.96),rgba(15,23,42,0.9))",
        border: `1px solid ${color}`,
      }}
    >
      <div
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: 1,
          color: "#9ca3af",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: "#e5e7eb",
        }}
      >
        {value}
      </div>
    </div>
  );
}
