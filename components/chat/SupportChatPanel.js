// components/chat/SupportChatPanel.js
// Global + Vendor Mode + Wizard Mode + Auto-Fix + Explain-This-Page Mode

import { useState, useEffect } from "react";

const GP = {
  panelBg: "rgba(15,23,42,0.98)",
  border: "1px solid rgba(51,65,85,0.9)",
  text: "#e5e7eb",
  textSoft: "#9ca3af",
};

export default function SupportChatPanel({ orgId, vendorId, pathname }) {
  const isWizard = pathname.startsWith("/onboarding");

  const [open, setOpen] = useState(false);

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: isWizard
        ? "Welcome to the AI Onboarding Wizard 🎉 Ask me about CSV format, industry requirements, or rule creation."
        : vendorId
        ? "You're viewing a specific vendor — ask me about compliance issues, rule failures, fix plans, or renewal risk."
        : "Hi! I'm your AI assistant. Ask me anything about compliance, renewals, vendors, or metrics on this page.",
    },
  ]);

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  // ⭐ Explain This Page: auto-send message when ❓ clicked
  useEffect(() => {
    const handler = () => {
      sendMessage(
        "Explain this page: what this screen shows, what each element means, and what actions I should take next based on the data."
      );
      if (!open) setOpen(true);
    };

    window.addEventListener("explain_page", handler);
    return () => window.removeEventListener("explain_page", handler);
  }, [open, messages]);

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
          wizardMode: isWizard,
        }),
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error);

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: json.reply || "I couldn't generate a response." },
      ]);
    } catch (err) {
      console.error("[ChatBot ERROR]:", err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong. Try again soon." },
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
      {/* Chat Icon */}
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
          background: "radial-gradient(circle at top left,#38bdf8,#0ea5e9,#0f172a)",
          color: "#e0f2fe",
          fontSize: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 0 25px rgba(56,189,248,0.7)",
          cursor: "pointer",
        }}
      >
        {open ? "✖️" : "💬"}
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            right: 24,
            bottom: 90,
            width: 340,
            maxHeight: 580,
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
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: GP.textSoft,
              }}
            >
              {isWizard
                ? "AI Onboarding Assistant"
                : vendorId
                ? "AI Vendor Analyst"
                : "AI Compliance Assistant"}
            </div>

            <div style={{ fontSize: 12, color: GP.text }}>
              {isWizard
                ? "Ask about CSV formatting, rule creation, industry standards, or next steps."
                : vendorId
                ? "Ask about alerts, rule failures, compliance status, or renewal risk."
                : "Ask anything about compliance, vendors, renewals, alerts, or this page."}
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div
            style={{
              padding: 8,
              borderBottom: "1px solid rgba(51,65,85,0.9)",
              background: "rgba(15,23,42,0.96)",
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
            }}
          >
            {/* Wizard Mode */}
            {isWizard && (
              <>
                <button style={quickBtn} onClick={() => sendMessage("Create an example vendor CSV.")}>
                  📝 Example CSV
                </button>

                <button style={quickBtn} onClick={() => sendMessage("Explain the rule groups AI generated.")}>
                  📘 Explain Rules
                </button>

                <button style={quickBtn} onClick={() => sendMessage("Generate a welcome email for new vendors.")}>
                  ✉️ Welcome Email
                </button>

                <button style={quickBtn} onClick={() => sendMessage("What coverages should my vendors have?")}>
                  🛡️ Coverage Guide
                </button>

                <button style={quickBtn} onClick={() => sendMessage("Walk me through onboarding.")}>
                  🚀 Walkthrough
                </button>

                <button style={quickBtn} onClick={() => sendMessage("Fix my CSV formatting.")}>
                  🛠️ Fix My CSV
                </button>
              </>
            )}

            {/* Vendor Mode */}
            {!isWizard && vendorId && (
              <>
                <button style={quickBtn} onClick={() => sendMessage("Explain this vendor's risk score.")}>
                  ⚠️ Risk Score
                </button>

                <button style={quickBtn} onClick={() => sendMessage("Why did this vendor fail compliance?")}>
                  📘 Rule Failures
                </button>

                <button style={quickBtn} onClick={() => sendMessage("Explain this vendor’s alerts.")}>
                  🔔 Alerts
                </button>

                <button style={quickBtn} onClick={() => sendMessage("Explain this vendor’s renewal prediction.")}>
                  🔮 Prediction
                </button>

                <button style={quickBtn} onClick={() => sendMessage("Draft an email to the broker requesting an updated COI.")}>
                  📧 Broker Email
                </button>

                <button style={quickBtn} onClick={() => sendMessage("Draft a fix request email listing all missing or insufficient items.")}>
                  🛠️ Fix Email
                </button>

                <button
                  style={{
                    ...quickBtn,
                    border: "1px solid rgba(248,113,113,0.9)",
                    color: "#fecaca",
                  }}
                  onClick={() =>
                    sendMessage(
                      "Auto-fix this vendor: summarize issues, create a fix plan, and generate vendor & broker email templates."
                    )
                  }
                >
                  🚀 Auto-Fix Vendor
                </button>

                <button style={quickBtn} onClick={() => sendMessage("What should I do next for this vendor?")}>
                  ▶️ Next Steps
                </button>
              </>
            )}

            {/* Global Mode */}
            {!isWizard && !vendorId && (
              <>
                <button style={quickBtn} onClick={() => sendMessage("Show me all high-risk vendors.")}>
                  🔥 High-Risk Vendors
                </button>
                <button style={quickBtn} onClick={() => sendMessage("Explain renewal prediction models.")}>
                  🔮 Prediction Help
                </button>
                <button style={quickBtn} onClick={() => sendMessage("How do I upload COIs?")}>
                  📄 COI Help
                </button>
              </>
            )}
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: 10,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "80%",
                  padding: "8px 10px",
                  borderRadius: 12,
                  background:
                    m.role === "user"
                      ? "rgba(37,99,235,0.9)"
                      : "rgba(15,23,42,0.98)",
                  border:
                    m.role === "user"
                      ? "1px solid rgba(129,140,248,0.8)"
                      : "1px solid rgba(51,65,85,0.9)",
                  color: "#e5e7eb",
                  whiteSpace: "pre-wrap",
                  fontSize: 12,
                }}
              >
                {m.content}
              </div>
            ))}

            {sending && <div style={{ fontSize: 11, color: GP.textSoft }}>Thinking…</div>}
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
                isWizard
                  ? "Ask onboarding questions…"
                  : vendorId
                  ? "Ask about this vendor…"
                  : "Ask anything…"
              }
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{
                flex: 1,
                resize: "none",
                borderRadius: 10,
                padding: 8,
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
                borderRadius: "999px",
                border: "1px solid rgba(34,197,94,0.9)",
                background: "radial-gradient(circle at top left,#22c55e,#16a34a,#052e16)",
                color: "#ecfdf5",
                fontSize: 12,
                fontWeight: 600,
                cursor: sending || !input.trim() ? "not-allowed" : "pointer",
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
