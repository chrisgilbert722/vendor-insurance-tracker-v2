// components/chat/SupportChatPanel.js
import { useState } from "react";

const GP = {
  panelBg: "rgba(15,23,42,0.98)",
  border: "1px solid rgba(51,65,85,0.9)",
  text: "#e5e7eb",
  textSoft: "#9ca3af",
};

export default function SupportChatPanel({ orgId, vendorId, pathname }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        vendorId
          ? "You're viewing a specific vendor — ask me why they failed, their risk score, or what to do next."
          : "Hey there 👋 I’m your AI assistant. Ask me about renewals, alerts, vendors, rules, or where to click next.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  async function sendMessage(forcedText = null) {
    const content = forcedText || input.trim();
    if (!content) return;

    const userMessage = { role: "user", content };
    setMessages((prev) => [...prev, userMessage]);
    if (!forcedText) setInput("");

    try {
      setSending(true);

      const res = await fetch("/api/chat/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          orgId: orgId || null,
          vendorId: vendorId || null,
          path: pathname,
        }),
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Chat failed");

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: json.reply || "I couldn't generate a response.",
        },
      ]);
    } catch (err) {
      console.error("[ChatBot] ERROR:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Something went wrong. Try again shortly.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!sending) sendMessage();
    }
  }

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: "fixed",
          right: 24,
          bottom: 24,
          zIndex: 50,
          width: 54,
          height: 54,
          borderRadius: "999px",
          border: "1px solid rgba(56,189,248,0.9)",
          background:
            "radial-gradient(circle at top left,#38bdf8,#0ea5e9,#0f172a)",
          color: "#e0f2fe",
          fontSize: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow:
            "0 0 25px rgba(56,189,248,0.7), 0 0 40px rgba(15,23,42,0.9)",
          cursor: "pointer",
        }}
      >
        {open ? "✖️" : "💬"}
      </button>

      {/* Panel */}
      {open && (
        <div
          style={{
            position: "fixed",
            right: 24,
            bottom: 90,
            width: 340,
            maxHeight: 540,
            borderRadius: 18,
            background: GP.panelBg,
            border: GP.border,
            boxShadow: "0 18px 45px rgba(0,0,0,0.85)",
            zIndex: 50,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "10px 12px",
              borderBottom: "1px solid rgba(51,65,85,0.9)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                color: GP.textSoft,
              }}
            >
              AI Assistant
            </div>

            <div style={{ fontSize: 12, color: "#e5e7eb" }}>
              {vendorId
                ? "Ask me about this vendor’s alerts, rules, renewal prediction, or what to do next."
                : "Ask me anything about renewals, alerts, vendors, or rules."}
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div
            style={{
              padding: "8px 10px",
              borderBottom: "1px solid rgba(51,65,85,0.9)",
              background: "rgba(15,23,42,0.96)",
              display: "flex",
              flexWrap: "wrap",
              gap: "6px",
            }}
          >
            {vendorId && (
              <>
                <button
                  style={quickBtn}
                  onClick={() => sendMessage("Explain this vendor's risk score.")}
                >
                  ⚠️ Risk Score
                </button>

                <button
                  style={quickBtn}
                  onClick={() =>
                    sendMessage("Why did this vendor fail compliance?")
                  }
                >
                  📘 Rule Failures
                </button>

                <button
                  style={quickBtn}
                  onClick={() => sendMessage("Explain this vendor’s alerts.")}
                >
                  🔔 Alerts
                </button>

                <button
                  style={quickBtn}
                  onClick={() =>
                    sendMessage("Explain this vendor’s renewal prediction.")
                  }
                >
                  🔮 Prediction
                </button>

                <button
                  style={quickBtn}
                  onClick={() =>
                    sendMessage(
                      "Generate an email to the broker requesting updated COI with missing items listed."
                    )
                  }
                >
                  📧 Broker Email
                </button>

                <button
                  style={quickBtn}
                  onClick={() =>
                    sendMessage(
                      "Generate a fix request email listing missing or incorrect insurance items."
                    )
                  }
                >
                  🛠️ Fix Email
                </button>

                <button
                  style={quickBtn}
                  onClick={() =>
                    sendMessage(
                      "What should I do next for this vendor based on their compliance and renewal status?"
                    )
                  }
                >
                  ▶️ Next Steps
                </button>
              </>
            )}

            {!vendorId && (
              <>
                <button
                  style={quickBtn}
                  onClick={() =>
                    sendMessage("Show me all severe or high-risk vendors.")
                  }
                >
                  🔥 High-Risk Vendors
                </button>
                <button
                  style={quickBtn}
                  onClick={() =>
                    sendMessage("Explain how renewal predictions work.")
                  }
                >
                  🔮 Prediction Help
                </button>
                <button
                  style={quickBtn}
                  onClick={() =>
                    sendMessage("How do I upload a COI or contact a vendor?")
                  }
                >
                  📄 COI Help
                </button>
              </>
            )}
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              padding: "10px 10px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {messages.map((m, i) => {
              const isUser = m.role === "user";
              return (
                <div
                  key={i}
                  style={{
                    alignSelf: isUser ? "flex-end" : "flex-start",
                    maxWidth: "80%",
                    padding: "8px 10px",
                    borderRadius: 12,
                    background: isUser
                      ? "rgba(37,99,235,0.9)"
                      : "rgba(15,23,42,0.98)",
                    border: isUser
                      ? "1px solid rgba(129,140,248,0.8)"
                      : "1px solid rgba(51,65,85,0.9)",
                    color: "#e5e7eb",
                    fontSize: 12,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {m.content}
                </div>
              );
            })}

            {sending && (
              <div style={{ fontSize: 11, color: GP.textSoft }}>Thinking…</div>
            )}
          </div>

          {/* Input */}
          <div
            style={{
              borderTop: "1px solid rgba(51,65,85,0.9)",
              padding: 8,
              display: "flex",
              gap: 6,
            }}
          >
            <textarea
              value={input}
              placeholder={
                vendorId
                  ? "Ask about this vendor's rules, alerts, renewals..."
                  : "Ask anything about compliance or renewals..."
              }
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{
                flex: 1,
                resize: "none",
                borderRadius: 10,
                padding: "6px 8px",
                border: "1px solid rgba(51,65,85,0.9)",
                background: "rgba(15,23,42,0.98)",
                color: "#e5e7eb",
                fontSize: 12,
                minHeight: 38,
              }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={sending || !input.trim()}
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid rgba(34,197,94,0.9)",
                background:
                  "radial-gradient(circle at top left,#22c55e,#16a34a,#052e16)",
                color: "#ecfdf5",
                fontSize: 12,
                fontWeight: 600,
                cursor:
                  sending || !input.trim() ? "not-allowed" : "pointer",
              }}
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/* Quick Action Button Style */
const quickBtn = {
  padding: "4px 8px",
  borderRadius: 8,
  border: "1px solid rgba(56,189,248,0.5)",
  background: "rgba(15,23,42,0.9)",
  fontSize: 11,
  color: "#e5e7eb",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

