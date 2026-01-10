// components/onboarding/VendorsAnalyzeStep.js
// STEP 4 — AI Vendor Analysis (AI-first, Fix Mode enabled)
// STEP 2: Editable Email Inputs (no backend writes yet)

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
  const [editedEmails, setEditedEmails] = useState({});
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

    const transformed = rows.map((row) => ({
      id: row[mapping.vendorName], // temporary stable key
      name: row[mapping.vendorName] || "",
      email: mapping.email ? row[mapping.email] || "" : "",
      category: mapping.category ? row[mapping.category] || "" : "",
      policyNumber: mapping.policyNumber
        ? row[mapping.policyNumber] || ""
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
        body: JSON.stringify({ orgId, vendors }),
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "AI analysis failed.");

      setAiResult(json);
    } catch (err) {
      setError(err.message || "AI analysis failed.");
    } finally {
      setAiLoading(false);
    }
  }

  const vendorsMissingEmail = vendors.filter(
    (v) => !v.email && !editedEmails[v.id]
  );

  const hasEdits = Object.keys(editedEmails).length > 0;

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
        AI has analyzed your vendors. You can fix missing contact info below to
        enable automated reminders.
      </p>

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
          address.
          <div style={{ marginTop: 8 }}>
            <button
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
              {showFixEmails ? "Hide" : "Fix now"}
            </button>
          </div>
        </div>
      )}

      {showFixEmails && (
        <div
          style={{
            marginTop: 14,
            borderRadius: 12,
            border: "1px solid rgba(234,179,8,0.4)",
            overflow: "hidden",
          }}
        >
          <table style={{ width: "100%", fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ padding: 10, textAlign: "left" }}>Vendor</th>
                <th style={{ padding: 10, textAlign: "left" }}>Category</th>
                <th style={{ padding: 10, textAlign: "left" }}>Email</th>
              </tr>
            </thead>
            <tbody>
              {vendorsMissingEmail.map((v) => (
                <tr key={v.id}>
                  <td style={{ padding: 10 }}>{v.name}</td>
                  <td style={{ padding: 10, color: "#9ca3af" }}>
                    {v.category || "—"}
                  </td>
                  <td style={{ padding: 10 }}>
                    <input
                      type="email"
                      placeholder="email@vendor.com"
                      value={editedEmails[v.id] || ""}
                      onChange={(e) =>
                        setEditedEmails((prev) => ({
                          ...prev,
                          [v.id]: e.target.value,
                        }))
                      }
                      style={{
                        width: "100%",
                        padding: "6px 8px",
                        borderRadius: 6,
                        border: "1px solid rgba(234,179,8,0.6)",
                        background: "rgba(2,6,23,0.9)",
                        color: "#e5e7eb",
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div
            style={{
              padding: 12,
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <button
              disabled={!hasEdits}
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                border: "1px solid rgba(34,197,94,0.9)",
                background: hasEdits
                  ? "linear-gradient(90deg,#22c55e,#4ade80)"
                  : "rgba(34,197,94,0.2)",
                color: "#022c22",
                fontWeight: 700,
                cursor: hasEdits ? "pointer" : "not-allowed",
              }}
            >
              Save Emails & Enable Automation
            </button>
          </div>
        </div>
      )}

      <button
        onClick={runAiAnalysis}
        disabled={aiLoading || vendors.length === 0}
        style={{
          marginTop: 18,
          padding: "10px 16px",
          borderRadius: 999,
          border: "1px solid rgba(56,189,248,0.9)",
          background:
            "radial-gradient(circle at top left,#38bdf8,#0ea5e9,#1e3a8a)",
          color: "#e0f2fe",
          fontWeight: 600,
        }}
      >
        {aiLoading ? "Analyzing vendors…" : "✨ Run AI Vendor Analysis"}
      </button>

      {error && <div style={{ marginTop: 14, color: "#fca5a5" }}>{error}</div>}
    </div>
  );
}
