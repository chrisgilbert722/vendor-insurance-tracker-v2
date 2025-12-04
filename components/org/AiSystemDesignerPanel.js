// components/org/AiSystemDesignerPanel.js
// ORG BRAIN V1 — AI System Designer Control Panel (Cinematic Cockpit)

import { useState } from "react";

export default function AiSystemDesignerPanel({ orgId }) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [systemResult, setSystemResult] = useState(null);
  const [error, setError] = useState("");

  async function runOrgBrain() {
    if (!prompt.trim()) {
      setError("Describe how you want your compliance system to operate.");
      return;
    }

    setError("");
    setLoading(true);
    setSystemResult(null);

    try {
      const res = await fetch("/api/org/ai-system-designer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, prompt }),
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "AI System Designer failed.");

      setSystemResult(json);
    } catch (err) {
      console.error("[OrgBrain] ERROR:", err);
      setError(err.message || "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        borderRadius: 24,
        padding: 20,
        background: "rgba(15,23,42,0.97)",
        border: "1px solid rgba(71,85,105,0.9)",
        boxShadow: "0 22px 55px rgba(0,0,0,0.75)",
      }}
    >
      {/* TITLE */}
      <h2
        style={{
          marginTop: 0,
          fontSize: 18,
          fontWeight: 600,
          color: "#e5e7eb",
        }}
      >
        AI System Designer
      </h2>

      <p
        style={{
          fontSize: 13,
          color: "#9ca3af",
          marginBottom: 10,
        }}
      >
        Describe the type of organization you are, your risk philosophy, or the
        insurance standards you want enforced. The AI will rebuild or optimize
        your entire compliance system automatically.
      </p>

      {/* PROMPT BOX */}
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder={`Examples:\n
“We are a commercial general contractor. Build strict GL/Auto/WC rules, umbrella $5M, AI/WS endorsements required, 30-day notice, 7/3/1 renewal escalation.”\n
“Optimize our system to reduce high-risk vendors. Increase WC strictness, require higher umbrella for roofers.”\n
“Design a compliance program for property managers with standard $1M limits and faster renewals.”`}
        style={{
          width: "100%",
          minHeight: 150,
          padding: 12,
          borderRadius: 18,
          border: "1px solid rgba(71,85,105,0.9)",
          background: "rgba(2,6,23,0.6)",
          color: "#e5e7eb",
          fontSize: 13,
          resize: "vertical",
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont",
        }}
      />

      {/* ERRORS */}
      {error && (
        <div
          style={{
            marginTop: 10,
            fontSize: 13,
            color: "#fca5a5",
          }}
        >
          ❌ {error}
        </div>
      )}

      {/* RUN BUTTON */}
      <button
        onClick={runOrgBrain}
        disabled={loading}
        style={{
          marginTop: 14,
          padding: "10px 16px",
          borderRadius: 999,
          border: "1px solid rgba(168,85,247,0.8)",
          background:
            "radial-gradient(circle at top left,#a855f7,#7e22ce,#2e1065)",
          color: "#f3e8ff",
          fontSize: 13,
          fontWeight: 600,
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Designing your compliance system…" : "🧠 Rebuild System with AI"}
      </button>

      {/* LOADING INDICATOR */}
      {loading && (
        <div
          style={{
            marginTop: 10,
            padding: 12,
            borderRadius: 14,
            border: "1px solid rgba(71,85,105,0.9)",
            background: "rgba(2,6,23,0.65)",
            fontSize: 13,
            color: "#9ca3af",
          }}
        >
          AI Org Brain is analyzing your organization, risk profile, rules,
          vendor categories, and workflows.  
          <br />
          This may take 10–20 seconds.
        </div>
      )}

      {/* RESULTS */}
      {systemResult && (
        <div style={{ marginTop: 28 }}>
          <h3
            style={{
              fontSize: 16,
              fontWeight: 600,
              marginBottom: 6,
              color: "#e5e7eb",
            }}
          >
            ✅ System Reconstructed
          </h3>

          <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 16 }}>
            These are the changes the AI applied to your organization.
          </p>

          {/* SUMMARY BLOCK */}
          <div
            style={{
              padding: 14,
              borderRadius: 16,
              background: "rgba(2,6,23,0.65)",
              border: "1px solid rgba(71,85,105,0.9)",
              marginBottom: 18,
            }}
          >
            <h4
              style={{
                margin: 0,
                marginBottom: 6,
                fontSize: 15,
                fontWeight: 600,
              }}
            >
              🧾 AI Summary
            </h4>
            <div
              style={{
                fontSize: 13,
                lineHeight: 1.5,
                whiteSpace: "pre-wrap",
                color: "#cbd5f5",
              }}
            >
              {systemResult.summary}
            </div>
          </div>

          {/* RULE GROUPS */}
          <div>
            <h4 style={{ fontSize: 15, fontWeight: 600 }}>📘 Rule Groups Created</h4>
            {systemResult.ruleGroups?.map((g, idx) => (
              <div
                key={idx}
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 16,
                  background: "rgba(2,6,23,0.7)",
                  border: "1px solid rgba(71,85,105,0.9)",
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#e5e7eb",
                    marginBottom: 6,
                  }}
                >
                  {g.label}{" "}
                  <span
                    style={{
                      fontSize: 11,
                      color: "#a5b4fc",
                      marginLeft: 4,
                    }}
                  >
                    [{g.severity}]
                  </span>
                </div>

                <div
                  style={{
                    fontSize: 12,
                    color: "#9ca3af",
                    marginBottom: 6,
                  }}
                >
                  {g.description}
                </div>

                {g.rules.map((r, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "6px 8px",
                      borderRadius: 12,
                      marginTop: 6,
                      background: "rgba(15,23,42,0.95)",
                      border: "1px solid rgba(51,65,85,0.9)",
                      fontSize: 12,
                      color: "#e5e7eb",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    <strong>{r.type.toUpperCase()}</strong> — {r.message}
                    <br />
                    <span style={{ fontSize: 11, color: "#9ca3af" }}>
                      Field: {r.field} · Condition: {r.condition} · Value: {r.value} · Severity:{" "}
                      {r.severity}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* TEMPLATES */}
          <div style={{ marginTop: 28 }}>
            <h4 style={{ fontSize: 15, fontWeight: 600 }}>✉️ Communication Templates</h4>

            {Object.entries(systemResult.templates || {}).map(([key, val]) => (
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
                <strong style={{ textTransform: "capitalize", fontSize: 13 }}>
                  {key.replace(/([A-Z])/g, " $1")}
                </strong>

                <pre
                  style={{
                    marginTop: 6,
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
        </div>
      )}
    </div>
  );
}
