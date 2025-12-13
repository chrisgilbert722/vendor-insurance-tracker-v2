// components/DocumentsUpload.js
// ============================================================
// Documents Upload — V6 (Mobile-First UX Enhanced)
// ✔ Camera-first upload
// ✔ Auto-crop guidance
// ✔ Upload success confirmation
// ============================================================

import { useState } from "react";

export default function DocumentsUpload({
  orgId,
  vendorId,
  onDocumentUploaded,
}) {
  const [file, setFile] = useState(null);
  const [documentType, setDocumentType] = useState("COI");
  const [expiresOn, setExpiresOn] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleUpload() {
    if (!file || !orgId || !vendorId) return;

    try {
      setLoading(true);
      setError("");
      setSuccess(false);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("documentType", documentType);
      if (expiresOn) formData.append("expiresOn", expiresOn);

      const res = await fetch(
        `/api/vendor/documents/upload?orgId=${orgId}&vendorId=${vendorId}`,
        {
          method: "POST",
          body: formData,
        }
      );

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Upload failed");

      onDocumentUploaded?.(json.document);

      setFile(null);
      setExpiresOn("");
      setDocumentType("COI");
      setSuccess(true);

      // Auto-clear success state
      setTimeout(() => setSuccess(false), 2200);
    } catch (err) {
      console.error("[DocumentsUpload]", err);
      setError(err.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
      {/* TYPE + EXPIRATION */}
      <div className="flex gap-2">
        <select
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value)}
          className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
        >
          <option value="COI">COI</option>
          <option value="W9">W-9</option>
          <option value="License">License</option>
          <option value="Contract">Contract</option>
        </select>

        <input
          type="date"
          value={expiresOn}
          onChange={(e) => setExpiresOn(e.target.value)}
          className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
        />
      </div>

      {/* PRIMARY CAMERA CTA */}
      <label className="block">
        <div className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-slate-950 text-sm font-semibold text-center cursor-pointer hover:opacity-90">
          {loading ? "Uploading…" : "📸 Take Photo or Upload Document"}
        </div>

        <input
          type="file"
          accept="image/*,application/pdf"
          capture="environment"
          disabled={loading}
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="hidden"
        />
      </label>

      {/* AUTO-CROP GUIDANCE */}
      <div className="text-[11px] text-slate-400 leading-snug">
        💡 Tip: Lay the document flat, fill the frame, and avoid shadows.  
        Our system automatically crops and reads your document.
      </div>

      {/* ERROR */}
      {error && <div className="text-xs text-rose-400">{error}</div>}

      {/* CONFIRM UPLOAD BUTTON (DESKTOP FALLBACK) */}
      <button
        onClick={handleUpload}
        disabled={loading || !file}
        className="w-full px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-slate-950 text-xs font-semibold disabled:opacity-50"
      >
        {loading ? "Uploading…" : "Upload Document"}
      </button>

      {/* SUCCESS CONFIRMATION */}
      {success && (
        <div className="text-sm font-semibold text-emerald-300 bg-emerald-900/20 border border-emerald-700/40 rounded-lg px-3 py-2 animate-fade-pop">
          ✅ Upload successful — processing now
        </div>
      )}

      {/* ANIMATION */}
      <style jsx>{`
        @keyframes fadePop {
          from {
            opacity: 0;
            transform: translateY(6px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-fade-pop {
          animation: fadePop 0.35s ease-out;
        }
      `}</style>
    </div>
  );
}
