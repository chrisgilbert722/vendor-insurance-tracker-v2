// components/onboarding/VendorsUploadStep.js
// Wizard Step 2 — Vendor CSV Upload (RESTORED + STABLE)
// ✅ Inserts vendors immediately
// ✅ Unblocks dashboard + GVI
// ✅ No AI parsing yet (intentional)

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function VendorsUploadStep({ orgId, onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  function handleFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setError("");
    setFile(f);
  }

  async function handleUpload(e) {
    e.preventDefault();
    setError("");

    if (!file) {
      setError("Please select a CSV file.");
      return;
    }

    if (!orgId) {
      setError("Organization not ready. Please refresh.");
      return;
    }

    try {
      setUploading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Authentication session missing.");
      }

      // 🔑 READ CSV CLIENT-SIDE (THIS WAS MISSING)
      const csvText = await file.text();

      const res = await fetch("/api/vendors/import-csv", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          orgId,
          csvText,
        }),
      });

      const json = await res.json();
      if (!json.ok) {
        throw new Error(json.error || "CSV import failed.");
      }

      // Move onboarding forward
      onUploadSuccess?.({
        headers: [],
        rows: [],
        mapping: {},
        autoSkip: true,
      });
    } catch (err) {
      setError(err.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={handleUpload}>
      <label
        style={{
          display: "block",
          padding: 20,
          borderRadius: 18,
          border: "1.5px dashed rgba(148,163,184,0.7)",
          background: "rgba(15,23,42,0.96)",
          cursor: "pointer",
          textAlign: "center",
        }}
      >
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
        <div style={{ fontSize: 14, color: "#e5e7eb" }}>
          {file ? file.name : "Upload vendor CSV file"}
        </div>
        <div style={{ fontSize: 12, color: "#9ca3af" }}>
          CSV only — vendors will be created immediately
        </div>
      </label>

      {error && (
        <div style={{ color: "#fecaca", marginTop: 10 }}>{error}</div>
      )}

      <button
        type="submit"
        disabled={uploading || !file}
        style={{
          marginTop: 14,
          padding: "10px 18px",
          borderRadius: 999,
          border: "1px solid rgba(56,189,248,0.9)",
          background:
            "linear-gradient(90deg,rgba(56,189,248,0.9),rgba(88,28,135,0.85))",
          color: "#e5f2ff",
          fontWeight: 600,
          cursor: uploading || !file ? "not-allowed" : "pointer",
        }}
      >
        {uploading ? "Importing…" : "Upload & Continue →"}
      </button>
    </form>
  );
}
