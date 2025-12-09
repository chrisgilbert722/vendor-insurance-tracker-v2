// components/onboarding/ContractsUploadStep.js
// STEP 5 — Upload Contracts, Endorsements & Sample COIs
// Browser preview + Supabase upload + AI extraction stub

import { useState } from "react";

export default function ContractsUploadStep({
  orgId,
  wizardState,
  setWizardState,
}) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState("");
  const [aiData, setAiData] = useState(null);

  function handleFileSelect(e) {
    const selected = Array.from(e.target.files || []);
    setFiles(selected);
    setError("");
  }

  async function uploadFiles() {
    if (!files.length) {
      setError("Please upload at least one contract or sample COI PDF.");
      return;
    }

    setUploading(true);
    setError("");

    const resultList = [];

    try {
      for (const file of files) {
        const form = new FormData();
        form.append("file", file);
        if (orgId) form.append("orgId", String(orgId));

        const token = localStorage.getItem("supabase_token") || "";

        const res = await fetch("/api/onboarding/upload-contract", {
          method: "POST",
          headers: token
            ? { Authorization: `Bearer ${token}` }
            : undefined,
          body: form,
        });

        const json = await res.json();
        if (!json.ok) throw new Error(json.error || "Upload failed");

        resultList.push({
          name: file.name,
          path: json.path,
          bucket: json.bucket,
          size: file.size,
        });
      }

      setWizardState((prev) => ({
        ...prev,
        contracts: {
          ...(prev.contracts || {}),
          uploads: resultList,
        },
      }));
    } catch (err) {
      console.error("upload error:", err);
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function runAiExtraction() {
    const uploads = wizardState?.contracts?.uploads;
    if (!uploads || uploads.length === 0) {
      setError("Upload your documents first.");
      return;
    }

    setExtracting(true);
    setError("");

    try {
      const res = await fetch("/api/onboarding/ai-contract-extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          documents: uploads,
        }),
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error);

      setAiData(json);
      setWizardState((prev) => ({
        ...prev,
        contracts: {
          ...(prev.contracts || {}),
          aiExtract: json,
          requirements: json.requirements || [],
        },
      }));
    } catch (err) {
      console.error("AI extraction error:", err);
      setError(err.message || "AI failed to extract requirements.");
    } finally {
      setExtracting(false);
    }
  }

  const uploaded = wizardState?.contracts?.uploads;

  return (
    <div
      style={{
        padding: 18,
        borderRadius: 18,
        background: "rgba(15,23,42,0.96)",
        border: "1px solid rgba(51,65,85,0.9)",
      }}
    >
      <h2
        style={{
          marginTop: 0,
          fontSize: 18,
          fontWeight: 600,
          color: "#e5e7eb",
        }}
      >
        Step 5 — Upload Contracts & Sample COIs
      </h2>

      <p style={{ fontSize: 13, color: "#9ca3af" }}>
        Upload any contract documents (PDF), insurance requirements, endorsements,
        or sample COIs. AI will extract coverage requirements and convert them
        into structured rules for you.
      </p>

      {/* Upload box */}
      <label
        style={{
          display: "block",
          padding: 20,
          borderRadius: 18,
          border: "1.5px dashed rgba(148,163,184,0.7)",
          background:
            "radial-gradient(circle at top,rgba(15,23,42,0.98),rgba(15,23,42,0.96))",
          cursor: "pointer",
          textAlign: "center",
        }}
      >
        <input
          type="file"
          accept="application/pdf"
          multiple
          onChange={handleFileSelect}
          style={{ display: "none" }}
        />

        <div
          style={{ fontSize: 14, color: "#e5e7eb", marginBottom: 6 }}
        >
          {files.length
            ? `${files.length} file(s) selected`
            : "Click or drop PDF files (contracts, endorsements, COIs)"}
        </div>
        <div style={{ fontSize: 12, color: "#9ca3af" }}>
          Supported: PDF only. No file size limit.
        </div>
      </label>

      {/* Error */}
      {error && (
        <div
          style={{
            marginTop: 12,
            padding: "10px 14px",
            borderRadius: 10,
            background: "rgba(127,29,29,0.9)",
            border: "1px solid rgba(248,113,113,0.8)",
            color: "#fecaca",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {/* Upload button */}
      <button
        type="button"
        onClick={uploadFiles}
        disabled={uploading}
        style={{
          marginTop: 14,
          padding: "8px 16px",
          borderRadius: 999,
          border: "1px solid rgba(56,189,248,0.9)",
          background:
            "linear-gradient(90deg,rgba(56,189,248,0.9),rgba(88,28,135,0.85))",
          color: "#e5e7eb",
          fontSize: 13,
          fontWeight: 600,
          cursor: uploading ? "not-allowed" : "pointer",
          opacity: uploading ? 0.6 : 1,
        }}
      >
        {uploading ? "Uploading…" : "Upload Files"}
      </button>

      {/* Uploaded files list */}
      {uploaded && uploaded.length > 0 && (
        <div
          style={{
            marginTop: 20,
            padding: 12,
            borderRadius: 14,
            background: "rgba(2,6,23,0.6)",
            border: "1px solid rgba(71,85,105,0.9)",
          }}
        >
          <h3 style={{ fontSize: 14, margin: 0, marginBottom: 8 }}>
            Uploaded Files
          </h3>

          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
            {uploaded.map((f, idx) => (
              <li key={idx} style={{ marginBottom: 4 }}>
                {f.name}  
                <span style={{ color: "#64748b" }}> ({Math.round(f.size / 1024)} KB)</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* AI Extraction */}
      {uploaded && uploaded.length > 0 && (
        <button
          type="button"
          onClick={runAiExtraction}
          disabled={extracting}
          style={{
            marginTop: 18,
            padding: "10px 20px",
            borderRadius: 999,
            border: "1px solid rgba(88,28,135,0.9)",
            background:
              "radial-gradient(circle at top left,#a855f7,#7c3aed,#4c1d95)",
            color: "#f3e8ff",
            fontWeight: 600,
            cursor: extracting ? "not-allowed" : "pointer",
            fontSize: 13,
            opacity: extracting ? 0.6 : 1,
          }}
        >
          {extracting
            ? "Extracting requirements…"
            : "✨ Run AI Requirements Extraction"}
        </button>
      )}

      {/* AI Output */}
      {aiData && (
        <div
          style={{
            marginTop: 26,
            padding: 14,
            borderRadius: 14,
            background: "rgba(2,6,23,0.6)",
            border: "1px solid rgba(71,85,105,0.9)",
          }}
        >
          <h3 style={{ fontSize: 15, marginBottom: 8, color: "#e5e7eb" }}>
            📄 AI Extracted Requirements
          </h3>

          {aiData.requirements?.length === 0 && (
            <p style={{ fontSize: 12, color: "#9ca3af" }}>
              No explicit requirements detected.
            </p>
          )}

          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
            {aiData.requirements?.map((req, idx) => (
              <li key={idx} style={{ marginBottom: 6 }}>
                <strong style={{ color: "#38bdf8" }}>
                  {req.coverage || req.type}:
                </strong>{" "}
                {req.limit || req.value || "—"}
                {req.notes && (
