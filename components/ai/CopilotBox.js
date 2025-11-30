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
          ? "Hi! I'm your Compliance Copilot. You can upload documents or ask me what to fix. You can also click **Fix My Compliance** and I’ll walk you through everything step-by-step."
          : persona === "broker"
          ? "Upload a COI or endorsement and I’ll tell you exactly what needs correcting — or just ask me anything."
          : "I'm Compliance Copilot. Ask me anything — or upload a document for instant analysis.",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [docLoading, setDocLoading] = useState(false);
  const [fixLoading, setFixLoading] = useState(false);

  const bottomRef = useRef();

  const scrollToBottom = () =>
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, docLoading, fixLoading]);

  /* =====================================================
     GLOBAL UPLOADER TRIGGER (FEATURE F)
  ===================================================== */
  function triggerUploader(action) {
    const map = {
      gl: "/upload-coi?type=gl",
      wc: "/upload-coi?type=wc",
      auto: "/upload-coi?type=auto",
      umbrella: "/upload-coi?type=umbrella",
      generic: "/upload-coi",
    };

    const url = map[action] || "/upload-coi";
    window.location.href = url;
  }

  /* =====================================================
     SEND TEXT MESSAGE
  ===================================================== */
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

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply || "I couldn't process that.",
        },
      ]);
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

  /* =====================================================
     DOCUMENT UPLOAD → UACC DOC ENGINE
  ===================================================== */
  async function handleDocumentUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setDocLoading(true);

    const form = new FormData();
    form.append("file", file);
    form.append("orgId", orgId);
    form.append("vendorId", vendorId || "");
    form.append("policyId", policyId || "");

    setMessages((prev) => [
      ...prev,
      { role: "user", content: `Uploaded: **${file.name}**` },
      {
        role: "assistant",
        content: `Analyzing **${file.name}**… please wait.`,
      },
    ]);

    try {
      const res = await fetch("/api/ai/copilot-doc-intake", {
        method: "POST",
        body: form,
      });

      const data = await res.json();

      const block =
        "📄 **Document Analysis**\n\n```json\n" +
        JSON.stringify(data.extracted, null, 2) +
        "\n```\n\n" +
        data.raw;

      setMessages((prev) => [...prev, { role: "assistant", content: block }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Upload failed. Try again." },
      ]);
    }

    setDocLoading(false);
  }

  /* =====================================================
     VENDOR FIX MODE  — WITH AUTO-UPLOADER TRIGGER (F)
  ===================================================== */
  async function runFixMode() {
    if (!vendorId) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "I need a vendor ID to run Fix Mode." },
      ]);
      return;
    }

    setFixLoading(true);

    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content:
          "🛠 **Checking what’s wrong…**\nReviewing your documents, rules, alerts, and compliance history…",
      },
    ]);

    try {
      const res = await fetch("/api/ai/vendor-fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, vendorId, policyId }),
      });

      const data = await res.json();

      if (!data.ok) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "I couldn’t generate fix steps. Try again.",
          },
        ]);
      } else {
        const { fixMode } = data;

        // Render fix steps block
        const block =
          "🛠 **Vendor Fix Plan**\n\n" +
          "### Summary\n" +
          fixMode.plain_english_summary +
          "\n\n### Why You're Not Compliant\n" +
          fixMode.why_non_compliant.map((x) => `- ${x}`).join("\n") +
          "\n\n### Fix Steps\n" +
          fixMode.fix_steps
            .map(
              (step) =>
                `**${step.title}**\n${step.step_by_step
                  .map((s) => `- ${s}`)
                  .join("\n")}`
            )
            .join("\n\n") +
          "\n\n### Upload Requirements\n" +
          fixMode.upload_requirements.map((x) => `- ${x}`).join("\n") +
          "\n\n### Broker Email\n```\n" +
          fixMode.sample_broker_email +
          "\n```\n";

        setMessages((prev) => [...prev, { role: "assistant", content: block }]);

        // 🔥 AUTO-UPLOADER TRIGGER (Feature F)
        if (fixMode.upload_action) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `Opening upload screen for **${fixMode.upload_action.toUpperCase()}**…`,
            },
          ]);

          setTimeout(() => triggerUploader(fixMode.upload_action), 1500);
        }
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Fix Mode failed. Try again." },
      ]);
    }

    setFixLoading(false);
  }

  /* =====================================================
     MAIN UI
  ===================================================== */
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

        {(loading || docLoading || fixLoading) && (
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
        {/* DOCUMENT UPLOAD */}
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

        {/* FIX MY COMPLIANCE */}
        {persona === "vendor" && (
          <button
            onClick={runFixMode}
            disabled={fixLoading}
            style={{
              padding: "8px 12px",
              borderRadius: 12,
              background: "rgba(34,197,94,0.3)",
              border: "1px solid rgba(34,197,94,0.5)",
              color: "#34d399",
              fontWeight: 600,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            🛠 Fix My Compliance
          </button>
        )}

        {/* TEXT INPUT */}
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

        {/* SEND */}
        <button
          onClick={sendMessage}
          disabled={loading || docLoading || fixLoading}
          style={{
            padding: "8px 14px",
            borderRadius: 12,
            background:
              loading || docLoading || fixLoading
                ? "rgba(56,189,248,0.25)"
                : "linear-gradient(90deg,#38bdf8,#0ea5e9)",
            color: "white",
            fontSize: 13,
            fontWeight: 600,
            cursor:
              loading || docLoading || fixLoading ? "not-allowed" : "pointer",
            border: "1px solid rgba(56,189,248,0.6)",
          }}
        >
          ➤
        </button>
      </div>
    </div>
  );
}
