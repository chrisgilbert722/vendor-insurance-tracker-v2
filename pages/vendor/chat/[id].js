// pages/vendor/chat/[id].js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import {
  ShieldCheck,
  WarningCircle,
  Brain,
  EnvelopeSimple,
  XCircle,
  ListChecks,
} from "@phosphor-icons/react";

export default function VendorChatPage() {
  const router = useRouter();
  const { id } = router.query;

  const [vendor, setVendor] = useState(null);
  const [loadingVendor, setLoadingVendor] = useState(true);
  const [vendorError, setVendorError] = useState("");

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Ask me anything about this vendor’s coverage, risk, or compliance. I analyze policies, requirements, expirations, and missing coverage.",
    },
  ]);

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  /* ------------------------------------------------------------
     LOAD VENDOR BASIC INFO (header only)
  ------------------------------------------------------------ */
  useEffect(() => {
    if (!id) return;
    async function loadVendor() {
      try {
        const res = await fetch(`/api/vendor/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setVendor(data.vendor);
      } catch (err) {
        setVendorError(err.message || "Vendor load failed.");
      } finally {
        setLoadingVendor(false);
      }
    }
    loadVendor();
  }, [id]);

  /* ------------------------------------------------------------
     SEND CHAT MESSAGE
  ------------------------------------------------------------ */
  async function sendMessage(text) {
    const userMsg = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);

    try {
      const res = await fetch("/api/vendor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId: Number(id),
          message: text,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error);

      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I hit an issue evaluating this vendor. Try again in a moment or check policies.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!input.trim()) return;
    await sendMessage(input.trim());
    setInput("");
  }

  /* ------------------------------------------------------------
     QUICK ACTION BUTTONS
  ------------------------------------------------------------ */
  const quickActions = [
    {
      icon: <ShieldCheck size={15} />,
      label: "Meets Requirements?",
      prompt: "Does this vendor meet all of our coverage requirements?",
    },
    {
      icon: <XCircle size={15} />,
      label: "Missing Coverage",
      prompt: "Which required coverages is this vendor missing?",
    },
    {
      icon: <WarningCircle size={15} />,
      label: "Risk Summary",
      prompt: "Summarize this vendor’s insurance risk profile.",
    },
    {
      icon: <Brain size={15} />,
      label: "Explain Like I'm 5",
      prompt:
        "Explain this vendor’s insurance coverage and risk to me like I’m 5 years old.",
    },
    {
      icon: <EnvelopeSimple size={15} />,
      label: "Renewal Email",
      prompt:
        "Generate a professional renewal request email for this vendor’s missing or expired policies.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      {/* Top Bar */}
      <div className="h-1 bg-gradient-to-r from-sky-500 via-purple-500 to-emerald-400" />

      <div className="flex-1 w-full max-w-5xl mx-auto px-4 py-6 flex flex-col">

        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              Vendor AI · COI Chat
            </p>

            {loadingVendor ? (
              <p className="text-sm text-slate-400">Loading vendor…</p>
            ) : vendor ? (
              <>
                <h1 className="text-xl font-semibold">{vendor.name}</h1>
                <p className="text-xs text-slate-400 mt-1">
                  ID: {vendor.id} {vendor.email ? `· ${vendor.email}` : ""}
                </p>
              </>
            ) : (
              <p className="text-rose-400 text-sm">Failed to load vendor.</p>
            )}
          </div>

          <Link
            href={`/vendor/${id}`}
            className="text-xs text-slate-400 hover:text-slate-200"
          >
            ← Back to Vendor
          </Link>
        </div>

        {/* QUICK ACTION CHIP BAR */}
        <div className="flex flex-wrap gap-2 mb-4">
          {quickActions.map((qa, index) => (
            <button
              key={index}
              onClick={() => sendMessage(qa.prompt)}
              disabled={sending}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] rounded-full border border-slate-700 transition disabled:opacity-40"
            >
              {qa.icon}
              {qa.label}
            </button>
          ))}
        </div>

        {/* CHAT AREA */}
        <div className="flex-1 min-h-[300px] max-h-[60vh] bg-slate-950 border border-slate-800 rounded-2xl px-4 py-4 overflow-y-auto flex flex-col space-y-3 mb-4">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex ${
                m.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] px-3 py-2 text-sm rounded-2xl leading-relaxed ${
                  m.role === "user"
                    ? "bg-sky-600 text-slate-900 rounded-br-none"
                    : "bg-slate-800/80 text-slate-100 rounded-bl-none"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}

          {sending && (
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <span className="w-2 h-2 bg-slate-400 rounded-full animate-pulse"></span>
              Thinking…
            </div>
          )}
        </div>

        {/* INPUT BAR */}
        <form onSubmit={handleSubmit} className="flex gap-3 items-center">
          <textarea
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about this vendor’s coverage, risk, or compliance…"
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-100 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-500"
          />

          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-sky-600 hover:bg-sky-500 text-slate-950 disabled:opacity-40"
          >
            {sending ? "Asking…" : "Ask"}
          </button>
        </form>
      </div>
    </div>
  );
}
