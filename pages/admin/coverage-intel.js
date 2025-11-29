// pages/admin/coverage-intel.js
// ==========================================================
// COVERAGE INTEL — AI INSURANCE BRAIN
// Cinematic Neo-Blue full-screen cockpit
// ==========================================================

import { useEffect, useMemo, useState } from "react";
import { useRole } from "../../lib/useRole";
import { useOrg } from "../../context/OrgContext";
import ToastV2 from "../../components/ToastV2";

import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

// ==========================================================
// MAIN COMPONENT
// ==========================================================
export default function CoverageIntelPage() {
  const { isAdmin, isManager } = useRole();
  const { activeOrgId: orgId } = useOrg();
  const canEdit = isAdmin || isManager;

  // Raw text the user pastes from policies or requirements
  const [rawInput, setRawInput] = useState("");

  // AI extracted structure
  const [aiSummary, setAiSummary] = useState(null); // coverages/limits/etc.

  // Suggested V5 rule groups / rules
  const [aiRulePlan, setAiRulePlan] = useState(null);

  // Loading + error + toast
  const [loadingAnalyze, setLoadingAnalyze] = useState(false);
  const [loadingRules, setLoadingRules] = useState(false);

  const [toast, setToast] = useState({
    open: false,
    message: "",
    type: "success",
  });

  const disabled = !rawInput.trim();

  const orgLabel = useMemo(
    () => (orgId ? `Org: ${orgId}` : "No active org selected"),
    [orgId]
  );
  // ========================================================
  // HANDLERS — CALL BACKEND AI (we'll wire endpoints next)
  // ========================================================
  async function handleAnalyzeCoverage() {
    if (!rawInput.trim()) return;

    try {
      setLoadingAnalyze(true);
      setAiSummary(null);
      setAiRulePlan(null);

      const res = await fetch("/api/coverage/intel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rawInput }),
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Coverage analysis failed.");
      }

      setAiSummary(json.summary || null);
      setAiRulePlan(json.rulePlan || null);

      setToast({
        open: true,
        type: "success",
        message: "AI coverage analysis complete.",
      });
    } catch (err) {
      setToast({
        open: true,
        type: "error",
        message: err.message || "Coverage analysis failed.",
      });
    } finally {
      setLoadingAnalyze(false);
    }
  }

  async function handleGenerateRulesPreview() {
    if (!aiSummary) {
      return setToast({
        open: true,
        type: "error",
        message: "Run analysis first, then preview rules.",
      });
    }

    try {
      setLoadingRules(true);

      const res = await fetch("/api/coverage/intel/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          summary: aiSummary,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Rule plan generation failed.");
      }

      setAiRulePlan(json.rulePlan || null);

      setToast({
        open: true,
        type: "success",
        message: "AI rule plan generated.",
      });
    } catch (err) {
      setToast({
        open: true,
        type: "error",
        message: err.message || "Rule plan generation failed.",
      });
    } finally {
      setLoadingRules(false);
    }
  }

  // ========================================================
  // RENDER — FULLSCREEN CINEMATIC LAYOUT
  // ========================================================
  return (
    <div
      style={{
        minHeight: "100vh",
        position: "relative",
        background:
          "radial-gradient(circle at top,#020617 0%,#020617 55%,#000 100%)",
        padding: "32px 40px 40px",
        color: "#e5e7eb",
        overflow: "hidden",
      }}
    >
      {/* BACKGROUND AURA */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 5% 0%,rgba(56,189,248,0.18),transparent 55%),radial-gradient(circle at 95% 10%,rgba(129,140,248,0.18),transparent 55%)",
          pointerEvents: "none",
        }}
      />

      {/* SCANLINES */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px)",
          backgroundSize: "100% 3px",
          opacity: 0.2,
          pointerEvents: "none",
        }}
      />

      {/* MAIN CONTENT WRAPPER */}
      <div style={{ position: "relative", zIndex: 1 }}>
        {/* HEADER */}
        <div style={{ marginBottom: 18 }}>
          <div
            style={{
              display: "inline-flex",
              gap: 8,
              padding: "4px 10px",
              borderRadius: 999,
              border: "1px solid rgba(148,163,184,0.4)",
              background:
                "linear-gradient(120deg,rgba(15,23,42,0.94),rgba(15,23,42,0.7))",
              marginBottom: 6,
            }}
          >
            <span
              style={{
                fontSize: 10,
                color: "#9ca3af",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Coverage Intel
            </span>
            <span
              style={{
                fontSize: 10,
                color: "#38bdf8",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              AI Insurance Brain
            </span>
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 26,
              fontWeight: 600,
            }}
          >
            Paste policies once.{" "}
            <span
              style={{
                background:
                  "linear-gradient(90deg,#38bdf8,#a5b4fc,#e5e7eb)",
                WebkitBackgroundClip: "text",
                color: "transparent",
              }}
            >
              Let AI do the underwriting.
            </span>
          </h1>

          <p
            style={{
              marginTop: 6,
              maxWidth: 720,
              fontSize: 13,
              color: "#cbd5f5",
            }}
          >
            Paste carrier requirements or policy text. AI will extract
            coverages, limits, endorsements, and propose rules for your V5
            engine.
          </p>

          <div
            style={{
              marginTop: 6,
              fontSize: 12,
              color: "#9ca3af",
            }}
          >
            {orgLabel}
          </div>
        </div>

        {/* 3-PANEL GRID */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1.3fr) minmax(0,1.4fr) minmax(0,1.3fr)",
            gap: 18,
            alignItems: "stretch",
          }}
        >
          {/* LEFT PANEL — RAW INPUT */}
          <div
            style={{
              borderRadius: 22,
              padding: 18,
              background: "rgba(15,23,42,0.78)",
              border: "1px solid rgba(80,120,255,0.25)",
              boxShadow:
                "0 0 25px rgba(64,106,255,0.3), inset 0 0 20px rgba(15,23,42,0.9)",
              backdropFilter: "blur(12px)",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div
              style={{
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: 1.4,
                color: "#9ca3af",
              }}
            >
              Source Text
            </div>
            <div
              style={{
                fontSize: 13,
                color: "#cbd5f5",
              }}
            >
              Paste insurance requirements, carrier instructions, or policy
              language here. AI will parse and structure it.
            </div>

            <textarea
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              rows={16}
              style={{
                marginTop: 4,
                width: "100%",
                borderRadius: 16,
                padding: 14,
                border: "1px solid rgba(51,65,85,0.9)",
                background: "rgba(15,23,42,0.98)",
                color: "#e5e7eb",
                fontSize: 13,
                fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif",
                resize: "vertical",
              }}
              placeholder={`Example:
"Vendor must maintain:
- General Liability $1,000,000 per occurrence / $2,000,000 aggregate
- Auto Liability $1,000,000 CSL
- Workers Compensation statutory with EL $1,000,000
- Additional Insured and Waiver of Subrogation endorsements on GL and Auto
- Carriers rated A- or better by AM Best."`}
            />

            <button
              onClick={handleAnalyzeCoverage}
              disabled={disabled || loadingAnalyze}
              style={{
                marginTop: 8,
                padding: "10px 16px",
                borderRadius: 12,
                border: "1px solid rgba(56,189,248,0.9)",
                background: disabled
                  ? "rgba(15,23,42,0.9)"
                  : "linear-gradient(90deg,#38bdf8,#0ea5e9)",
                color: disabled ? "#64748b" : "#e5f9ff",
                fontSize: 13,
                fontWeight: 600,
                cursor: disabled ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {loadingAnalyze ? (
                <>
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: "999px",
                      border: "2px solid rgba(125,211,252,0.9)",
                      borderTopColor: "transparent",
                      animation: "spin 0.9s linear infinite",
                    }}
                  />
                  Analyzing coverage…
                </>
              ) : (
                <>
                  <span>🧠</span>
                  Analyze coverage (AI)
                </>
              )}
            </button>
          </div>
          {/* MIDDLE PANEL — AI SUMMARY */}
          <div
            style={{
              borderRadius: 22,
              padding: 18,
              background: "rgba(15,23,42,0.88)",
              border: "1px solid rgba(80,120,255,0.35)",
              boxShadow:
                "0 0 25px rgba(56,189,248,0.25), inset 0 0 22px rgba(15,23,42,0.96)",
              backdropFilter: "blur(16px)",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div
              style={{
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: 1.4,
                color: "#9ca3af",
              }}
            >
              AI Coverage Summary
            </div>

            {!aiSummary && (
              <div
                style={{
                  fontSize: 13,
                  color: "#9ca3af",
                  padding: 10,
                  borderRadius: 12,
                  border: "1px dashed rgba(51,65,85,0.9)",
                  background: "rgba(15,23,42,0.9)",
                }}
              >
                Run <strong>Analyze coverage (AI)</strong> to see extracted
                coverages, limits, and endorsements.
              </div>
            )}

            {aiSummary && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  fontSize: 13,
                }}
              >
                {aiSummary.coverages?.map((cov, idx) => (
                  <div
                    key={idx}
                    style={{
                      borderRadius: 12,
                      padding: 10,
                      border: "1px solid rgba(51,65,85,0.9)",
                      background:
                        "linear-gradient(145deg,rgba(15,23,42,0.96),rgba(15,23,42,0.9))",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        marginBottom: 4,
                        color: "#e5e7eb",
                      }}
                    >
                      {cov.name || "Coverage"}
                    </div>
                    {cov.limits && (
                      <div
                        style={{
                          fontSize: 12,
                          color: "#cbd5f5",
                        }}
                      >
                        Limits: {cov.limits}
                      </div>
                    )}
                    {cov.endorsements && cov.endorsements.length > 0 && (
                      <div
                        style={{
                          fontSize: 12,
                          color: "#a5b4fc",
                          marginTop: 4,
                        }}
                      >
                        Endorsements: {cov.endorsements.join(", ")}
                      </div>
                    )}
                  </div>
                ))}

                {aiSummary.notes && (
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 12,
                      color: "#9ca3af",
                      borderRadius: 10,
                      border: "1px dashed rgba(148,163,184,0.6)",
                      padding: 8,
                    }}
                  >
                    <strong>AI Notes:</strong> {aiSummary.notes}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT PANEL — RULE PLAN + ACTIONS */}
          <div
            style={{
              borderRadius: 22,
              padding: 18,
              background: "rgba(15,23,42,0.84)",
              border: "1px solid rgba(80,120,255,0.3)",
              boxShadow:
                "0 0 25px rgba(56,189,248,0.25), inset 0 0 22px rgba(15,23,42,0.92)",
              backdropFilter: "blur(14px)",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div
              style={{
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: 1.4,
                color: "#9ca3af",
              }}
            >
              V5 Rule Plan (Preview)
            </div>

            <div
              style={{
                fontSize: 13,
                color: "#cbd5f5",
              }}
            >
              AI can turn this coverage set into rule groups for your Requirements
              Engine V5. Review the preview below before applying.
            </div>

            <button
              onClick={handleGenerateRulesPreview}
              disabled={!aiSummary || loadingRules}
              style={{
                padding: "9px 14px",
                borderRadius: 12,
                border: "1px solid rgba(129,140,248,0.9)",
                background: !aiSummary
                  ? "rgba(30,64,175,0.6)"
                  : "linear-gradient(90deg,#6366f1,#4f46e5)",
                color: "#e5e7ff",
                fontSize: 13,
                fontWeight: 500,
                cursor: !aiSummary ? "not-allowed" : "pointer",
                marginBottom: 6,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {loadingRules ? (
                <>
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: "999px",
                      border: "2px solid rgba(191,219,254,0.9)",
                      borderTopColor: "transparent",
                      animation: "spin 0.9s linear infinite",
                    }}
                  />
                  Building V5 rule plan…
                </>
              ) : (
                <>
                  <span>📐</span>
                  Generate rule preview for V5
                </>
              )}
            </button>

            {!aiRulePlan && (
              <div
                style={{
                  fontSize: 12,
                  color: "#9ca3af",
                  padding: 10,
                  borderRadius: 12,
                  border: "1px dashed rgba(55,65,81,0.9)",
                  background: "rgba(15,23,42,0.9)",
                }}
              >
                No rule plan yet. Run{" "}
                <strong>Generate rule preview for V5</strong> once coverage
                analysis is complete.
              </div>
            )}

            {aiRulePlan && (
              <div
                style={{
                  fontSize: 12,
                  color: "#e5e7eb",
                  borderRadius: 12,
                  border: "1px solid rgba(51,65,85,0.9)",
                  background: "rgba(15,23,42,0.98)",
                  padding: 10,
                  maxHeight: 260,
                  overflowY: "auto",
                  fontFamily: "monospace",
                }}
              >
                {JSON.stringify(aiRulePlan, null, 2)}
              </div>
            )}

            <button
              onClick={() =>
                setToast({
                  open: true,
                  type: "error",
                  message:
                    "In v2, this will push rules directly into V5. For now, copy the preview into Requirements V5.",
                })
              }
              disabled={!aiRulePlan}
              style={{
                marginTop: 6,
                padding: "9px 14px",
                borderRadius: 999,
                border: "1px solid rgba(56,189,248,0.8)",
                background: aiRulePlan
                  ? "linear-gradient(90deg,#22c55e,#16a34a)"
                  : "rgba(15,23,42,0.85)",
                color: aiRulePlan ? "#ecfdf5" : "#64748b",
                fontSize: 13,
                fontWeight: 600,
                cursor: aiRulePlan ? "pointer" : "not-allowed",
              }}
            >
              🚀 Apply to Requirements V5 (coming soon)
            </button>
          </div>
        </div>
      </div>

      {/* TOAST */}
      <ToastV2
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((p) => ({ ...p, open: false }))}
      />

      {/* GLOBAL SPIN ANIM */}
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
