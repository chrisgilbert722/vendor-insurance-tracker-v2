// components/onboarding/VendorsAnalyzeStep.js
// Wizard Step 4 — Vendor Analysis (CLIENT SAFE)
// ✅ NO server imports
// ✅ Uses API only
// ✅ Fail-open UI

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function VendorsAnalyzeStep({ orgId, wizardState, setWizardState }) {
  const [loading, setLoading] = useState(false);
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
          wizardState?.vendorsCsv?.rows && Array.isArray(wizardState.vendorsCsv.rows)
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
      } catch (err) {
        console.error("[VendorsAnalyzeStep]", err);
        setError(err.message || "Analysis failed");
      } finally {
        setLoading(false);
      }
    }

    runAnalysis();
  }, [orgId]);

  return (
    <div style={{ padding: 16 }}>
      <h3 style={{ marginBottom: 12 }}>Vendor Risk Analysis</h3>

      {loading && <div style={{ color: "#9ca3af" }}>Analyzing vendors…</div>}

      {error && <div style={{ color: "#f87171" }}>{error}</div>}

      {summary && (
        <div style={{ marginTop: 12, fontSize: 13 }}>
          <div>Total vendors: {summary.totalVendors}</div>
          <div>Missing emails: {summary.missingEmails}</div>
          <div>High risk vendors: {summary.highRisk}</div>
        </div>
      )}

      {!loading && !summary && !error && (
        <div style={{ color: "#9ca3af" }}>No analysis data yet.</div>
      )}
    </div>
  );
}
