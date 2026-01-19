// components/onboarding/VendorsAnalyzeStep.js
// Wizard Step 4 — Vendor Analysis (CLIENT SAFE)
// ✅ NO server imports
// ✅ Uses API only
// ✅ Fail-open UI
// ✅ Marks onboarding complete on Continue

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";

export default function VendorsAnalyzeStep({
  orgId,
  wizardState,
  setWizardState,
  setForceUiStep,
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!orgId) return;

    async function runAnalysis() {
      try {
        setLoading(true);
        setError("");

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          throw new Error("Missing auth session");
        }

        const vendors =
          Array.isArray(wizardState?.vendorsCsv?.rows)
            ? wizardState.vendorsCsv.rows
            : [];

        const res = await fetch("/api/onboarding/ai-vendors-analyze", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            orgId,
            vendors,
          }),
        });

        const json = await res.json();

        if (!json.ok && !json.skipped) {
          throw new Error(json.error || "Analysis failed");
        }

        setSummary(json.summary || null);

        setWizardState?.((prev) => ({
          ...prev,
          vendorsAnalyzed: {
            summary: json.summary || null,
            vendors: json.vendors || [],
          },
        }));
      } catch (err) {
        console.error("[VendorsAnalyzeStep]", err);
        setError(err.message || "Analysis failed");
      } finally {
        setLoading(false);
      }
    }

    runAnalysis();
  }, [orgId]);

  // -------------------------------------------
  // CONTINUE → MARK ONBOARDING COMPLETE → DASHBOARD
  // -------------------------------------------
  async function handleContinue() {
    if (completing) return;

    setCompleting(true);
    setError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Session expired. Please refresh.");
      }

      // SINGLE DETERMINISTIC WRITE — marks onboarding complete
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const json = await res.json();

      if (!json.ok) {
        throw new Error(json.error || "Failed to complete onboarding");
      }

      console.log("[VendorsAnalyzeStep] Onboarding marked complete");

      // Redirect directly to dashboard
      router.replace("/dashboard");

    } catch (err) {
      console.error("[VendorsAnalyzeStep] Complete error:", err);
      setError(err.message || "Failed to continue");
      setCompleting(false);
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h3 style={{ marginBottom: 12 }}>Vendor Risk Analysis</h3>

      {loading && (
        <div style={{ color: "#9ca3af" }}>
          Analyzing vendors…
        </div>
      )}

      {error && (
        <div style={{ color: "#f87171", marginBottom: 12 }}>
          {error}
        </div>
      )}

      {summary && (
        <div
          style={{
            marginTop: 12,
            padding: 14,
            borderRadius: 12,
            background: "rgba(15,23,42,0.9)",
            border: "1px solid rgba(71,85,105,0.8)",
            fontSize: 13,
          }}
        >
          <div>Total vendors: {summary.totalVendors}</div>
          <div>Missing emails: {summary.missingEmails}</div>
          <div>High risk vendors: {summary.highRisk}</div>
        </div>
      )}

      {!loading && !summary && !error && (
        <div style={{ color: "#9ca3af" }}>
          No analysis data yet.
        </div>
      )}

      {/* CONTINUE → COMPLETE ONBOARDING */}
      <button
        type="button"
        onClick={handleContinue}
        disabled={loading || completing}
        style={{
          marginTop: 24,
          padding: "14px 32px",
          borderRadius: 999,
          border: "1px solid rgba(34,197,94,0.9)",
          background:
            "radial-gradient(circle at top left,#22c55e,#16a34a,#14532d)",
          color: "#dcfce7",
          fontSize: 15,
          fontWeight: 700,
          cursor: loading || completing ? "not-allowed" : "pointer",
          width: "100%",
          opacity: loading || completing ? 0.6 : 1,
        }}
      >
        {completing ? "Completing setup…" : "Continue to Dashboard →"}
      </button>
    </div>
  );
}
