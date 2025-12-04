// components/onboarding/AiWizardPanel.js
// Full AI Onboarding Wizard Panel — 10 Minute Org Setup (with Industry Detection)

import { useState } from "react";

export default function AiWizardPanel({ orgId }) {
  const [csvText, setCsvText] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [error, setError] = useState("");

  // Handle CSV file upload
  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      setCsvText(ev.target.result);
    };
    reader.readAsText(file);
  }

  // Parse CSV text to simple vendor objects
  function parseCsv(text) {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const vendors = [];

    for (const line of lines) {
      const [name, email, category] = line.split(",").map((s) => s?.trim());
      if (!name) continue;

      vendors.push({
        name,
        email: email || "",
        category: category || "general",
      });
    }
    return vendors;
  }

  async function runAiWizard() {
    if (!csvText.trim()) {
      setError("Please paste or upload vendor CSV first.");
      return;
    }

    setError("");
    setLoading(true);
    setAiResult(null);

    try {
      const vendorCsv = parseCsv(csvText);

      const res = await fetch("/api/onboarding/ai-wizard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          vendorCsv,
        }),
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "AI Wizard failed");

      setAiResult(json);
    } catch (err) {
      console.error("[AI Wizard Error]", err);
      setError(err.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  async function finalizeRules() {
    alert(
      "✔ AI Onboarding Complete!\nRules and templates have already been stored in the database.\nYou can now proceed to Dashboard or Requirements."
    );
  }

  return (
    <div
      style={{
        padding: 20,
        borderRadius: 18,
        background: "rgba(15,23,42,0.94)",
        border: "1px solid rgba(51,65,85,0.9)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.55)",
      }}
    >
      {/* STEP 1: CSV INPUT */}
      <h2 style={{ marginTop: 0, fontSize: 18, fontWeight: 600 }}>
        Step 1 — Upload Vendor CSV
      </h2>

      <p style={{ fontSize: 13, color: "#9ca3af" }}>
        Format: <strong>Name, Email, Category</strong> per line.  
        Example: <em>Acme Plumbing, info@acme.com, contractor</em>
      </p>

      <textarea
        value={csvText}
        onChange={(e) => setCsvText(e.target.value)}
        placeholder="Paste your vendor CSV here..."
        style={{
          width: "100%",
          minHeight: 120,
          resize: "vertical",
          marginTop: 8,
          padding: 10,
          borderRadius: 12,
          border: "1px solid rgba(71,85,105,0.9)",
          background: "rgba(2,6,23,0.6)",
          color: "#e5e7eb",
          fontSize: 13,
          fontFamily: "system-ui",
        }}
      />

      <input
        type="file"
        accept=".csv,.txt"
        onChange={handleFileUpload}
        style={{ marginTop: 10 }}
      />

      {error && (
        <div style={{ marginTop: 10, color: "#fca5a5", fontSize: 13 }}>
          ❌ {error}
        </div>
      )}

      {/* RUN AI BUTTON */}
      <button
        onClick={runAiWizard}
        disabled={loading}
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
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Analyzing your vendors…" : "✨ Run AI Onboarding Wizard"}
      </button>

      {/* LOADING */}
      {loading && (
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
          AI is generating industry detection, rule groups, and templates…  
          <br />
          This may take 10–15 seconds.
        </div>
      )}

      {/* STEP 2 — RESULTS */}
      {aiResult && (
        <div style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>
            Step 2 — Review AI Configuration
          </h2>

          {/* SUMMARY */}
          <div
            style={{
              padding: 14,
              marginBottom: 18,
              borderRadius: 14,
              background: "rgba(2,6,23,0.65)",
              border: "1px solid rgba(71,85,105,0.9)",
            }}
          >
            <h3 style={{ margin: 0, marginBottom: 6, fontSize: 15 }}>
              🧠 AI Summary
            </h3>
            <div style={{ fontSize: 13, color: "#cbd5f5", lineHeight: 1.5 }}>
              {aiResult.summary}
            </div>
          </div>

          {/* ⭐ DETECTED INDUSTRIES BLOCK */}
          {aiResult.detectedIndustries &&
            aiResult.detectedIndustries.length > 0 && (
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
                <strong style={{ color: "#38bdf8" }}>Detected Industries:</strong>{" "}
                {aiResult.detectedIndustries.join(", ")}
              </div>
            )}

          {/* RULE GROUPS */}
          <div>
            <h3 style={{ fontSize: 15 }}>📘 Rule Groups (Generated)</h3>

            {aiResult.ruleGroups?.map((g, idx) => (
              <div
                key={idx}
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 14,
                  background: "rgba(2,6,23,0.6)",
                  border: "1px solid rgba(71,85,105,0.9)",
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 600 }}>{g.label}</div>
                <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8 }}>
                  {g.description}
                </div>

                {g.rules.map((r, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "6px 8px",
                      marginTop: 6,
                      borderRadius: 10,
                      background: "rgba(15,23,42,0.9)",
                      border: "1px solid rgba(51,65,85,0.9)",
                      fontSize: 12,
                      color: "#e5e7eb",
                    }}
                  >
                    <strong>{r.type.toUpperCase()}</strong> — {r.message}
                    <br />
                    <span style={{ color: "#9ca3af" }}>
                      Field: {r.field} · Condition: {r.condition} · Value:{" "}
                      {r.value} · Severity: {r.severity}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* EMAIL TEMPLATES */}
          <div style={{ marginTop: 28 }}>
            <h3 style={{ fontSize: 15 }}>✉️ Communication Templates</h3>

            {Object.entries(aiResult.templates || {}).map(([key, val]) => (
              <div
                key={key}
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 14,
                  background: "rgba(2,6,23,0.65)",
                  border: "1px solid rgba(71,85,105,0.9)",
                }}
              >
                <strong style={{ fontSize: 13, textTransform: "capitalize" }}>
                  {key.replace(/([A-Z])/g, " $1")}
                </strong>
                <pre
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    lineHeight: 1.4,
                    whiteSpace: "pre-wrap",
                    color: "#cbd5f5",
                  }}
                >
                  {val}
                </pre>
              </div>
            ))}
          </div>

          {/* COMPLETE BUTTON */}
          <button
            onClick={finalizeRules}
            style={{
              marginTop: 28,
              padding: "12px 20px",
              borderRadius: 999,
              border: "1px solid rgba(34,197,94,0.9)",
              background:
                "radial-gradient(circle at top left,#22c55e,#16a34a,#052e16)",
              color: "#ecfdf5",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              width: "100%",
            }}
          >
            ✔ Finish Setup & Activate Rules
          </button>
        </div>
      )}
    </div>
  );
}
