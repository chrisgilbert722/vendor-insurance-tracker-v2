// components/ai/CopilotBox.js

import { useState, useRef, useEffect } from "react";

export default function CopilotBox({
  persona = "admin",
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
          ? "Hi! I'm your Compliance Copilot. You can ask me anything — or upload a document and I’ll read it for you."
          : persona === "broker"
          ? "Upload a COI or endorsement and I’ll tell you exactly what needs correcting."
          : "I'm Compliance Copilot. Ask me anything — or upload a document for analysis.",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [docLoading, setDocLoading] = useState(false);

  const bottomRef = useRef();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, docLoading]);

  /* ==========================================
     SEND TEXT MESSAGE
  ========================================== */
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

      const botMsg = {
        role: "assistant",
        content: data.reply || "I couldn't process that.",
      };

      setMessages((prev) => [...prev, botMsg]);
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

  /* ==========================================
     DOCUMENT UPLOAD → AI DOCUMENT ENGINE
  ========================================== */
  async function handleDocumentUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setDocLoading(true);

    const form = new FormData();
    form.append("file", file);
    form.append("orgId", orgId);
    form.append("vendorId", vendorId || "");
    form.append("policyId", policyId || "");

    // Show immediate placeholder in chat
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: `Uploaded document: ${file.name}`,
      },
      {
        role: "assistant",
        content: `Analyzing **${file.name}**… This may take a few seconds.`,
      },
    ]);

    try {
      const res = await fetch("/api/ai/copilot-doc-intake", {
        method: "POST",
        body: form,
      });
      const data = await res.json();

      if (!data.ok) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Document analysis failed." },
        ]);
      } else {
        // Show AI results
        const docMsg = {
          role: "assistant",
          content:
            "📄 **Document Analysis Result:**\n\n```json\n" +
            JSON.stringify(data.extracted, null, 2) +
            "\n```\n\n" +
            data.raw,
        };

        setMessages((prev) => [...prev, docMsg]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Upload error. Try again." },
      ]);
    }

    setDocLoading(false);
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
              }}
            >
              {m.content}
            </div>
          </div>
        ))}

        {(loading || docLoading) && (
          <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 10 }}>
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
        {/* Document Input */}
        <label
          style={{
            padding: "8px 12px",
            borderRadius: 12,
            background: "rgba(56,189,248,0.25)",
            color: "#38bdf8",
            fontWeight: 600,
            fontSize: 12,
            cursor: "pointer",
            border: "1px solid rgba(56,189,248,0.5)",
            display: "flex",
            alignItems: "center",
          }}
        >
          📁 Upload
          <input
            type="file"
            style={{ display: "none" }}
            onChange={handleDocumentUpload}
          />
        </label>

        {/* Text Input */}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask something…"
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
          disabled={loading || docLoading}
          style={{
            padding: "8px 14px",
            borderRadius: 12,
            background:
              loading || docLoading
                ? "rgba(56,189,248,0.25)"
                : "linear-gradient(90deg,#38bdf8,#0ea5e9)",
            color: "white",
            fontSize: 13,
            fontWeight: 600,
            cursor: loading || docLoading ? "not-allowed" : "pointer",
            border: "1px solid rgba(56,189,248,0.6)",
          }}
        >
          ➤
        </button>
      </div>
    </div>
  );
}
