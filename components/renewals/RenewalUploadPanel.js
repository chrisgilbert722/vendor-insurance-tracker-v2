// components/renewals/RenewalUploadPanel.js
import { useState } from "react";

const GP = {
  bg: "rgba(15,23,42,0.96)",
  border: "1px solid rgba(51,65,85,0.9)",
  text: "#e5e7eb",
  textSoft: "#9ca3af",
  red: "#fb7185",
  green: "#22c55e",
  blue: "#38bdf8",
};

export default function RenewalUploadPanel({ vendorId, orgId, onComplete }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function handleUpload() {
    if (!file || !vendorId || !orgId) return;

    try {
      setLoading(true);
      setError("");
      setResult(null);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("vendorId", vendorId);
      formData.append("orgId", orgId);

      const res = await fetch("/api/renewals/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!json.ok) {
        throw new Error(json.error || "Upload failed");
      }

      setResult(json);

      // Callback to refresh parent (refreshes V3 risk, alerts, logs)
      if (onComplete) onComplete(json);
    } catch (err) {
      console.error("[RenewalUploadPanel] ERROR:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        marginTop: 30,
        padding: 16,
        background: GP.bg,
        border: GP.border,
        borderRadius: 16,
      }}
    >
      <div
        style={{
          fontSize: 12,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: GP.textSoft,
          marginBottom: 8,
        }}
      >
        Upload Renewal COI
      </div>

      {/* File chooser */}
      <input
        type="file"
        accept="application/pdf"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        style={{
          padding: 8,
          background: "#0f172a",
          border: GP.border,
          borderRadius: 12,
          color: GP.textSoft,
          width: "100%",
          marginBottom: 10,
        }}
      />

      <button
        onClick={handleUpload}
        disabled={loading || !file}
        style={{
          marginTop: 8,
          padding: "8px 14px",
          borderRadius: 999,
          border: "1px solid rgba(56,189,248,0.8)",
          background:
            "radial-gradient(circle at top left,#38bdf8,#0ea5e9,#0f172a)",
          color: "#e0f2fe",
          fontSize: 12,
          fontWeight: 600,
          cursor: loading || !file ? "not-allowed" : "pointer",
          width: "100%",
        }}
      >
        {loading ? "Uploading…" : "Upload Renewal COI"}
      </button>

      {error && (
        <div style={{ color: GP.red, fontSize: 12, marginTop: 10 }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: 12, fontSize: 12, color: GP.green }}>
          ✅ Renewal COI processed successfully!
          <div style={{ marginTop: 4, color: GP.textSoft }}>
            Status: <strong>{result.status}</strong>
          </div>
        </div>
      )}
    </div>
  );
}
