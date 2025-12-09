// pages/onboarding/vendors-upload.js
// Step 2 — Vendor CSV Upload (Browser parse + Supabase upload)

import { useState } from "react";
import { useRouter } from "next/router";
import { useOrg } from "../../context/OrgContext";
import OnboardingLayout from "../../components/onboarding/OnboardingLayout";

export default function OnboardingVendorsUpload() {
  const router = useRouter();
  const { activeOrgId } = useOrg() || {};

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

        // Persist to localStorage so AiWizardPanel / later wizard steps can read it
        try {
          const snapshot = {
            headers,
            rows,
            orgId: activeOrgId || null,
            originalName: f.name,
          };
          localStorage.setItem(
            "onboarding_vendors_csv_snapshot",
            JSON.stringify(snapshot)
          );
        } catch (err) {
          console.warn("Could not store CSV snapshot:", err);
        }
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

  async function handleUploadAndContinue(e) {
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
      if (activeOrgId) formData.append("orgId", String(activeOrgId));

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

      // Store combined state (parsed rows + storage info) for the wizard
      try {
        const combined = {
          headers: previewHeaders,
          rows: parsedRows,
          uploadMeta: json,
          orgId: activeOrgId || null,
          originalName: file.name,
        };
        localStorage.setItem(
          "onboarding_vendors_csv",
          JSON.stringify(combined)
        );
      } catch (err) {
        console.warn("Could not persist onboarding_vendors_csv:", err);
      }

      // For now, go to the next logical onboarding step route.
      // When fully wired into AiWizard wizard shell, this will just call goNext().
      router.push("/onboarding/insurance");
    } catch (err) {
      console.error("Vendor CSV upload error:", err);
      setError(err.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <OnboardingLayout
      currentKey="vendors-upload"
      title="Upload Your Vendor List (CSV)"
      subtitle="Upload a CSV export of your vendors so the AI can analyze coverage gaps, map requirements, and pre-build rules."
    >
      <form onSubmit={handleUploadAndContinue}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1.5fr) minmax(0,1.2fr)",
            gap: 20,
          }}
        >
          {/* LEFT: Upload + Preview */}
          <div>
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

            {/* Parsing / Upload state */}
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

            {/* Preview */}
            {previewHeaders.length > 0 && previewRows.length > 0 && (
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
                                borderBottom:
                                  "1px solid rgba(30,41,59,0.7)",
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

            {/* Continue button */}
            <button
              type="submit"
              disabled={uploading || parsing}
              style={{
                marginTop: 20,
                padding: "10px 22px",
                borderRadius: 999,
                cursor: uploading || parsing ? "not-allowed" : "pointer",
                opacity: uploading || parsing ? 0.6 : 1,
                border: "1px solid rgba(56,189,248,0.9)",
                background:
                  "linear-gradient(90deg,rgba(56,189,248,0.9),rgba(88,28,135,0.85))",
                color: "#e5f2ff",
                fontSize: 14,
                fontWeight: 600,
                boxShadow:
                  "0 0 22px rgba(56,189,248,0.75),0 0 40px rgba(88,28,135,0.4)",
              }}
            >
              {uploading
                ? "Uploading CSV…"
                : parsing
                ? "Analyzing CSV…"
                : "Save & Continue →"}
            </button>
          </div>

          {/* RIGHT: Info Panel */}
          <div
            style={{
              borderRadius: 18,
              padding: 16,
              border: "1px solid rgba(148,163,184,0.55)",
              background:
                "radial-gradient(circle at top,rgba(15,23,42,0.98),rgba(15,23,42,0.96))",
              fontSize: 13,
              color: "#9ca3af",
              lineHeight: 1.5,
            }}
          >
            <h3
              style={{
                marginTop: 0,
                marginBottom: 8,
                fontSize: 15,
                color: "#e5e7eb",
              }}
            >
              Why CSV onboarding is your unfair advantage
            </h3>

            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>
                AI can instantly pre-screen your entire vendor list and highlight
                the highest-risk vendors to focus on first.
              </li>
              <li>
                Bulk onboarding allows you to go live with hundreds of vendors in
                minutes, not weeks.
              </li>
              <li>
                Competitors still onboard vendors manually or one-by-one — your
                CSV + AI pipeline makes them look ancient.
              </li>
            </ul>

            <p
              style={{
                marginTop: 14,
                fontSize: 12,
                color: "#a5b4fc",
              }}
            >
              Once uploaded, this CSV is stored securely and can be reused by the
              AI setup center for rule tuning, vendor scoring, and historical
              analytics.
            </p>
          </div>
        </div>
      </form>
    </OnboardingLayout>
  );
}
