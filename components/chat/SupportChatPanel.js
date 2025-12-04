// components/chat/SupportChatPanel.js
import { useState } from "react";
import { useRouter } from "next/router";
import { useOrg } from "../../context/OrgContext";

const GP = {
  panelBg: "rgba(15,23,42,0.98)",
  border: "1px solid rgba(51,65,85,0.9)",
  text: "#e5e7eb",
  textSoft: "#9ca3af",
};

export default function SupportChatPanel() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hey there 👋 I’m your AI assistant. Ask me about renewals, alerts, vendors, rules, or where to click next.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const router = useRouter();
  const { activeOrgId } = useOrg() || {};

  async function sendMessage(forcedMessage = null) {
    const content = forcedMessage || input.trim();
    if (!content) return;

    const userMessage = { role: "user", content };
    setMessages((prev) => [...prev, userMessage]);

    if (!forcedMessage) setInput("");

    try {
      setSending(true);

      const res = await fetch("/api/chat/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          orgId: activeOrgId || null,
          vendorId: null, 
          path: router.pathname,
        }),
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Chat failed");

      const reply = {
        role: "assistant",
        content: json.reply || "Sorry, I couldn’t generate a response.",
      };
      setMessages((prev) => [...prev, reply]);
    } catch (err) {
      console.error("[SupportChatPanel] error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Something went wrong on my side. Try again in a moment or contact support.",
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
        onClick={() => setOpen((o) => !o)}
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
            maxHeight: 520,
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
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <div>
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
              <div
                style={{
                  fontSize: 12,
                  color: "#e5e7eb",
                }}
              >
                Ask me anything about your vendors, renewals, alerts, or rules.
              </div>
            </div>
          </div>

          {/* ⭐ QUICK ACTION BUTTONS */}
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
            <button
              onClick={() =>
                sendMessage("Explain this vendor's risk score in simple terms.")
              }
              style={quickBtn}
            >
              ⚠️ Risk Score
            </button>

            <button
              onClick={() =>
                sendMessage("Why did this vendor fail compliance?")
              }
              style={quickBtn}
            >
              📘 Rule Failures
            </button>

            <button
              onClick={() => sendMessage("Explain this vendor's alerts.")}
              style={quickBtn}
            >
              🔔 Alerts
            </button>

            <button
              onClick={() =>
                sendMessage("Explain this vendor’s renewal prediction.")
              }
              style={quickBtn}
            >
              🔮 Prediction
            </button>

            <button
              onClick={() =>
                sendMessage(
                  "Generate a broker email requesting an updated COI with missing items highlighted."
                )
              }
              style={quickBtn}
            >
              📧 Broker Email
            </button>

            <button
              onClick={() =>
                sendMessage(
                  "Generate a vendor fix request email listing missing or incorrect insurance items."
                )
              }
              style={quickBtn}
            >
              🛠️ Fix Email
            </button>

            <button
              onClick={() =>
                sendMessage(
                  "What should I do next for this vendor based on their compliance and renewal status?"
                )
              }
              style={quickBtn}
            >
              ▶️ Next Steps
            </button>
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
            {messages.map((m, idx) => {
              const isUser = m.role === "user";
              return (
                <div
                  key={idx}
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
                    fontSize: 12,
                    whiteSpace: "pre-wrap",
                    color: "#e5e7eb",
                  }}
                >
                  {m.content}
                </div>
              );
            })}

            {sending && (
              <div
                style={{
                  fontSize: 11,
                  color: GP.textSoft,
                  marginTop: 4,
                }}
              >
                Thinking…
              </div>
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
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about alerts, renewals, rules..."
              style={{
                flex: 1,
                resize: "none",
                borderRadius: 10,
                padding: "6px 8px",
                border: "1px solid rgba(51,65,85,0.9)",
                background: "rgba(15,23,42,0.98)",
                color: "#e5e7eb",
                fontSize: 12,
                fontFamily:
                  "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI",
                minHeight: 38,
                maxHeight: 80,
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

/* ⭐ Quick Action Button Style */
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
