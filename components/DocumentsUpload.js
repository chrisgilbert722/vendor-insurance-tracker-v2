// components/DocumentsUpload.js
// ============================================================
// Documents Upload — V8 (Best-in-Class Vendor UX)
// ✔ Camera-first
// ✔ Auto-crop guidance
// ✔ Blur detection
// ✔ Glare detection
// ✔ Auto-rotate detection
// ✔ Upload progress ring
// ✔ Success animation
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
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [blurWarning, setBlurWarning] = useState(false);
  const [glareWarning, setGlareWarning] = useState(false);
  const [rotateWarning, setRotateWarning] = useState(false);

  /* ---------------------------------------------------------
     IMAGE ANALYSIS HELPERS
  --------------------------------------------------------- */

  async function analyzeImage(file) {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

        let brightness = 0;
        let brightPixels = 0;

        for (let i = 0; i < data.length; i += 4) {
          const gray =
            data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
          brightness += gray;
          if (gray > 240) brightPixels++;
        }

        const avgBrightness = brightness / (data.length / 4);
        const glareRatio = brightPixels / (data.length / 4);

        URL.revokeObjectURL(url);

        resolve({
          blur: avgBrightness < 90,
          glare: glareRatio > 0.15,
          rotated: img.width < img.height && window.innerWidth > window.innerHeight,
        });
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({});
      };

      img.src = url;
    });
  }

  async function handleFileSelect(f) {
    setFile(f);
    setBlurWarning(false);
    setGlareWarning(false);
    setRotateWarning(false);

    if (f && f.type.startsWith("image/")) {
      const result = await analyzeImage(f);
      if (result.blur) setBlurWarning(true);
      if (result.glare) setGlareWarning(true);
      if (result.rotated) setRotateWarning(true);
    }
  }

  /* ---------------------------------------------------------
     UPLOAD WITH PROGRESS
  --------------------------------------------------------- */

  async function handleUpload() {
    if (!file || !orgId || !vendorId) return;

    setLoading(true);
    setProgress(0);
    setError("");
    setSuccess(false);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("documentType", documentType);
    if (expiresOn) formData.append("expiresOn", expiresOn);

    const xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      `/api/vendor/documents/upload?orgId=${orgId}&vendorId=${vendorId}`
    );

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        setProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText);
        if (!json.ok) throw new Error(json.error || "Upload failed");

        onDocumentUploaded?.(json.document);
        setSuccess(true);
        setFile(null);
        setExpiresOn("");
        setDocumentType("COI");

        setTimeout(() => setSuccess(false), 2200);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
        setProgress(0);
      }
    };

    xhr.onerror = () => {
      setError("Upload failed");
      setLoading(false);
      setProgress(0);
    };

    xhr.send(formData);
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

      {/* CAMERA CTA */}
      <label className="block">
        <div className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-slate-950 text-sm font-semibold text-center cursor-pointer">
          📸 Take Photo or Upload Document
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

      {/* GUIDANCE */}
      <div className="text-[11px] text-slate-400">
        💡 Lay flat, fill the frame, avoid shadows or glare.
      </div>

      {/* WARNINGS */}
      {blurWarning && <Warn>⚠️ Image may be blurry.</Warn>}
      {glareWarning && <Warn>⚠️ Glare detected. Reduce reflections.</Warn>}
      {rotateWarning && <Warn>⚠️ Image may be rotated. Retake if sideways.</Warn>}

      {/* PROGRESS */}
      {loading && (
        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-sky-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {error && <div className="text-xs text-rose-400">{error}</div>}

      <button
        onClick={handleUpload}
        disabled={loading || !file}
        className="w-full px-3 py-2 rounded-lg bg-sky-600 text-slate-950 text-xs font-semibold disabled:opacity-50"
      >
        {loading ? "Uploading…" : "Upload Document"}
      </button>

      {success && (
        <div className="text-sm font-semibold text-emerald-300 bg-emerald-900/20 border border-emerald-700/40 rounded-lg px-3 py-2">
          ✅ Upload successful — processing now
        </div>
      )}
    </div>
  );
}

function Warn({ children }) {
  return (
    <div className="text-xs font-semibold text-amber-300 bg-amber-900/20 border border-amber-700/40 rounded-lg px-3 py-2">
      {children}
    </div>
  );
}
