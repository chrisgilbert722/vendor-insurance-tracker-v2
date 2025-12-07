// pages/admin/onboarding-wizard/index.js
// ==========================================================
// AI ONBOARDING WIZARD — STEP 1 (CSV IMPORTER)
// NOW USING LOCAL PAPAPARSE (TURBOPACK SAFE)
// FULL COCKPIT V9 WEAPONIZED THEME APPLIED
// ==========================================================

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { openai } from "../../../lib/openaiClient";
import ToastV2 from "../../../components/ToastV2";
import CockpitWizardLayout from "../../../components/CockpitWizardLayout";   // ✅ NEW

export default function OnboardingWizardStep1() {
  const router = useRouter();

  const [csvFile, setCsvFile] = useState(null);
  const [csvRows, setCsvRows] = useState([]);
  const [headerColumns, setHeaderColumns] = useState([]);
  const [columnMapping, setColumnMapping] = useState({});
  const [aiSuggestedMapping, setAiSuggestedMapping] = useState({});
  const [loading, setLoading] = useState(false);
  const [Papa, setPapa] = useState(null);

  const [toast, setToast] = useState({
    open: false,
    message: "",
    type: "success",
  });

  // -----------------------------------------------------------
  // LOAD PAPAPARSE FROM PUBLIC FOLDER
  // -----------------------------------------------------------
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "/vendor/papaparse.min.js";
    script.onload = () => setPapa(window.Papa);
    document.body.appendChild(script);
  }, []);

  const ACCEPTABLE_FIELDS = [
    "vendor_name",
    "email",
    "phone",
    "work_type",
    "address",
    "notes",
    "tags",
  ];

  // -----------------------------------------------------------
  // HANDLE CSV UPLOAD
  // -----------------------------------------------------------
  async function handleCsvSelected(e) {
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

    if (!Papa) {
      return setToast({
        open: true,
        type: "error",
        message: "CSV engine loading… try again.",
      });
    }

    Papa.parse(file, {
      header: true,
      dynamicTyping: false,
      complete: (results) => {
        setCsvRows(results.data || []);
        setHeaderColumns(results.meta.fields || []);
      },
    });
  }

  // -----------------------------------------------------------
  // AI MAP COLUMNS
  // -----------------------------------------------------------
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
Map each CSV header to a known vendor field:

${JSON.stringify(ACCEPTABLE_FIELDS)}

CSV headers:
${JSON.stringify(headerColumns)}

Return JSON ONLY:
{
  "headerName": "systemField" | null
}
      `.trim();

      const completion = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        temperature: 0,
        messages: [
          { role: "system", content: "Return valid JSON only." },
          { role: "user", content: prompt },
        ],
      });

      let raw = completion.choices[0].message?.content?.trim() || "";
      const json = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));

      setAiSuggestedMapping(json);
      setColumnMapping(json);

      setToast({
        open: true,
        type: "success",
        message: "AI mapped CSV to system fields.",
      });
    } catch (err) {
      console.error(err);
      setToast({
        open: true,
        type: "error",
        message: "AI could not map fields.",
      });
    } finally {
      setLoading(false);
    }
  }

  // -----------------------------------------------------------
  // CONTINUE → STEP 2
  // -----------------------------------------------------------
  function goToStep2() {
    if (!csvRows.length) {
      return setToast({
        open: true,
        type: "error",
        message: "Upload CSV before continuing.",
      });
    }

    const vendors = csvRows.map((row) => {
      const mapped = {};
      for (const col in columnMapping) {
        const key = columnMapping[col];
        if (key) mapped[key] = row[col];
      }
      return mapped;
    });

    localStorage.setItem("onboardingVendors", JSON.stringify(vendors));
    router.push("/admin/onboarding-wizard/step2");
  }

  // -----------------------------------------------------------
  // RENDER COLUMN MAPPING UI
  // -----------------------------------------------------------
  function renderColumnMapping() {
    if (!headerColumns.length) return null;

    return (
      <div style={{ marginTop: 30 }}>
        <h3 style={{ marginBottom: 10 }}>Column Mapping</h3>

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
                fontSize: 14,
                padding: 6,
                borderRadius: 10,
                background: "rgba(15,23,42,0.9)",
                border: "1px solid rgba(148,163,184,0.4)",
              }}
            >
              {col}
            </div>

            <select
              value={columnMapping[col] || ""}
              onChange={(e) =>
                setColumnMapping((prev) => ({
                  ...prev,
                  [col]: e.target.value,
                }))
              }
              style={{
                flex: 1,
                padding: "6px 10px",
                borderRadius: 10,
                background: "rgba(31,41,55,0.95)",
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

  // -----------------------------------------------------------
  // VENDOR PREVIEW TABLE
  // -----------------------------------------------------------
  function renderPreviewTable() {
    if (!csvRows.length) return null;

    const preview = csvRows.slice(0, 10);

    return (
      <div style={{ marginTop: 30 }}>
        <h3>Vendor Preview (first 10 rows)</h3>

        <table
          style={{
            width: "100%",
            marginTop: 10,
            borderCollapse: "collapse",
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
                    textAlign: "left",
                    paddingBottom: 4,
                  }}
                >
                  {columnMapping[col] || "(ignored)"}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {preview.map((row, idx) => (
              <tr key={idx}>
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

  // -----------------------------------------------------------
  // PAGE OUTPUT (WRAPPED IN COCKPIT V9)
  // -----------------------------------------------------------
  return (
    <CockpitWizardLayout>
      <div style={{ position: "relative", zIndex: 3 }}>
        <h1 style={{ fontSize: 28, marginBottom: 20 }}>
          AI Onboarding Wizard — Step 1 (CSV Import)
        </h1>

        {/* UPLOAD BOX */}
        <div
          style={{
            borderRadius: 22,
            padding: 24,
            background: "rgba(15,23,42,0.78)",
            border: "1px solid rgba(80,120,255,0.35)",
            boxShadow:
              "0 0 35px rgba(64,106,255,0.25), inset 0 0 28px rgba(20,30,60,0.5)",
            backdropFilter: "blur(12px)",
          }}
        >
          <input type="file" accept=".csv" onChange={handleCsvSelected} />

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
              borderRadius: 12,
              background:
                "linear-gradient(90deg,#38bdf8,#0ea5e9,#1e40af)",
              border: "1px solid rgba(56,189,248,0.8)",
              color: "white",
              cursor: "pointer",
            }}
          >
            {loading ? "Analyzing…" : "⚡ AI Map Columns"}
          </button>
        </div>

        {renderColumnMapping()}
        {renderPreviewTable()}

        {/* CONTINUE BUTTON */}
        {csvRows.length > 0 && (
          <button
            onClick={goToStep2}
            style={{
              marginTop: 30,
              padding: "12px 20px",
              borderRadius: 12,
              background: "linear-gradient(90deg,#38bdf8,#0ea5e9)",
              border: "1px solid rgba(56,189,248,0.8)",
              color: "white",
              cursor: "pointer",
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            Continue → Step 2
          </button>
        )}

        <ToastV2
          open={toast.open}
          type={toast.type}
          message={toast.message}
          onClose={() =>
            setToast((prev) => ({
              ...prev,
              open: false,
            }))
          }
        />
      </div>
    </CockpitWizardLayout>
  );
}
