// components/onboarding/VendorsAnalyzeStep.js
// STEP 4 — AI Vendor Analysis (AI-first, Fix Mode enabled)
// STEP 1: Read-only Fix Missing Emails UI

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
  const [showFixEmails, setShowFixEmails] = useState(false);

  /* -------------------------------------------------
     NORMALIZE MAPPING
  -------------------------------------------------- */
  const mapping = Object.fromEntries(
    Object.entries(rawMapping).map(([key, val]) => [
      key,
      typeof val === "string" ? val : val?.column || null,
    ])
  );

  /* -------------------------------------------------
     BUILD VENDOR OBJECTS (EMAIL OPTIONAL)
  -------------------------------------------------- */
  useEffect(() => {
    if (!rows.length || !mapping.vendorName) return;

    try {
      const transformed = rows.map((row) => ({
        name: row[mapping.vendorName] || "",
        email: mapping.email ? row[mapping.email] || "" : "",
        category: mapping.category ? row[mapping.category] || "" : "",
        carrier: mapping.carrier ? row[mapping.carrier] || "" : "",
        policyNumber: mapping.policyNumber
          ? row[mapping.policyNumber] || ""
          : "",
        expiration: mapping.expiration
          ? row[mapping.expiration] || ""
          : "",
      }));

      setVendors(transformed);

      setWizardState((prev) => ({
        ...prev,
        vendorsAnalyzed: {
          transformed,
          missingEmailCount: transformed.filter((v) => !v.email).length,
        },
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
          ...(prev.vendorsAnalyzed || {}),
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

  const canRun = vendors.length > 0 && Boolean(mapping.vendorName);
  const vendorsMissingEmail = vendors.filter((v) => !v.email);

  return (
    <div
      style={{
        padding: 18,
        borderRadius: 18,
        background: "rgba(15,23,42,0.96)",
        border: "1px solid rgba(51,65,85,0.9)",
      }}
    >
      <h2 style={{ fontSize: 18, fontWeight: 600, color: "#e5e7eb" }}>
        Step 4 — AI Vendor Analysis
      </h2>

      <p style={{ fontSize: 13, color: "#9ca3af" }}>
        The system analyzes vendors for coverage gaps, risk patterns, and
        compliance issues.
      </p>

      {/* ⚠️ Fix Mode Summary */}
      {vendorsMissingEmail.length > 0 && (
        <div
          style={{
            marginTop: 12,
            padding: "12px 14px",
            borderRadius: 10,
            background: "rgba(234,179,8,0.15)",
            border: "1px solid rgba(234,179,8,0.6)",
            color: "#fde68a",
            fontSize: 13,
          }}
        >
          {vendorsMissingEmail.length} vendor
          {vendorsMissingEmail.length > 1 ? "s are" : " is"} missing an email
          address. Automated reminders are paused for these vendors.
          <div style={{ marginTop: 8 }}>
            <button
              type="button"
              onClick={() => setShowFixEmails((v) => !v)}
              style={{
                background: "none",
                border: "none",
                color: "#facc15",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                padding: 0,
              }}
            >
              {showFixEmails ? "Hide vendors" : "View vendors"}
            </button>
          </div>
        </div>
      )}

      {/* 🔍 READ-ONLY MISSING EMAIL TABLE */}
      {showFixEmails && vendorsMissingEmail.length > 0 && (
        <div
          style={{
            marginTop: 14,
            borderRadius: 12,
            border: "1px solid rgba(234,179,8,0.4)",
            overflow: "hidden",
          }}
        >
          <table
            style={{
              width: "100%",
              fontSize: 13,
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr style={{ background: "rgba(15,23,42,0.9)" }}>
                <th style={{ padding: 10, textAlign: "left", color: "#fde68a" }}>
                  Vendor
                </th>
                <th style={{ padding: 10, textAlign: "left", color: "#fde68a" }}>
                  Category
                </th>
                <th style={{ padding: 10, textAlign: "left", color: "#fde68a" }}>
                  Policy
                </th>
                <th style={{ padding: 10, textAlign: "left", color: "#fde68a" }}>
                  Email
                </th>
              </tr>
            </thead>
            <tbody>
              {vendorsMissingEmail.map((v, i) => (
                <tr
                  key={i}
                  style={{
                    background: i % 2 ? "rgba(2,6,23,0.9)" : "rgba(15,23,42,0.9)",
                  }}
                >
                  <td style={{ padding: 10, color: "#e5e7eb" }}>{v.name}</td>
                  <td style={{ padding: 10, color: "#9ca3af" }}>
                    {v.category || "—"}
                  </td>
                  <td style={{ padding: 10, color: "#9ca3af" }}>
                    {v.policyNumber || "—"}
                  </td>
                  <td style={{ padding: 10, color: "#fca5a5" }}>
                    Missing
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button
        type="button"
        onClick={runAiAnalysis}
        disabled={aiLoading || !canRun}
        style={{
          marginTop: 18,
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
