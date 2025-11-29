// pages/admin/coverage-intel.js
// ==========================================================
// PHASE 6+7+8 — COVERAGE INTEL (AI Insurance Brain)
// Text or PDF → Analyze → Summarize → Build Rule Plan →
// Scan Conflicts (AI) → Apply (Smart Merge) with nuclear modals
// ==========================================================

import { useState } from "react";
import { useOrg } from "../../context/OrgContext";
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
  const { activeOrgId: orgId } = useOrg(); // used by Apply-to-V5 and conflicts

  const [toast, setToast] = useState({
    open: false,
    message: "",
    type: "success",
  });

  // User input text + PDF
  const [sourceText, setSourceText] = useState("");
  const [pdfFile, setPdfFile] = useState(null);

  // AI results
  const [coverageSummary, setCoverageSummary] = useState(null);
  const [rulePreview, setRulePreview] = useState(null);

  // Loading states
  const [intelLoading, setIntelLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [rulePreviewLoading, setRulePreviewLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [conflictLoading, setConflictLoading] = useState(false);

  // Nuclear summary modal state (Apply)
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryStats, setSummaryStats] = useState(null);

  // Conflict modal state
  const [conflictOpen, setConflictOpen] = useState(false);
  const [conflicts, setConflicts] = useState([]);

  // ==========================================================
  // HANDLER 1 — Analyze Coverage (TEXT → Summary)
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
      setSummaryOpen(false);
      setSummaryStats(null);
      setConflictOpen(false);
      setConflicts([]);

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
        message: "Coverage analyzed successfully from text.",
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
  // HANDLER 1B — Analyze Coverage (PDF → Summary)
  // ==========================================================
  async function handleAnalyzePdf() {
    if (!pdfFile) {
      return setToast({
        open: true,
        type: "error",
        message: "Upload a PDF first.",
      });
    }

    try {
      setPdfLoading(true);
      setCoverageSummary(null);
      setRulePreview(null);
      setSummaryOpen(false);
      setSummaryStats(null);
      setConflictOpen(false);
      setConflicts([]);

      const formData = new FormData();
      formData.append("file", pdfFile);

      const res = await fetch("/api/coverage/pdf-intel", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "PDF analysis failed.");

      setCoverageSummary(json.summary);

      setToast({
        open: true,
        type: "success",
        message: "Coverage analyzed successfully from PDF.",
      });
    } catch (err) {
      setToast({
        open: true,
        type: "error",
        message: err.message || "Failed to analyze PDF coverage.",
      });
    } finally {
      setPdfLoading(false);
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
        message: "Run Analyze Coverage (text or PDF) first.",
      });
    }

    try {
      setRulePreviewLoading(true);
      setRulePreview(null);
      setSummaryOpen(false);
      setSummaryStats(null);
      setConflictOpen(false);
      setConflicts([]);

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
  // HANDLER 3 — AI CONFLICT DETECTION
  // ==========================================================
  async function handleScanConflicts() {
    if (!orgId) {
      return setToast({
        open: true,
        type: "error",
        message: "No active org selected — cannot scan conflicts.",
      });
    }

    if (!rulePreview || !Array.isArray(rulePreview.groups)) {
      return setToast({
        open: true,
        type: "error",
        message: "No rule plan to compare. Generate preview first.",
      });
    }

    try {
      setConflictLoading(true);
      setConflictOpen(false);
      setConflicts([]);

      const res = await fetch("/api/coverage/conflicts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          rulePlan: rulePreview,
        }),
      });

      const json = await res.json();
      if (!json.ok)
        throw new Error(json.error || "Conflict detection failed.");

      setConflicts(json.conflicts || []);
      setConflictOpen(true);

      setToast({
        open: true,
        type: "success",
        message: "Conflict scan complete.",
      });
    } catch (err) {
      setToast({
        open: true,
        type: "error",
        message: err.message || "Failed to scan conflicts.",
      });
    } finally {
      setConflictLoading(false);
    }
  }

  // ==========================================================
  // HANDLER 4 — Apply Rule Plan to V5 (Smart Merge + Nuclear Modal)
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
      setSummaryOpen(false);
      setSummaryStats(null);

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

      setSummaryStats({
        createdGroups: json.createdGroups ?? 0,
        reusedGroups: json.reusedGroups ?? 0,
        createdRules: json.createdRules ?? 0,
        skippedDuplicates: json.skippedDuplicates ?? 0,
      });
      setSummaryOpen(true);

      setToast({
        open: true,
        type: "success",
        message: "Rule plan applied to V5 (Smart Merge).",
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
        Paste text or upload a carrier PDF → extract coverages → generate rule
        plan → scan conflicts → apply to V5.
      </p>

      {/* MAIN 3-COLUMN GRID */}
      <div
        style={{
          marginTop: 20,
          display: "grid",
          gridTemplateColumns: "1.3fr 1.7fr 1.5fr",
          gap: 20,
        }}
      >
        {/* LEFT PANEL — SOURCE TEXT + PDF UPLOAD */}
        <div
          style={{
            borderRadius: 20,
            padding: 18,
            background: "rgba(15,23,42,0.78)",
            border: "1px solid rgba(80,120,255,0.35)",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ fontSize: 14, marginBottom: 4 }}>Coverage Text</div>

          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder={SAMPLE_PLACEHOLDER}
            rows={10}
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
              marginTop: 4,
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
            {intelLoading ? "Analyzing text…" : "Analyze Coverage (Text)"}
          </button>

          {/* PDF UPLOAD */}
          <div
            style={{
              marginTop: 12,
              fontSize: 13,
              color: "#cbd5f5",
            }}
          >
            Or upload a carrier PDF:
          </div>

          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => {
              const f = e.target.files?.[0] || null;
              setPdfFile(f);
            }}
            style={{
              marginTop: 4,
              fontSize: 12,
              color: "#e5e7eb",
            }}
          />

          <button
            onClick={handleAnalyzePdf}
            disabled={pdfLoading || !pdfFile}
            style={{
              marginTop: 8,
              width: "100%",
              padding: "9px",
              borderRadius: 12,
              background:
                !pdfFile || pdfLoading
                  ? "rgba(56,189,248,0.25)"
                  : "linear-gradient(90deg,#0ea5e9,#38bdf8)",
              border: "1px solid #38bdf8",
              color: "white",
              fontWeight: 600,
              fontSize: 13,
              cursor: !pdfFile || pdfLoading ? "not-allowed" : "pointer",
            }}
          >
            {pdfLoading ? "Analyzing PDF…" : "Analyze Coverage (PDF)"}
          </button>
        </div>

        {/* MIDDLE PANEL — COVERAGE SUMMARY */}
        <div
          style={{
            borderRadius: 20,
            padding: 18,
            background: "rgba(15,23,42,0.78)",
            border: "1px solid rgba(80,120,255,0.35)",
            overflowY: "auto",
          }}
        >
          <div style={{ fontSize: 14, marginBottom: 10 }}>
            AI Coverage Summary
          </div>

          {!coverageSummary ? (
            <div style={{ color: "#667085", fontSize: 13 }}>
              Run “Analyze Coverage (Text)” or “Analyze Coverage (PDF)” to
              populate this summary.
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

        {/* RIGHT PANEL — RULE PREVIEW + CONFLICTS + APPLY */}
        <div
          style={{
            borderRadius: 20,
            padding: 18,
            background: "rgba(15,23,42,0.78)",
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
            onClick={handleScanConflicts}
            disabled={conflictLoading || !rulePreview}
            style={{
              marginTop: 10,
              width: "100%",
              padding: "10px",
              borderRadius: 12,
              background:
                !rulePreview
                  ? "rgba(248,113,113,0.20)"
                  : "linear-gradient(90deg,#ef4444,#b91c1c)",
              border: "1px solid rgba(248,113,113,0.9)",
              color: "white",
              fontWeight: 600,
              cursor: !rulePreview ? "not-allowed" : "pointer",
            }}
          >
            {conflictLoading ? "Scanning conflicts…" : "Scan Conflicts (AI)"}
          </button>

          <button
            onClick={handleApplyToV5}
            disabled={applyLoading || !rulePreview}
            style={{
              marginTop: 10,
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
      </div>

      {/* FULLSCREEN CONFLICT MODAL */}
      {conflictOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.92)",
            backdropFilter: "blur(10px)",
            zIndex: 9998,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 720,
              maxHeight: "80vh",
              borderRadius: 24,
              padding: 24,
              background:
                "radial-gradient(circle at top,#020617,#020617 60%,#000)",
              border: "1px solid rgba(248,113,113,0.7)",
              boxShadow: "0 40px 80px rgba(0,0,0,0.9)",
              overflowY: "auto",
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
                  color: "#fecaca",
                }}
              >
                ⚠ Conflict Analysis (AI)
              </div>
              <button
                onClick={() => setConflictOpen(false)}
                style={{
                  borderRadius: 999,
                  padding: "4px 10px",
                  fontSize: 12,
                  background: "rgba(15,23,42,0.9)",
                  border: "1px solid rgba(148,163,184,0.6)",
                  color: "#9ca3af",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>

            {conflicts.length === 0 ? (
              <div style={{ color: "#a7f3d0", fontSize: 13 }}>
                ✅ No conflicts found between existing V5 rules and this rule
                plan.
              </div>
            ) : (
              conflicts.map((c, idx) => (
                <div
                  key={idx}
                  style={{
                    marginBottom: 14,
                    padding: 12,
                    borderRadius: 14,
                    background:
                      "linear-gradient(135deg,rgba(30,64,175,0.6),rgba(24,24,27,0.9))",
                    border: "1px solid rgba(248,113,113,0.8)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      color: "#fecaca",
                      fontWeight: 600,
                      marginBottom: 6,
                    }}
                  >
                    Conflict #{idx + 1} — {c.type || "other"}
                  </div>

                  <div
                    style={{
                      fontSize: 12,
                      color: "#e5e7eb",
                      marginBottom: 6,
                    }}
                  >
                    {c.summary}
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
                      marginTop: 4,
                      fontSize: 11,
                      color: "#cbd5f5",
                    }}
                  >
                    <div
                      style={{
                        padding: 8,
                        borderRadius: 10,
                        background: "rgba(127,29,29,0.45)",
                        border: "1px solid rgba(248,113,113,0.7)",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 600,
                          marginBottom: 4,
                          color: "#fecaca",
                        }}
                      >
                        Existing Rule
                      </div>
                      <div>{c.existingRule?.groupName}</div>
                      <div>{c.existingRule?.requirement_text}</div>
                      <div>
                        {c.existingRule?.field_key} {c.existingRule?.operator}{" "}
                        {String(c.existingRule?.expected_value ?? "")}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: 8,
                        borderRadius: 10,
                        background: "rgba(30,64,175,0.45)",
                        border: "1px solid rgba(96,165,250,0.8)",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 600,
                          marginBottom: 4,
                          color: "#bfdbfe",
                        }}
                      >
                        New Rule (Plan)
                      </div>
                      <div>{c.newRule?.groupName}</div>
                      <div>{c.newRule?.requirement_text}</div>
                      <div>
                        {c.newRule?.field_key} {c.newRule?.operator}{" "}
                        {String(c.newRule?.expected_value ?? "")}
                      </div>
                    </div>
                  </div>

                  {c.suggestedResolution && (
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 12,
                        color: "#fbbf24",
                        fontStyle: "italic",
                      }}
                    >
                      Suggested resolution: {c.suggestedResolution}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* FULLSCREEN APPLY SUMMARY MODAL */}
      {summaryOpen && summaryStats && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.88)",
            backdropFilter: "blur(10px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 520,
              borderRadius: 24,
              padding: 24,
              background:
                "radial-gradient(circle at top,#0f172a,#020617 60%,#000)",
              border: "1px solid rgba(56,189,248,0.5)",
              boxShadow: "0 40px 80px rgba(0,0,0,0.8)",
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
                ✅ Applied to Requirements V5
              </div>
              <button
                onClick={() => setSummaryOpen(false)}
                style={{
                  borderRadius: 999,
                  padding: "4px 10px",
                  fontSize: 12,
                  background: "rgba(15,23,42,0.8)",
                  border: "1px solid rgba(148,163,184,0.6)",
                  color: "#9ca3af",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <SummaryCard
                label="New Groups"
                value={summaryStats.createdGroups}
                color="#38bdf8"
              />
              <SummaryCard
                label="Reused Groups"
                value={summaryStats.reusedGroups}
                color="#a855f7"
              />
              <SummaryCard
                label="New Rules"
                value={summaryStats.createdRules}
                color="#22c55e"
              />
              <SummaryCard
                label="Skipped Duplicates"
                value={summaryStats.skippedDuplicates}
                color="#f97316"
              />
            </div>

            <p
              style={{
                fontSize: 13,
                color: "#9ca3af",
                marginBottom: 14,
              }}
            >
              All changes were applied using Smart Merge logic to avoid
              duplicates and reuse existing groups where possible.
            </p>

            <div
              style={{
                display: "flex",
                gap: 10,
                marginTop: 8,
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
                onClick={() => setSummaryOpen(false)}
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
          </div>
        </div>
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
// SMALL COMPONENT — SUMMARY CARD
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

