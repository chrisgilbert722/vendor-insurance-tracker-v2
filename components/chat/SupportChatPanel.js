// components/chat/SupportChatPanel.js
// Ultimate AI Assistant v7 — Property Management Focus (Freeze-Safe)

import { useState, useEffect } from "react";

const GP = {
  panelBg: "rgba(15,23,42,0.98)",
  border: "1px solid rgba(51,65,85,0.9)",
  text: "#e5e7eb",
  textSoft: "#9ca3af",
};

export default function SupportChatPanel({
  orgId,
  vendorId,
  pathname,
  onboardingComplete,
}) {
  const isWizard = pathname?.startsWith("/onboarding");

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: isWizard
        ? "Welcome to the AI Onboarding Wizard. Ask me about CSV formatting, industry detection, rule creation, or what happens next."
        : vendorId
        ? "You're viewing a specific vendor. Ask me about compliance gaps, rule failures, fix plans, or renewal risk."
        : "I'm your Property Management Compliance Assistant. Ask about vendor risk, owner exposure, renewals, or what this dashboard is showing you.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  /* =====================================================
     Explain This Page Listener
  ===================================================== */
  useEffect(() => {
    const handler = () => {
      sendMessage(
        "Explain what this dashboard is showing me and what actions I should take next as a property manager."
      );
      if (!open) setOpen(true);
    };

    window.addEventListener("explain_page", handler);
    return () => window.removeEventListener("explain_page", handler);
  }, [open, messages]);

  /* =====================================================
     Auto Checklist Trigger
  ===================================================== */
  useEffect(() => {
    const openChecklist = () => {
      if (!open) setOpen(true);
      sendMessage("start checklist");
    };

    window.addEventListener("onboarding_chat_forceChecklist", openChecklist);
    return () =>
      window.removeEventListener(
        "onboarding_chat_forceChecklist",
        openChecklist
      );
  }, [open, messages]);

  /* =====================================================
     Send Message
  ===================================================== */
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
          onboardingComplete: onboardingComplete ?? true,
        }),
      });

      const json = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: json.reply || "I couldn’t generate a response.",
        },
      ]);
    } catch (err) {
      console.error("[ChatBot ERROR]:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Something went wrong while processing your request.",
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
      {/* Floating Toggle */}
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
          boxShadow:
            "0 0 25px rgba(56,189,248,0.7), 0 0 40px rgba(15,23,42,0.9)",
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
            zIndex: 55,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* HEADER — FIXED & READABLE */}
          <div
            style={{
              padding: "12px 14px",
              borderBottom: GP.border,
              background: "rgba(2,6,23,0.95)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#cbd5f5",
              }}
            >
              Property Management Compliance Assistant
            </div>

            <div style={{ fontSize: 13, color: GP.text, marginTop: 6 }}>
              Ask about vendor risk, expiring COIs, owner exposure, renewals, or
              what this dashboard is telling you.
            </div>
          </div>

          {/* QUICK ACTIONS — PM ONLY */}
          <div
            style={{
              padding: 8,
              borderBottom: GP.border,
              background: "rgba(15,23,42,0.96)",
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
            }}
          >
            {!isWizard && !vendorId && (
              <>
                <button style={quickBtn} onClick={() => sendMessage("Show me high-risk vendors across my properties.")}>
                  🔥 High-Risk Vendors
                </button>
                <button style={quickBtn} onClick={() => sendMessage("Explain owner liability exposure shown on this dashboard.")}>
                  🏢 Owner Exposure
                </button>
                <button style={quickBtn} onClick={() => sendMessage("Which COIs are expiring soon and what happens if they lapse?")}>
                  ⏳ Expiring COIs
                </button>
                <button style={quickBtn} onClick={() => sendMessage("What should I fix first to reduce risk?")}>
                  🛠️ What should I fix first?
                </button>
                <button style={quickBtn} onClick={() => sendMessage("start checklist")}>
                  ✅ Start PM Checklist
                </button>
              </>
            )}
          </div>

          {/* MESSAGES */}
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
                    border: GP.border,
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
              <div style={{ fontSize: 11, color: GP.textSoft }}>
                Thinking…
              </div>
            )}
          </div>

          {/* INPUT */}
          <div
            style={{
              borderTop: GP.border,
              padding: 8,
              display: "flex",
              gap: 6,
            }}
          >
            <textarea
              value={input}
              placeholder="Ask about vendor risk, renewals, or owner exposure…"
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{
                flex: 1,
                resize: "none",
                borderRadius: 10,
                padding: 8,
                border: GP.border,
                background: "rgba(2,6,23,0.8)",
                color: GP.text,
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
