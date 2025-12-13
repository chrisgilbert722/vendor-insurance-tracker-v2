// components/DocumentsUpload.js
// ============================================================
// Documents Upload — V5 (Browser-safe)
// Sends file + metadata to API route via FormData
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

  async function handleUpload() {
    if (!file || !orgId || !vendorId) return;

    try {
      setLoading(true);
      setError("");

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
    } catch (err) {
      console.error("[DocumentsUpload]", err);
      setError(err.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 space-y-2">
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

      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="text-xs text-slate-300"
      />

      {error && <div className="text-xs text-rose-400">{error}</div>}

      <button
        onClick={handleUpload}
        disabled={loading || !file}
        className="w-full px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-slate-950 text-xs font-semibold disabled:opacity-50"
      >
        {loading ? "Uploading…" : "Upload Document"}
      </button>
    </div>
  );
}
