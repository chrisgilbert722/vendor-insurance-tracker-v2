// components/broker/BrokerUploadBox.js

import { useState } from "react";

export default function BrokerUploadBox({ orgId, vendorId, policyId, onUploaded }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  function handleFileChange(e) {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setError("");
  }

  async function handleUpload() {
    if (!file) {
      setError("Choose a COI or endorsement file first.");
      return;
    }
    if (!orgId || !vendorId) {
      setError("Missing orgId or vendorId.");
      return;
    }

    try {
      setUploading(true);
      setError("");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("orgId", String(orgId));
      formData.append("vendorId", String(vendorId));
      if (policyId) formData.append("policyId", String(policyId));

      const res = await fetch("/api/ai/copilot-doc-intake", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!data.ok) {
        throw new Error(data.error || "Upload failed.");
      }

      if (onUploaded) onUploaded(data);
    } catch (err) {
      setError(err.message || "Upload error.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      style={{
        borderRadius: 16,
        border: "1px dashed rgba(148,163,184,0.7)",
        padding: 14,
        background: "rgba(15,23,42,0.9)",
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: "#e5e7eb",
          marginBottom: 6,
        }}
      >
        Upload a COI or endorsement to auto-check against requirements.
      </div>

      <input
        type="file"
        onChange={handleFileChange}
        style={{ fontSize: 12, color: "#e5e7eb" }}
      />

      {file && (
        <div
          style={{
            fontSize: 11,
            color: "#9ca3af",
            marginTop: 4,
          }}
        >
          Selected: {file.name}
        </div>
      )}

      {error && (
        <div
          style={{
            fontSize: 11,
            color: "#fecaca",
            marginTop: 6,
          }}
        >
          {error}
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={uploading}
        style={{
          marginTop: 8,
          padding: "6px 12px",
          borderRadius: 999,
          border: "1px solid rgba(56,189,248,0.85)",
          background:
            "linear-gradient(90deg,#0ea5e9,#38bdf8,#0f172a)",
          color: "white",
          fontSize: 12,
          fontWeight: 600,
          cursor: uploading ? "not-allowed" : "pointer",
        }}
      >
        {uploading ? "Uploading…" : "Upload & Analyze Doc"}
      </button>
    </div>
  );
}
