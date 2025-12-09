// components/onboarding/VendorsAnalyzeStep.js
// STEP 4 — AI Vendor Analysis (after CSV upload + mapping)

import { useEffect, useState } from "react";

export default function VendorsAnalyzeStep({
  orgId,
  wizardState,
  setWizardState,
}) {
  const csv = wizardState?.vendorsCsv;
  const mapping = csv?.mapping || {};
  const rows = csv?.rows || [];

  const [vendors, setVendors] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [error, setError] = useState("");

  // Transform raw CSV rows → vendor objects using the mapping from Step 3
  useEffect(() => {
    if (!mapping || !Object.keys(mapping).length || !rows.length) return;

    try {
      const transformed = rows.map((row) => {
        return {
          name: row[mapping.vendorName] || "",
          email: row[mapping.email] || "",
          phone: row[mapping.phone] || "",
          category: row[mapping.category] || "",
          carrier: row[mapping.carrier] || "",
          coverageType: row[mapping.coverageType] || "",
          policyNumber: row[mapping.policyNumber] || "",
          expiration: row[mapping.expiration] || "",
          address: row[mapping.address] || "",
          city: row[mapping.city] || "",
          state: row[mapping.state] || "",
          zip: row[mapping.zip] || "",
        };
      });

      setVendors(transformed);

      // Save to wizard state
      setWizardState((prev) => ({
        ...prev,
        vendorsAnalyzed: { transformed },
      }));
    } catch (err) {
      console.error("Vendor transformation error:", err);
      setError("Failed to transform vendor rows.");
    }
  }, [rows, mapping, setWizardState]);

  // Run AI analysis on structured vendor objects
  async function runAiAnalysis() {
    setError("");
    setAiResult(null);
    setAiLoading(true);

    try {
      const res = await fetch("/api/onboarding/ai-vendors-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          vendors,
        }),
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error);

      setAiResult(json);

      // Save to wizard state
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

  const missingRequiredMappings =
    !mapping.vendorName || !mapping.email || vendors.length === 0;

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
        The wizard now analyzes your vendors for missing data, coverage issues,
        category-based risks, and areas where contracts may require additional
        validation.
      </p>

      {missingRequiredMappings && (
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
          CSV mapping (Step 3) is incomplete — Vendor Name and Email are required.
        </div>
      )}

      {/* RUN AI BUTTON */}
      <button
        type="button"
        onClick={runAiAnalysis}
        disabled={aiLoading || missingRequiredMappings}
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
          cursor:
            aiLoading || missingRequiredMappings ? "not-allowed" : "pointer",
          opacity: aiLoading || missingRequiredMappings ? 0.6 : 1,
        }}
      >
        {aiLoading ? "Analyzing vendors…" : "✨ Run AI Vendor Analysis"}
      </button>

      {aiLoading && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            borderRadius: 12,
            background: "rgba(2,6,23,0.65)",
            border: "1px solid rgba(71,85,105,0.9)",
            color: "#9ca3af",
            fontSize: 13,
          }}
        >
          AI is reading your vendor list, identifying missing data, reviewing
          carrier patterns, and preparing risk insights…
        </div>
      )}

      {/* AI RESULTS */}
      {aiResult && (
        <div style={{ marginTop: 26 }}>
          <h3
            style={{
              fontSize: 15,
              marginBottom: 12,
              color: "#e5e7eb",
            }}
          >
            🧠 AI Vendor Summary
          </h3>

          <div
            style={{
              padding: 14,
              marginBottom: 18,
              borderRadius: 14,
              background: "rgba(2,6,23,0.65)",
              border: "1px solid rgba(71,85,105,0.9)",
              fontSize: 13,
              color: "#cbd5f5",
              lineHeight: 1.5,
            }}
          >
            {aiResult.summary}
          </div>

          {/* Missing Data Block */}
          {aiResult.missingData && aiResult.missingData.length > 0 && (
            <div
              style={{
                marginBottom: 20,
                padding: 12,
                borderRadius: 14,
                background: "rgba(15,23,42,0.9)",
                border: "1px solid rgba(55,65,81,0.9)",
                fontSize: 12,
                color: "#e5e7eb",
              }}
            >
              <strong style={{ color: "#38bdf8" }}>
                Missing or incomplete data detected:
              </strong>
              <ul style={{ marginTop: 6 }}>
                {aiResult.missingData.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Risk Highlights */}
          {aiResult.riskHighlights && (
            <div style={{}}>
              <h3 style={{ fontSize: 15, color: "#e5e7eb" }}>
                🚨 Risk Highlights
              </h3>
              {aiResult.riskHighlights.map((rh, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: 12,
                    marginTop: 10,
                    borderRadius: 14,
                    background: "rgba(2,6,23,0.6)",
                    border: "1px solid rgba(71,85,105,0.9)",
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{rh.title}</div>
                  <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
                    {rh.description}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
