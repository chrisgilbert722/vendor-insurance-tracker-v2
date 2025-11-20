// components/elite/RuleEnginePanel.jsx
import { useState, useEffect } from "react";
import { marked } from "marked";
import ConditionBuilder from "./ConditionBuilder";

/* THEME */
const GP = {
  primary: "#0057FF",
  primaryDark: "#003BB3",
  accent1: "#00E0FF",
  accent2: "#8A2BFF",
  red: "#FF3B3B",
  orange: "#FF9800",
  yellow: "#FFC107",
  green: "#00C27A",
  ink: "#0D1623",
  inkSoft: "#64748B",
  surface: "#F7F9FC",
};

export default function RuleEnginePanel({
  selectedRule,
  onUpdateRule,
  onAIExpand,
}) {
  const [prompt, setPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiOutput, setAiOutput] = useState("");

  const handleAIGenerate = async () => {
    if (!prompt.trim()) return;

    setAiLoading(true);
    setAiOutput("");

    try {
      const res = await onAIExpand(prompt);
      setAiOutput(res || "");
    } catch (err) {
      console.error(err);
    }

    setAiLoading(false);
  };

  if (!selectedRule) {
    return (
      <div
        style={{
          width: "380px",
          background: "white",
          borderLeft: "1px solid #E0E6EF",
          padding: "25px",
        }}
      >
        <h2 style={{ fontSize: "20px", fontWeight: 600 }}>Rule Details</h2>
        <p style={{ marginTop: "10px", color: GP.inkSoft }}>
          Select a rule to edit.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        width: "380px",
        background: "white",
        borderLeft: "1px solid #E0E6EF",
        padding: "25px",
        overflowY: "auto",
      }}
    >
      {/* HEADER */}
      <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "15px" }}>
        Edit Rule
      </h2>

      {/* NAME */}
      <label style={{ fontSize: "14px", fontWeight: 600 }}>Rule Name</label>
      <input
        value={selectedRule.name}
        onChange={(e) => onUpdateRule(selectedRule.id, { name: e.target.value })}
        style={{
          width: "100%",
          marginTop: "6px",
          marginBottom: "15px",
          padding: "10px",
          borderRadius: "8px",
          border: "1px solid #D6DFEA",
        }}
      />

      {/* SEVERITY */}
      <label style={{ fontSize: "14px", fontWeight: 600 }}>Severity</label>
      <select
        value={selectedRule.severity}
        onChange={(e) =>
          onUpdateRule(selectedRule.id, { severity: e.target.value })
        }
        style={{
          width: "100%",
          marginTop: "6px",
          marginBottom: "15px",
          padding: "10px",
          borderRadius: "8px",
          border: "1px solid #D6DFEA",
        }}
      >
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
        <option value="critical">Critical</option>
      </select>

      {/* CONDITION BUILDER */}
      <ConditionBuilder
        rule={selectedRule}
        onUpdateRule={onUpdateRule}
      />

      {/* AI SECTION */}
      <div
        style={{
          marginTop: "25px",
          padding: "18px",
          borderRadius: "12px",
          background: "#F3F7FF",
          border: "1px solid #D9E4FF",
        }}
      >
        <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "10px" }}>
          AI Rule Expansion
        </h3>

        <textarea
          placeholder="Explain this rule in plain English..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          style={{
            width: "100%",
            height: "70px",
            padding: "10px",
            border: "1px solid #CDD9EE",
            borderRadius: "8px",
            marginBottom: "10px",
          }}
        />

        <button
          onClick={handleAIGenerate}
          disabled={aiLoading}
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: "8px",
            background: GP.primary,
            color: "white",
            fontWeight: 600,
            cursor: "pointer",
            opacity: aiLoading ? 0.6 : 1,
          }}
        >
          {aiLoading ? "Generating..." : "Expand with AI"}
        </button>

        {/* AI RESULT */}
        {aiOutput && (
          <div
            style={{
              marginTop: "15px",
              padding: "15px",
              borderRadius: "10px",
              background: "white",
              border: "1px solid #E6ECF5",
            }}
            dangerouslySetInnerHTML={{ __html: marked(aiOutput) }}
          />
        )}
      </div>
    </div>
  );
}
