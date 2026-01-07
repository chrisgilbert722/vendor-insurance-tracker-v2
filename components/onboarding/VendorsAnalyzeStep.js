// components/onboarding/VendorsAnalyzeStep.js
// STEP 4 — AI Vendor Analysis (after CSV upload + AI mapping)

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function VendorsAnalyzeStep({
  orgId,
  wizardState,
  setWizardState,
}) {
  const csv = wizardState?.vendorsCsv || {};
  const rawMapping = csv.mapping || {};
  const rows = Array.isArray(csv.rows) ? csv.rows : [];

  const [vendors, setVendors] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [error, setError] = useState("");

  /* -------------------------------------------------
     NORMALIZE MAPPING
     Supports:
     - { column, confidence } (AI)
     - "Vendor Name" (legacy)
  -------------------------------------------------- */
  const mapping = Object.fromEntries(
    Object.entries(rawMapping).map(([key, val]) => [
      key,
      typeof val === "string" ? val : val?.column || null,
    ])
  );

  /* -------------------------------------------------
     BUILD VENDOR OBJECTS (SAFE)
  -------------------------------------------------- */
  useEffect(() => {
    if (!rows.length || !mapping.vendorName || !mapping.email) return;

    try {
      const transformed = rows.map((row) => ({
        name: row[mapping.vendorName] || "",
        email: row[mapping.email] || "",
        phone: mapping.phone ? row[mapping.phone] || "" : "",
        category: mapping.category ? row[mapping.category] || "" : "",
        carrier: mapping.carrier ? row[mapping.carrier] || "" : "",
        coverageType: mapping.coverageType
          ? row[mapping.coverageType] || ""
          : "",
        policyNumber: mapping.policyNumber
          ? row[mapping.policyNumber] || ""
          : "",
        expiration: mapping.expiration
          ? row[mapping.expiration] || ""
          : "",
        address: mapping.address ? row[mapping.address] || "" : "",
        city: mapping.city ? row[mapping.city] || "" : "",
        state: mapping.state ? row[mapping.state] || "" : "",
        zip: mapping.zip ? row[mapping.zip] || "" : "",
      }));

      setVendors(transformed);

      setWizardState((prev) => ({
        ...prev,
        vendorsAnalyzed: { transformed },
      }));
    } catch (err) {
      console.error("Vendor transformation error:", err);
      setError("Failed to prepare vendor data for analysis.");
    }
  }, [rows, mapping, setWizardState]);

  /* -------------------------------------------------
     RUN AI ANALYSIS
  -------------------------------------------------- */
  async function runAiAnalysis() {
    setError("");
    setAiResult(null);
    setAiLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Authentication session missing.");
      }

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
      if (!json.ok) throw new Error(json.error || "AI analysis failed.");

      setAiResult(json);

      setWizardState((prev) => ({
        ...prev,
        vendorsAnalyzed: {
          transformed: vendors,
          ai: json,
        },
      }));
    } catch (err) {
      console.error("AI Vendor Analysis Error:", err);
      setError(err.message || "AI analysis failed.");
    } finally {
      setAiLoading(false);
    }
  }

  const canRun =
    vendors.length > 0 &&
    Boolean(mapping.vendorName) &&
    Boolean(mapping.email);

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
        Step 4 — AI Vendor Analysis
      </h2>

      <p style={{ fontSize: 13, color: "#9ca3af" }}>
        The system analyzes vendors for missing data, coverage gaps, risk
        patterns, and compliance issues.
      </p>

      {!canRun && (
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
          Vendor Name and Email are required to run analysis.
        </div>
      )}

      <button
        type="button"
        onClick={runAiAnalysis}
        disabled={aiLoading || !canRun}
        style={{
          marginTop: 16,
          padding: "10px 16px",
          borderRadius: 999,
          border: "1px solid rgba(56,189,248,0.9)",
          background:
            "radial-gradient(circle at top left,#38bdf8,#0ea5e9,#1e3a8a)",
          color: "#e0f2fe",
          fontSize: 13,
          fontWeight: 600,
          cursor: aiLoading || !canRun ? "not-allowed" : "pointer",
          opacity: aiLoading || !canRun ? 0.6 : 1,
        }}
      >
        {aiLoading ? "Analyzing vendors…" : "✨ Run AI Vendor Analysis"}
      </button>

      {error && (
        <div style={{ marginTop: 14, color: "#fca5a5", fontSize: 13 }}>
          {error}
        </div>
      )}
    </div>
  );
}
