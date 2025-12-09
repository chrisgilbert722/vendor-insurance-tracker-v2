// components/onboarding/VendorsUploadStep.js
// Wizard Step 2 — Vendor CSV Upload (Browser parse + Supabase upload)

import { useState } from "react";

export default function VendorsUploadStep({ orgId, wizardState, setWizardState }) {
  const [file, setFile] = useState(null);
  const [previewHeaders, setPreviewHeaders] = useState([]);
  const [previewRows, setPreviewRows] = useState([]);
  const [parsedRows, setParsedRows] = useState([]);
  const [uploadMeta, setUploadMeta] = useState(null);

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
          .filter((l) => l.length > 0);

        if (!lines.length) {
          setError("The CSV appears to be empty.");
          setParsing(false);
          return;
        }

        const headerLine = lines[0];
        const headers = headerLine.split(",").map((h) => h.trim());
        const rows = lines.slice(1).map((line) => {
          const cols = line.split(",");
          const obj = {};
          headers.forEach((h, idx) => {
            obj[h || `col_${idx}`] = (cols[idx] || "").trim();
          });
          return obj;
        });

        setPreviewHeaders(headers);
        setPreviewRows(rows.slice(0, 5));
        setParsedRows(rows);

        // Push into wizardState so later steps can use it
        setWizardState((prev) => ({
          ...prev,
          vendorsCsv: {
            ...(prev.vendorsCsv || {}),
            headers,
            rows,
            originalName: f.name,
            orgId: orgId || null,
          },
        }));
      } catch (err) {
        console.error("CSV parse error", err);
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

    if (!file) {
      setError("Please select a CSV file before continuing.");
      return;
    }

    if (!parsedRows.length) {
      setError(
        "We couldn't parse any rows from this CSV. Double-check the file and try again."
      );
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("file", file);
      if (orgId) formData.append("orgId", String(orgId));

      const token = localStorage.getItem("supabase_token") || "";

      const res = await fetch("/api/onboarding/upload-vendors-csv", {
        method: "POST",
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : undefined,
        body: formData,
      });

      const json = await res.json();
      if (!json.ok) {
        throw new Error(json.error || "Upload failed.");
      }

      setUploadMeta(json);

      // Merge upload metadata into wizardState
      setWizardState((prev) => ({
        ...prev,
        vendorsCsv: {
          ...(prev.vendorsCsv || {}),
          headers: previewHeaders,
          rows: parsedRows,
          uploadMeta: json,
          originalName: file.name,
          orgId: orgId || null,
        },
      }));

      // NOTE: We do NOT route here. The wizard shell's "Next Step" button
      // will move the user to the next step. This step just ensures state is ready.
    } catch (err) {
      console.error("Vendor CSV upload error:", err);
      setError(err.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  const hasPreview = previewHeaders.length > 0 && previewRows.length > 0;

  return (
    <form onSubmit={handleUpload}>
      {/* Upload Zone */}
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
          accept=".csv,text/csv"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
        <div style={{ fontSize: 14, color: "#e5e7eb", marginBottom: 6 }}>
          {file ? file.name : "Drop your vendors.csv here or click to browse"}
        </div>
        <div style={{ fontSize: 12, color: "#9ca3af" }}>
          Must be a CSV file with at least vendor name and email columns.
        </div>
      </label>

      {(parsing || uploading) && (
        <div
          style={{
            marginTop: 10,
            fontSize: 12,
            color: "#a5b4fc",
          }}
        >
          {parsing
            ? "Analyzing CSV in the browser…"
            : "Uploading CSV to secure storage…"}
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

      {/* Preview */}
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
          <div
            style={{
              maxHeight: 220,
              overflow: "auto",
              padding: 10,
              fontSize: 12,
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr>
                  {previewHeaders.map((h, idx) => (
                    <th
                      key={idx}
                      style={{
                        textAlign: "left",
                        padding: "4px 6px",
                        borderBottom: "1px solid rgba(51,65,85,0.9)",
                        color: "#e5e7eb",
                        fontWeight: 500,
                      }}
                    >
                      {h || `Column ${idx + 1}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, rIdx) => (
                  <tr key={rIdx}>
                    {previewHeaders.map((h, cIdx) => (
                      <td
                        key={cIdx}
                        style={{
                          padding: "4px 6px",
                          borderBottom: "1px solid rgba(30,41,59,0.7)",
                          color: "#cbd5f5",
                        }}
                      >
                        {row[h] ?? ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subtext */}
      <p
        style={{
          marginTop: 14,
          fontSize: 12,
          color: "#9ca3af",
          lineHeight: 1.5,
        }}
      >
        Once uploaded, this CSV is stored securely and can be reused by the AI
        Setup Center for rule tuning, vendor scoring, and historical analytics.
        After this step, use the wizard’s “Next Step →” button to continue into
        column mapping and AI analysis.
      </p>

      {/* Save button (does not navigate, just ensures upload is done) */}
      <button
        type="submit"
        disabled={uploading || parsing}
        style={{
          marginTop: 10,
          padding: "8px 16px",
          borderRadius: 999,
          cursor: uploading || parsing ? "not-allowed" : "pointer",
          opacity: uploading || parsing ? 0.6 : 1,
          border: "1px solid rgba(56,189,248,0.9)",
          background:
            "linear-gradient(90deg,rgba(56,189,248,0.9),rgba(88,28,135,0.85))",
          color: "#e5f2ff",
          fontSize: 13,
          fontWeight: 600,
          boxShadow:
            "0 0 22px rgba(56,189,248,0.75),0 0 40px rgba(88,28,135,0.4)",
        }}
      >
        {uploading
          ? "Uploading CSV…"
          : parsing
          ? "Analyzing CSV…"
          : "Save CSV to Wizard State"}
      </button>
    </form>
  );
}
