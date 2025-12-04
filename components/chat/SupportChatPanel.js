// components/chat/SupportChatPanel.js
// Ultimate AI Assistant v6 — Global, Vendor, Wizard, Explain, Auto-Fix, Org Brain, Proactive Onboarding

import { useState, useEffect } from "react";

const GP = {
  panelBg: "rgba(15,23,42,0.98)",
  border: "1px solid rgba(51,65,85,0.9)",
  text: "#e5e7eb",
  textSoft: "#9ca3af",
};

export default function SupportChatPanel({ orgId, vendorId, pathname }) {
  const isWizard = pathname?.startsWith("/onboarding");

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: isWizard
        ? "Welcome to the AI Onboarding Wizard 🎉 Ask me about CSV formatting, industry requirements, rule creation, or what to do next."
        : vendorId
        ? "You're viewing a specific vendor — ask me about compliance issues, rule failures, fix plans, or renewal risk."
        : "I'm your AI assistant. Ask me anything about compliance, renewals, vendors, rules, Org Brain, or this page.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  // Listen for Explain-This-Page events from ❓ button in Layout
  useEffect(() => {
    const handler = () => {
      sendMessage(
        "Explain this page in detail: what the panels and metrics mean, and what actions I should take next."
      );
      if (!open) setOpen(true);
    };

    window.addEventListener("explain_page", handler);
    return () => window.removeEventListener("explain_page", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        }),
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Chat failed");

      // ⭐ AUTO-LAUNCH WIZARD BEHAVIOR
      if (json.launchWizard) {
        // Show the AI's onboarding message first
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: json.reply || "Launching onboarding wizard…",
          },
        ]);

        // Slight delay for cinematic effect, then redirect
        setTimeout(() => {
          window.location.href = "/onboarding/start";
        }, 800);

        setSending(false);
        return;
      }

      // Normal reply
      const aiMessage = {
        role: "assistant",
        content: json.reply || "I couldn’t generate a response.",
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      console.error("[ChatBot ERROR]:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "❌ Something went wrong while processing your request.",
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
      {/* Floating Chat Toggle Button */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          position: "fixed",
          right: 24,
          bottom: 24,
          zIndex: 60,
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

      {/* Chat Panel */}
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
            zIndex: 55,
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

            <div style={{ fontSize: 12, color: GP.text, marginTop: 4 }}>
              {isWizard
                ? "Ask about onboarding, CSVs, rules, or industry requirements."
                : vendorId
                ? "Ask about this vendor’s rules, risk, alerts, or how to fix them."
                : "Ask about compliance, renewals, Org Brain, or what this page is telling you."}
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
                <button
                  style={quickBtn}
                  onClick={() => sendMessage("Create an example vendor CSV.")}
                >
                  📝 Example CSV
                </button>
                <button
                  style={quickBtn}
                  onClick={() =>
                    sendMessage("Explain the rules the wizard generated.")
                  }
                >
                  📘 Explain Rules
                </button>
                <button
                  style={quickBtn}
                  onClick={() =>
                    sendMessage("Generate a vendor welcome onboarding email.")
                  }
                >
                  ✉️ Welcome Email
                </button>
                <button
                  style={quickBtn}
                  onClick={() =>
                    sendMessage("Help me choose the right insurance coverages.")
                  }
                >
                  🛡️ Coverage Guide
                </button>
                <button
                  style={quickBtn}
                  onClick={() => sendMessage("Fix my CSV formatting.")}
                >
                  🛠️ Fix CSV
                </button>
              </>
            )}

            {/* Vendor Mode */}
            {!isWizard && vendorId && (
              <>
                <button
                  style={quickBtn}
                  onClick={() =>
                    sendMessage("Explain this vendor's risk score.")
                  }
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
                  onClick={() =>
                    sendMessage("Explain this vendor’s alerts.")
                  }
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
                  style={{
                    ...quickBtn,
                    border: "1px solid rgba(248,113,113,0.9)",
                    color: "#fecaca",
                  }}
                  onClick={() =>
                    sendMessage(
                      "Auto-fix this vendor: summarize all issues, propose a step-by-step remediation plan, and generate vendor and broker email templates."
                    )
                  }
                >
                  🚀 Auto-Fix Vendor
                </button>
              </>
            )}

            {/* Global Mode + Org Brain */}
            {!isWizard && !vendorId && (
              <>
                <button
                  style={quickBtn}
                  onClick={() => sendMessage("Show me all high-risk vendors.")}
                >
                  🔥 High-Risk Vendors
                </button>
                <button
                  style={quickBtn}
                  onClick={() =>
                    sendMessage("Explain the renewal prediction model.")
                  }
                >
                  🔮 Prediction Help
                </button>
                <button
                  style={quickBtn}
                  onClick={() => sendMessage("How do I upload a COI?")}
                >
                  📄 COI Help
                </button>

                {/* ORG BRAIN buttons */}
                <button
                  style={quickBtn}
                  onClick={() =>
                    sendMessage(
                      "Design a complete insurance compliance program for our organization using Org Brain."
                    )
                  }
                >
                  🧠 Design System
                </button>
                <button
                  style={quickBtn}
                  onClick={() =>
                    sendMessage(
                      "Optimize our compliance system to reduce high-risk vendors and improve renewal rates."
                    )
                  }
                >
                  ⚙️ Optimize System
                </button>
                <button
                  style={quickBtn}
                  onClick={() =>
                    sendMessage(
                      "Rebuild our compliance system using construction industry standards."
                    )
                  }
                >
                  🏗️ Industry: Construction
                </button>
                <button
                  style={quickBtn}
                  onClick={() =>
                    sendMessage(
                      "Rebuild our compliance system using healthcare industry insurance standards."
                    )
                  }
                >
                  🏥 Industry: Healthcare
                </button>
                <button
                  style={quickBtn}
                  onClick={() => sendMessage("What can Org Brain do?")}
                >
                  🔍 What can Org Brain do?
                </button>
              </>
            )}
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              padding: 10,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {messages.map((m, i) => {
              const isUser = m.role === "user";
              const isBrain = m.content?.startsWith("🧠");

              return (
                <div
                  key={i}
                  style={{
                    alignSelf: isUser ? "flex-end" : "flex-start",
                    maxWidth: "80%",
                    padding: "8px 10px",
                    borderRadius: 12,
                    background: isBrain
                      ? "linear-gradient(135deg, rgba(168,85,247,0.20), rgba(56,189,248,0.20))"
                      : isUser
                      ? "rgba(37,99,235,0.9)"
                      : "rgba(15,23,42,0.98)",
                    border: isBrain
                      ? "1px solid rgba(168,85,247,0.85)"
                      : isUser
                      ? "1px solid rgba(129,140,248,0.8)"
                      : GP.border,
                    boxShadow: isBrain
                      ? "0 0 16px rgba(168,85,247,0.55)"
                      : "none",
                    color: "#e5e7eb",
                    fontSize: 12,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {m.content}
                </div>
              );
            })}

            {/* Cinematic loader */}
            {sending && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: 4,
                  fontSize: 11,
                  color: GP.textSoft,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "999px",
                      background:
                        "radial-gradient(circle,#a855f7,#38bdf8)",
                      boxShadow:
                        "0 0 8px rgba(168,85,247,0.9), 0 0 14px rgba(56,189,248,0.7)",
                      opacity: 0.9,
                    }}
                  />
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "999px",
                      background:
                        "radial-gradient(circle,#38bdf8,#0ea5e9)",
                      boxShadow: "0 0 8px rgba(56,189,248,0.9)",
                    }}
                  />
                  <div
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: "999px",
                      background:
                        "radial-gradient(circle,#38bdf8,#1e40af)",
                      boxShadow: "0 0 6px rgba(59,130,246,0.8)",
                    }}
                  />
                </div>
                <span>Thinking…</span>
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
              placeholder={
                isWizard
                  ? "Ask onboarding questions…"
                  : vendorId
                  ? "Ask about this vendor…"
                  : "Ask about compliance, Org Brain, or this page…"
              }
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{
                flex: 1,
                resize: "none",
                borderRadius: 10,
                padding: 8,
                border: "1px solid rgba(51,65,85,0.9)",
                background: "rgba(2,6,23,0.8)",
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
