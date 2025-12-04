// components/rules/AiRuleBuilderPanel.js
// AI Rule Builder V6 — Natural Language Rule Lab

import { useState } from "react";

export default function AiRuleBuilderPanel({ orgId }) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function runBuilder() {
    if (!prompt.trim()) {
      setError("Describe your insurance requirements first.");
      return;
    }

    setError("");
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/rules/ai-build-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, prompt }),
      });

      const json = await res.json();
      if (!json.ok) {
        throw new Error(json.error || "AI Rule Builder failed.");
      }

      setResult(json);
    } catch (err) {
      console.error("[AiRuleBuilderPanel] ERROR:", err);
      setError(err.message || "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        borderRadius: 20,
        padding: 20,
        background: "rgba(15,23,42,0.96)",
        border: "1px solid rgba(51,65,85,0.9)",
        boxShadow: "0 18px 40px rgba(0,0,0,0.75)",
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
        AI Rule Builder Lab
      </h2>

      <p
        style={{
          fontSize: 13,
          color: "#9ca3af",
          marginBottom: 8,
        }}
      >
        Describe your insurance requirements in plain English. The AI will
        generate rule groups and rules_v3 records and save them automatically
        for this organization.
      </p>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder={`Example: 
"Require GL $1M each occurrence and $2M aggregate, Auto $1M combined, WC required. 
Roofing contractors need $5M umbrella. Additional insured and waiver of subrogation required on GL and Auto."`}
        style={{
          width: "100%",
          minHeight: 140,
          borderRadius: 14,
          padding: 10,
          border: "1px solid rgba(71,85,105,0.9)",
          background: "rgba(2,6,23,0.6)",
          color: "#e5e7eb",
          fontSize: 13,
          fontFamily: "system-ui",
          resize: "vertical",
        }}
      />

      {error && (
        <div
          style={{
            marginTop: 8,
            fontSize: 13,
            color: "#fca5a5",
          }}
        >
          ❌ {error}
        </div>
      )}

      <button
        onClick={runBuilder}
        disabled={loading}
        style={{
          marginTop: 12,
          padding: "8px 14px",
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
        {loading ? "Generating & saving rules…" : "🧠 Generate Rules with AI"}
      </button>

      {loading && (
        <div
          style={{
            marginTop: 10,
            fontSize: 12,
            color: "#9ca3af",
          }}
        >
          AI is building rule groups and saving them to the database. This may
          take a few seconds…
        </div>
      )}

      {result && result.savedGroups && (
        <div
          style={{
            marginTop: 20,
          }}
        >
          <h3
            style={{
              marginTop: 0,
              fontSize: 15,
              fontWeight: 600,
              color: "#e5e7eb",
            }}
          >
            ✅ Rules Created & Saved
          </h3>
          <p style={{ fontSize: 12, color: "#9ca3af" }}>
            The following rule groups and rules_v3 records were created for this
            org. You can review and tweak them in the Requirements page.
          </p>

          {result.savedGroups.map((g, idx) => (
            <div
              key={idx}
              style={{
                marginTop: 12,
                padding: 12,
                borderRadius: 14,
                background: "rgba(2,6,23,0.7)",
                border: "1px solid rgba(71,85,105,0.9)",
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#e5e7eb",
                  marginBottom: 4,
                }}
              >
                {g.group.label}{" "}
                <span
                  style={{
                    fontSize: 11,
                    color: "#facc15",
                    marginLeft: 6,
                  }}
                >
                  [{g.group.severity?.toUpperCase()}]
                </span>
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "#9ca3af",
                  marginBottom: 6,
                }}
              >
                {g.group.description}
              </div>

              {g.rules.map((r, i) => (
                <div
                  key={i}
                  style={{
                    padding: "6px 8px",
                    marginTop: 4,
                    borderRadius: 10,
                    background: "rgba(15,23,42,0.95)",
                    border: "1px solid rgba(51,65,85,0.9)",
                    fontSize: 12,
                    color: "#e5e7eb",
                  }}
                >
                  <strong>{r.type.toUpperCase()}</strong> — {r.message}
                  <br />
                  <span style={{ fontSize: 11, color: "#9ca3af" }}>
                    Field: {r.field} · Condition: {r.condition} · Value:{" "}
                    {r.value} · Severity: {r.severity}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
