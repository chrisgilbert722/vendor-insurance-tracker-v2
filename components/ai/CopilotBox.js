// components/ai/CopilotBox.js

import { useState, useRef, useEffect } from "react";

export default function CopilotBox({
  persona = "admin", // admin | vendor | broker
  orgId,
  vendorId = null,
  policyId = null,
  onClose,
}) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        persona === "vendor"
          ? "Hi! I'm your Compliance Copilot. I can guide you through exactly what’s missing or what needs to be fixed with your insurance. What do you need help with?"
          : persona === "broker"
          ? "I'm the Compliance Copilot. I can explain required coverage, missing endorsements, or what needs updating on the COI. How can I help?"
          : "I'm Compliance Copilot. I can help you analyze renewals, explain alerts, or summarize vendor compliance. What would you like to do?",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const bottomRef = useRef();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage() {
    if (!input.trim()) return;

    const userMsg = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/copilot-renewal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          persona,
          orgId,
          vendorId,
          policyId,
          message: input,
        }),
      });

      const data = await res.json();

      if (data.ok) {
        const botMsg = { role: "assistant", content: data.reply };
        setMessages((prev) => [...prev, botMsg]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Error: " + data.error },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Network error. Try again." },
      ]);
    }

    setLoading(false);
  }

  function handleKey(e) {
    if (e.key === "Enter" && !loading) sendMessage();
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        width: 380,
        height: 520,
        borderRadius: 18,
        background: "rgba(15,23,42,0.92)",
        border: "1px solid rgba(56,189,248,0.35)",
        boxShadow: "0 0 35px rgba(56,189,248,0.25)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        zIndex: 9999,
        backdropFilter: "blur(12px)",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid rgba(56,189,248,0.25)",
          fontSize: 14,
          fontWeight: 600,
          color: "#38bdf8",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background:
            "linear-gradient(90deg,rgba(15,23,42,0.98),rgba(17,24,39,0.95))",
        }}
      >
        Compliance Copilot
        <button
          onClick={onClose}
          style={{
            border: "none",
            background: "transparent",
            color: "#94a3b8",
            fontSize: 16,
            cursor: "pointer",
          }}
        >
          ✕
        </button>
      </div>

      {/* MESSAGE FEED */}
      <div
        style={{
          flex: 1,
          padding: "12px 16px",
          overflowY: "auto",
          color: "#e5e7eb",
        }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              marginBottom: 12,
              display: "flex",
              flexDirection: "column",
              alignItems: m.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                maxWidth: "85%",
                padding: "8px 12px",
                borderRadius: 10,
                whiteSpace: "pre-wrap",
                background:
                  m.role === "user"
                    ? "linear-gradient(90deg,#0ea5e9,#2563eb)"
                    : "rgba(30,41,59,0.85)",
                border:
                  m.role === "assistant"
                    ? "1px solid rgba(56,189,248,0.35)"
                    : "none",
                color: m.role === "user" ? "white" : "#e5e7eb",
                boxShadow:
                  m.role === "assistant"
                    ? "0 0 12px rgba(56,189,248,0.15)"
                    : "none",
              }}
            >
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div
            style={{
              color: "#94a3b8",
              fontSize: 12,
              marginTop: 10,
            }}
          >
            Copilot is thinking…
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* INPUT BAR */}
      <div
        style={{
          padding: "8px",
          borderTop: "1px solid rgba(56,189,248,0.25)",
          background: "rgba(15,23,42,0.9)",
          display: "flex",
          gap: 6,
        }}
      >
        <input
          value={input}
          onKeyDown={handleKey}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question…"
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: 12,
            background: "rgba(15,23,42,0.95)",
            border: "1px solid rgba(56,189,248,0.35)",
            color: "#e5e7eb",
            fontSize: 13,
            outline: "none",
          }}
        />

        <button
          onClick={sendMessage}
          disabled={loading}
          style={{
            padding: "8px 14px",
            borderRadius: 12,
            background: loading
              ? "rgba(56,189,248,0.25)"
              : "linear-gradient(90deg,#38bdf8,#0ea5e9)",
            color: "white",
            fontSize: 13,
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            border: "1px solid rgba(56,189,248,0.6)",
          }}
        >
          ➤
        </button>
      </div>
    </div>
  );
}
