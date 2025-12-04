// components/renewals/RenewalInlineCopilot.js

import { useState } from "react";

export default function RenewalInlineCopilot({ orgId }) {
  const [input, setInput] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  async function ask() {
    if (!input.trim() || !orgId) return;
    setLoading(true);
    setAnswer("");

    try {
      const res = await fetch("/api/ai/renewal-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, question: input }),
      });
      const data = await res.json();
      if (data.ok) setAnswer(data.reply);
    } catch (err) {
      setAnswer("Error: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e) {
    if (e.key === "Enter") ask();
  }

  return (
    <div
      style={{
        marginTop: 20,
        borderRadius: 18,
        padding: 12,
        background: "rgba(15,23,42,0.96)",
        border: "1px solid rgba(148,163,184,0.4)",
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: "#9ca3af",
          marginBottom: 6,
        }}
      >
        Ask AI about renewals (e.g. "Which vendors are highest risk in 7 days?")
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask a question…"
          style={{
            flex: 1,
            padding: "8px 10px",
            borderRadius: 10,
            border: "1px solid rgba(51,65,85,0.9)",
            background: "rgba(15,23,42,0.95)",
            color: "#e5e7eb",
            fontSize: 12,
          }}
        />
        <button
          onClick={ask}
          disabled={loading}
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid rgba(56,189,248,0.9)",
            background:
              "linear-gradient(90deg,#0ea5e9,#38bdf8,#0f172a)",
            color: "white",
            fontSize: 12,
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Thinking…" : "Ask"}
        </button>
      </div>

      {answer && (
        <div
          style={{
            marginTop: 8,
            fontSize: 12,
            color: "#e5e7eb",
            whiteSpace: "pre-wrap",
          }}
        >
          {answer}
        </div>
      )}
    </div>
  );
}
