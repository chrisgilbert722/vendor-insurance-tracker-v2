// pages/admin/onboarding-wizard/index.js
// ==========================================================
// AI ONBOARDING WIZARD — STEP 1 (CSV IMPORTER)
// Imports CSV → Detect Columns → AI Mapping → Vendor Preview
// ==========================================================

import { useState, useEffect } from "react";
import Papa from "papaparse";
import { openai } from "../../../lib/openaiClient";
import ToastV2 from "../../../components/ToastV2";

export default function OnboardingWizardStep1() {
  const [csvFile, setCsvFile] = useState(null);
  const [rawCsvText, setRawCsvText] = useState("");
  const [csvRows, setCsvRows] = useState([]);
  const [headerColumns, setHeaderColumns] = useState([]);
  const [columnMapping, setColumnMapping] = useState({});
  const [aiSuggestedMapping, setAiSuggestedMapping] = useState({});
  const [loading, setLoading] = useState(false);

  const [toast, setToast] = useState({
    open: false,
    message: "",
    type: "success",
  });

  // Required vendor fields
  const REQUIRED_FIELDS = [
    "vendor_name",
    "email",
    "work_type",
  ];

  // Columns the system *can* accept
  const ACCEPTABLE_FIELDS = [
    "vendor_name",
    "email",
    "phone",
    "work_type",
    "address",
    "notes",
    "tags",
  ];
  // ============================================
  // HANDLE CSV DRAG + DROP
  // ============================================
  function handleCsvSelected(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      return setToast({
        open: true,
        type: "error",
        message: "Please upload a valid .csv file.",
      });
    }

    setCsvFile(file);

    Papa.parse(file, {
      header: true,
      dynamicTyping: false,
      complete: (results) => {
        setCsvRows(results.data || []);
        setHeaderColumns(results.meta.fields || []);
        setRawCsvText(results.data.slice(0, 5));
      },
    });
  }
  // ============================================
  // AI SUGGEST COLUMN MAPPING
  // ============================================
  async function handleAiSuggestMapping() {
    if (!headerColumns.length) {
      return setToast({
        open: true,
        type: "error",
        message: "Upload a CSV first.",
      });
    }

    setLoading(true);

    try {
      const prompt = `
We are onboarding vendors into a compliance platform.
Here are CSV column headers:
${JSON.stringify(headerColumns, null, 2)}

Map each header to one of these fields:

${JSON.stringify(ACCEPTABLE_FIELDS, null, 2)}

Return valid JSON ONLY with:
{
  "headerName": "mappedSystemField" | null
}
      `.trim();

      const completion = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        temperature: 0,
        messages: [
          { role: "system", content: "Return only valid JSON." },
          { role: "user", content: prompt },
        ],
      });

      let raw = completion.choices[0].message?.content || "";
      const first = raw.indexOf("{");
      const last = raw.lastIndexOf("}");
      const json = JSON.parse(raw.slice(first, last + 1));

      setAiSuggestedMapping(json);
      setColumnMapping(json);

      setToast({
        open: true,
        type: "success",
        message: "AI mapped file fields successfully.",
      });
    } catch (err) {
      console.error(err);
      setToast({
        open: true,
        type: "error",
        message: "AI could not map columns.",
      });
    } finally {
      setLoading(false);
    }
  }
  // ============================================
  // MANUAL COLUMN MAPPING UI
  // ============================================
  function renderColumnMapping() {
    if (!headerColumns.length) return null;

    return (
      <div style={{ marginTop: 20 }}>
        <h3 style={{ color: "#e5e7eb", marginBottom: 10 }}>Column Mapping</h3>
        <p style={{ fontSize: 13, color: "#9ca3af" }}>
          AI guessed the mappings. Review or override below.
        </p>

        {headerColumns.map((col, idx) => (
          <div
            key={idx}
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: 10,
              gap: 12,
            }}
          >
            <div
              style={{
                width: 200,
                color: "#e5e7eb",
                fontSize: 14,
                padding: 6,
                borderRadius: 8,
                background: "rgba(15,23,42,0.9)",
                border: "1px solid rgba(148,163,184,0.4)",
              }}
            >
              {col}
            </div>

            <select
              value={columnMapping[col] || ""}
              onChange={(e) =>
                setColumnMapping((p) => ({
                  ...p,
                  [col]: e.target.value,
                }))
              }
              style={{
                flex: 1,
                padding: "6px 10px",
                borderRadius: 8,
                background: "rgba(30,41,59,0.9)",
                color: "white",
                border: "1px solid rgba(148,163,184,0.4)",
              }}
            >
              <option value="">Ignore this column</option>
              {ACCEPTABLE_FIELDS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    );
  }
  // ============================================
  // PREVIEW FIRST 10 VENDORS
  // ============================================
  function renderPreviewTable() {
    if (!csvRows.length) return null;

    const preview = csvRows.slice(0, 10);

    return (
      <div style={{ marginTop: 30 }}>
        <h3 style={{ color: "#e5e7eb" }}>Vendor Preview (first 10)</h3>

        <table
          style={{
            width: "100%",
            marginTop: 10,
            borderCollapse: "collapse",
            color: "#e5e7eb",
            fontSize: 13,
          }}
        >
          <thead>
            <tr>
              {Object.keys(columnMapping).map((col) => (
                <th
                  key={col}
                  style={{
                    borderBottom: "1px solid rgba(148,163,184,0.4)",
                    paddingBottom: 6,
                    textAlign: "left",
                  }}
                >
                  {columnMapping[col] || "(ignored)"}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {preview.map((row, rIndex) => (
              <tr key={rIndex}>
                {Object.keys(columnMapping).map((col) => (
                  <td
                    key={col}
                    style={{
                      padding: "6px 0",
                      borderBottom: "1px solid rgba(55,65,81,0.4)",
                    }}
                  >
                    {row[col] || ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return (
    <div style={{ padding: 40, color: "white" }}>
      <h1 style={{ fontSize: 28, marginBottom: 20 }}>
        AI Onboarding Wizard — Step 1: CSV Import
      </h1>

      {/* CSV UPLOAD */}
      <div
        style={{
          border: "2px dashed rgba(148,163,184,0.4)",
          padding: 30,
          borderRadius: 16,
          background: "rgba(15,23,42,0.6)",
        }}
      >
        <input
          type="file"
          accept=".csv"
          onChange={handleCsvSelected}
          style={{ fontSize: 14, marginBottom: 10 }}
        />

        {csvFile && (
          <div style={{ marginTop: 10, fontSize: 13 }}>
            Uploaded: <strong>{csvFile.name}</strong>
          </div>
        )}

        <button
          onClick={handleAiSuggestMapping}
          disabled={!csvFile || loading}
          style={{
            marginTop: 14,
            padding: "10px 16px",
            borderRadius: 10,
            background:
              "linear-gradient(90deg,#38bdf8,#0ea5e9,#1e40af)",
            color: "white",
            cursor: "pointer",
            border: "1px solid rgba(56,189,248,0.8)",
          }}
        >
          {loading ? "Analyzing…" : "⚡ AI Map Columns"}
        </button>
      </div>

      {renderColumnMapping()}
      {renderPreviewTable()}

      <ToastV2
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((p) => ({ ...p, open: false }))}
      />
    </div>
  );
}
