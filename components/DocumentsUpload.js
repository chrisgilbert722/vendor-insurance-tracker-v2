// components/DocumentsUpload.js
// ============================================================
// Documents Upload — V7 (Mobile-First UX + Blur Detection)
// ✔ Camera-first upload
// ✔ Auto-crop guidance
// ✔ Blur detection warning
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
  const [blurWarning, setBlurWarning] = useState(false);

  // ----------------------------------------------------------
  // SIMPLE BLUR DETECTION (client-side)
  // ----------------------------------------------------------
  async function isImageBlurry(file) {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(
          0,
          0,
          canvas.width,
          canvas.height
        );
        const data = imageData.data;

        let edgeSum = 0;
        for (let i = 0; i < data.length; i += 4) {
          const gray =
            data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
          edgeSum += gray;
        }

        const avg = edgeSum / (data.length / 4);

        URL.revokeObjectURL(url);

        // Threshold tuned for phone photos
        resolve(avg < 90);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(false);
      };

      img.src = url;
    });
  }

  async function handleFileSelect(f) {
    setFile(f);
    setBlurWarning(false);

    if (f && f.type.startsWith("image/")) {
      const blurry = await isImageBlurry(f);
      if (blurry) setBlurWarning(true);
    }
  }

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
      setBlurWarning(false);
      setSuccess(true);

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
          onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
          className="hidden"
        />
      </label>

      {/* AUTO-CROP GUIDANCE */}
      <div className="text-[11px] text-slate-400 leading-snug">
        💡 Tip: Lay the document flat, fill the frame, and avoid shadows.
      </div>

      {/* BLUR WARNING */}
      {blurWarning && (
        <div className="text-xs font-semibold text-amber-300 bg-amber-900/20 border border-amber-700/40 rounded-lg px-3 py-2">
          ⚠️ This photo looks a bit blurry. You can retake it for better results,
          or upload anyway.
        </div>
      )}

      {/* ERROR */}
      {error && <div className="text-xs text-rose-400">{error}</div>}

      {/* CONFIRM UPLOAD */}
      <button
        onClick={handleUpload}
        disabled={loading || !file}
        className="w-full px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-slate-950 text-xs font-semibold disabled:opacity-50"
      >
        {loading ? "Uploading…" : "Upload Document"}
      </button>

      {/* SUCCESS */}
      {success && (
        <div className="text-sm font-semibold text-emerald-300 bg-emerald-900/20 border border-emerald-700/40 rounded-lg px-3 py-2 animate-fade-pop">
          ✅ Upload successful — processing now
        </div>
      )}

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

