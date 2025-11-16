// pages/vendor/chat/[id].js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

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
        "Ask me anything about this vendor’s coverage, risk, or compliance. I’ll answer based on their policies and your org-wide requirements.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  // Load vendor info for header
  useEffect(() => {
    if (!id) return;

    async function loadVendor() {
      setLoadingVendor(true);
      setVendorError("");
      try {
        const res = await fetch(`/api/vendor/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load vendor");
        setVendor(data.vendor);
      } catch (err) {
        console.error("Vendor chat load error:", err);
        setVendorError(err.message || "Failed to load vendor");
      } finally {
        setLoadingVendor(false);
      }
    }

    loadVendor();
  }, [id]);

  async function handleSend(e) {
    e.preventDefault();
    if (!input.trim() || !id) return;

    const userMsg = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/vendor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorId: Number(id), message: userMsg.content }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "AI failed to respond");
      }

      const aiMsg = { role: "assistant", content: data.reply };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error("Chat error:", err);
      const errMsg = {
        role: "assistant",
        content:
          "I hit a problem trying to analyze this vendor. Check logs or try again in a moment.",
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      {/* Top bar */}
      <div className="h-1 bg-gradient-to-r from-sky-500 via-purple-500 to-emerald-400" />

      <div className="flex-1 max-w-5xl w-full mx-auto flex flex-col px-4 pb3 pt-6">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              Vendor AI · Coverage Chat
            </p>
            {loadingVendor ? (
              <p className="text-sm text-slate-400 mt-1">Loading vendor…</p>
            ) : vendor ? (
              <>
                <h1 className="text-xl md:text-2xl font-semibold">
                  {vendor.name}
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  ID: {vendor.id}
                  {vendor.email ? ` · ${vendor.email}` : ""}
                </p>
              </>
            ) : (
              <p className="text-sm text-rose-400 mt-1">
                Failed to load vendor: {vendorError}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={vendor ? `/vendor/${vendor.id}` : "/dashboard"}
              className="text-xs text-slate-300 hover:text-slate-50"
            >
              ← Back to Vendor
            </Link>
            <Link
              href="/dashboard"
              className="text-xs text-slate-400 hover:text-slate-50"
            >
              Dashboard
            </Link>
          </div>
        </div>

        {/* Chat container */}
        <div className="flex-1 min-h-[400px] max-h-[60vh] border border-slate-800 rounded-2xl bg-slate-950/70 p-4 flex flex-col space-y-3 overflow-y-auto mb-4">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex mb-1 ${
                m.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-sky-600 text-slate-50 rounded-br-none"
                    : "bg-slate-800/80 text-slate-100 rounded-bl-none"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="w-2 h-2 rounded-full bg-slate-400 animate-pulse" />
              <span>Thinking about this vendor…</span>
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="flex gap-3 items-center">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={2}
            placeholder="Ex: Does this vendor have GL & WC at my minimum limits? What’s risky about their coverage?"
            className="flex-1 rounded-xl border border-slate-700 bg-slate-900/80 text-sm text-slate-50 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 resize-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending || !id}
            className={`px-4 py-2 rounded-xl text-sm font-semibold ${
              !input.trim() || sending || !id
                ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                : "bg-sky-500 hover:bg-sky-400 text-slate-950"
            }`}
          >
            {sending ? "Asking…" : "Ask"}
          </button>
        </form>
      </div>
    </div>
  );
}
