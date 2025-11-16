import { useEffect, useState } from "react";
import Link from "next/link";
import {
  X as XIcon,
  ShieldWarning,
  ShieldCheck,
  WarningCircle,
  FileText,
  ListBullets,
  EnvelopeSimple,
  ClipboardText,
} from "@phosphor-icons/react";

/**
 * VendorDrawer
 * INTERNAL USE ONLY
 */

export default function VendorDrawer({ vendor, policies, onClose }) {
  const [compliance, setCompliance] = useState(null);
  const [loading, setLoading] = useState(true);

  // Renewal Email Modal
  const [emailModal, setEmailModal] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailData, setEmailData] = useState(null);

  useEffect(() => {
    async function loadCompliance() {
      try {
        const res = await fetch(`/api/compliance/vendor/${vendor.id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setCompliance(data);
      } catch (err) {
        console.error("Compliance error:", err);
      } finally {
        setLoading(false);
      }
    }

    loadCompliance();
  }, [vendor.id]);

  async function generateRenewalEmail() {
    setEmailLoading(true);
    setEmailError("");
    setEmailData(null);

    try {
      const res = await fetch("/api/vendor/email-renewal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorId: vendor.id }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error);

      setEmailData(data);
    } catch (err) {
      console.error("Email generation error:", err);
      setEmailError(err.message || "Failed to generate email.");
    } finally {
      setEmailLoading(false);
    }
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
  }

  return (
    <>
      {/* BACKDROP */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />

      {/* DRAWER */}
      <div className="fixed right-0 top-0 h-full w-[420px] bg-slate-950 text-slate-100 border-l border-slate-800 shadow-xl z-50 p-6 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold">Vendor Overview</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200"
          >
            <XIcon size={22} />
          </button>
        </div>

        {/* Vendor Header */}
        <div className="space-y-2">
          <h3 className="text-xl font-bold">{vendor.name}</h3>
          <p className="text-sm text-slate-400">
            {vendor.email ? vendor.email : "No email on file"}
          </p>
        </div>

        <hr className="my-4 border-slate-800" />

        {/* Compliance Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <ShieldWarning size={16} className="text-amber-400" />
            Compliance Summary
          </h3>

          {loading ? (
            <p className="text-xs text-slate-500">Loading compliance...</p>
          ) : compliance?.missing?.length > 0 ? (
            <div className="text-xs text-rose-400">
              Missing required coverage:
              <ul className="list-disc ml-4 mt-1 space-y-1">
                {compliance.missing.map((m, idx) => (
                  <li key={idx}>{m.coverage_type}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-emerald-400">Fully compliant.</p>
          )}
        </div>

        <hr className="my-4 border-slate-800" />

        {/* Renewal Email Button */}
        <button
          onClick={() => {
            setEmailModal(true);
            generateRenewalEmail();
          }}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-sky-600 hover:bg-sky-500 text-slate-950 text-sm font-semibold rounded-lg shadow transition"
        >
          <EnvelopeSimple size={16} />
          Generate Renewal Email
        </button>

        <hr className="my-4 border-slate-800" />

        {/* Policies */}
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
            <ListBullets size={16} className="text-slate-300" />
            Policies
          </h3>

          <div className="space-y-3">
            {policies.map((p) => (
              <div
                key={p.id}
                className="p-3 bg-slate-900/40 border border-slate-800 rounded-lg"
              >
                <p className="text-sm font-semibold text-slate-200">
                  {p.coverage_type}
                </p>
                <p className="text-xs text-slate-400">
                  {p.carrier || "Unknown carrier"}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Policy #: {p.policy_number || "—"}
                </p>
                <p className="text-xs text-slate-500">
                  Expires: {p.expiration_date}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* EMAIL MODAL */}
      {emailModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-slate-900 text-slate-100 w-full max-w-lg rounded-xl border border-slate-700 p-6 shadow-xl relative">

            <button
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-200"
              onClick={() => {
                setEmailModal(false);
                setEmailData(null);
                setEmailError("");
              }}
            >
              <XIcon size={20} />
            </button>

            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <EnvelopeSimple size={18} />
              Renewal Request Email
            </h2>

            {emailLoading && (
              <p className="text-sm text-slate-400">Generating…</p>
            )}

            {emailError && (
              <p className="text-sm text-rose-400">{emailError}</p>
            )}

            {emailData && (
              <>
                <div className="mb-4">
                  <h3 className="text-sm font-semibold">Subject</h3>
                  <div className="bg-slate-800 p-3 rounded-lg text-xs border border-slate-700 mt-1">
                    {emailData.subject}
                  </div>
                  <button
                    onClick={() => copyToClipboard(emailData.subject)}
                    className="mt-2 flex items-center gap-2 text-xs text-slate-300 bg-slate-800 px-3 py-1 rounded-lg border border-slate-700 hover:bg-slate-700"
                  >
                    <ClipboardText size={14} />
                    Copy Subject
                  </button>
                </div>

                <div>
                  <h3 className="text-sm font-semibold">Body</h3>
                  <pre className="bg-slate-800 p-3 rounded-lg text-xs border border-slate-700 whitespace-pre-wrap mt-1">
                    {emailData.body}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(emailData.body)}
                    className="mt-2 flex items-center gap-2 text-xs text-slate-300 bg-slate-800 px-3 py-1 rounded-lg border border-slate-700 hover:bg-slate-700"
                  >
                    <ClipboardText size={14} />
                    Copy Body
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
