// components/onboarding/VendorsUploadStep.js
// Wizard Step 2 — Vendor CSV Upload (Browser parse + Backend gate release)

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient"; // ✅ THE ONLY REQUIRED CLIENT FIX

export default function VendorsUploadStep({ orgId }) {
  const [file, setFile] = useState(null);
  const [previewHeaders, setPreviewHeaders] = useState([]);
  const [previewRows, setPreviewRows] = useState([]);
  const [parsedRows, setParsedRows] = useState([]);

  const [parsing, setParsing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  function handleFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;

    setError("");
    setFile(f);
    parseCsvFile(f);
  }

  function parseCsvFile(f) {
    setParsing(true);

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const text = String(reader.result || "");

        const lines = text
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean);

        if (!lines.length) {
          throw new Error("Empty CSV");
        }

        const headers = lines[0].split(",").map((h) => h.trim());
        const rows = lines.slice(1).map((line) => {
          const cols = line.split(",");
          const obj = {};
          headers.forEach((h, i) => {
            obj[h || `col_${i}`] = (cols[i] || "").trim();
          });
          return obj;
        });

        setPreviewHeaders(headers);
        setPreviewRows(rows.slice(0, 5));
        setParsedRows(rows);
      } catch (err) {
        console.error("CSV parse failed:", err);
        setError("There was a problem parsing the CSV file.");
      } finally {
        setParsing(false);
      }
    };

    reader.onerror = () => {
      setError("Failed to read CSV file.");
      setParsing(false);
    };

    reader.readAsText(f);
  }

  async function handleUpload(e) {
    e.preventDefault();
    setError("");

    if (!file || !parsedRows.length) {
      setError("Please select a valid CSV file before continuing.");
      return;
    }

    try {
      setUploading(true);

      // ✅ CORRECT WAY: get Supabase session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error("Authentication session missing. Please refresh.");
      }

      const accessToken = session.access_token;

      const formData = new FormData();
      formData.append("file", file);
      if (orgId) formData.append("orgId", String(orgId));

      // 1️⃣ Upload CSV
      const res = await fetch("/api/onboarding/upload-vendors-csv", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });

      const json = await res.json();
      if (!json.ok) {
        throw new Error(json.error || "Upload failed.");
      }

      // 2️⃣ Re-run onboarding to RELEASE DATA GATE
      await fetch("/api/onboarding/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ orgId }),
      });

      // 3️⃣ Force observer refresh → advances to Step 3
      window.location.reload();
    } catch (err) {
      console.error("Vendor CSV upload error:", err);
      setError(err.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  const hasPreview = previewHeaders.length && previewRows.length;

  return (
    <form onSubmit={handleUpload}>
      {/* Upload */}
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
          accept=".csv,text/csv"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
        <div style={{ fontSize: 14, color: "#e5e7eb" }}>
          {file ? file.name : "Upload vendors.csv"}
        </div>
        <div style={{ fontSize: 12, color: "#9ca3af" }}>
          CSV only — vendor list + policy data
        </div>
      </label>

      {(parsing || uploading) && (
        <div style={{ marginTop: 10, fontSize: 12, color: "#a5b4fc" }}>
          {parsing ? "Parsing CSV…" : "Uploading and preparing next step…"}
        </div>
      )}

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

      {hasPreview && (
        <div
          style={{
            marginTop: 18,
            borderRadius: 14,
            border: "1px solid rgba(51,65,85,0.9)",
            background: "rgba(15,23,42,0.97)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "8px 12px",
              fontSize: 12,
              color: "#9ca3af",
              borderBottom: "1px solid rgba(51,65,85,0.9)",
            }}
          >
            Preview (first 5 rows)
          </div>

          <div style={{ maxHeight: 220, overflow: "auto", padding: 10 }}>
            <table style={{ width: "100%", fontSize: 12 }}>
              <thead>
                <tr>
                  {previewHeaders.map((h, i) => (
                    <th key={i} style={{ textAlign: "left", color: "#e5e7eb" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, r) => (
                  <tr key={r}>
                    {previewHeaders.map((h, c) => (
                      <td key={c} style={{ color: "#cbd5f5" }}>
                        {row[h] || ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={uploading || parsing}
        style={{
          marginTop: 14,
          padding: "10px 18px",
          borderRadius: 999,
          border: "1px solid rgba(56,189,248,0.9)",
          background:
            "linear-gradient(90deg,rgba(56,189,248,0.9),rgba(88,28,135,0.85))",
          color: "#e5f2ff",
          fontWeight: 600,
          cursor: uploading || parsing ? "not-allowed" : "pointer",
        }}
      >
        {uploading ? "Saving…" : "Save CSV & Continue →"}
      </button>
    </form>
  );
}
