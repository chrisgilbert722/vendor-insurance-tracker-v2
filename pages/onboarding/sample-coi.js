// pages/onboarding/sample-coi.js
import { useState } from "react";
import OnboardingLayout from "../../components/onboarding/OnboardingLayout";

export default function OnboardingSampleCOI() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  /* ==========================================================
     FILE SELECTION (Click or Drag)
  ========================================================== */
  function handleFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      setError("Please upload a PDF file.");
      return;
    }
    setError("");
    setFile(f);
  }

  async function handleDrop(e) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are supported.");
      return;
    }
    setFile(f);
    setError("");
  }

  function handleDragOver(e) {
    e.preventDefault();
  }

  /* ==========================================================
     SUBMIT — Upload → AI Parse → Store calibration
  ========================================================== */
  async function handleAnalyzeCOI() {
    if (!file) {
      setError("Upload a COI PDF first.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccessMsg("");

      /* --------------------------------------------
         1) Upload PDF to your existing upload system
      --------------------------------------------- */
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/onboarding/upload-sample", {
        method: "POST",
        body: formData,
      });

      const uploadJson = await uploadRes.json();
      if (!uploadJson.ok) throw new Error(uploadJson.error || "Upload failed");

      const fileUrl = uploadJson.fileUrl;

      /* --------------------------------------------
         2) Send file URL to AI parser for calibration
      --------------------------------------------- */
      const aiRes = await fetch("/api/onboarding/ai/parse-sample-coi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileUrl }),
      });

      const aiJson = await aiRes.json();
      if (!aiJson.ok) throw new Error(aiJson.error || "AI parsing failed");

      /* --------------------------------------------
         3) Store AI calibration for Rules + Dashboard
      --------------------------------------------- */
      localStorage.setItem(
        "onboarding_ai_sample",
        JSON.stringify(aiJson.aiSample)
      );

      setSuccessMsg("COI analyzed successfully! AI calibration loaded.");

      /* --------------------------------------------
         4) Navigate to next onboarding step
      --------------------------------------------- */
      setTimeout(() => {
        window.location.href = "/onboarding/vendors";
      }, 900);
    } catch (err) {
      console.error(err);
      setError(err.message || "Something went wrong analyzing the COI.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <OnboardingLayout
      currentKey="sample-coi"
      title="Upload a Sample COI"
      subtitle="This helps the AI understand how your carriers, brokers, and vendors format their certificates."
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1.6fr) minmax(0,1.1fr)",
          gap: 20,
        }}
      >
        {/* LEFT SIDE — UPLOAD ZONE */}
        <div>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            style={{
              borderRadius: 16,
              border: "1px dashed rgba(148,163,184,0.8)",
              background:
                "radial-gradient(circle at top,rgba(15,23,42,0.98),rgba(15,23,42,0.96))",
              padding: 30,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
            <div
              style={{
                fontSize: 15,
                color: "#e5e7eb",
                marginBottom: 6,
              }}
            >
              Drag & drop a recent COI PDF
            </div>
            <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 16 }}>
              Or click below to select a file.
            </div>

            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              style={{ display: "none" }}
              id="coiFile"
            />
            <label htmlFor="coiFile">
              <div
                style={{
                  padding: "8px 18px",
                  borderRadius: 999,
                  border: "1px solid rgba(56,189,248,0.9)",
                  background:
                    "linear-gradient(90deg,#38bdf8,#0ea5e9,#0f172a)",
                  color: "#e5f2ff",
                  fontSize: 13,
                  cursor: "pointer",
                  display: "inline-block",
                }}
              >
                Choose File
              </div>
            </label>

            {file && (
              <div
                style={{
                  marginTop: 12,
                  color: "#a5b4fc",
                  fontSize: 12,
                }}
              >
                Selected: {file.name}
              </div>
            )}
          </div>

          {/* Upload Error / Success */}
          {error && (
            <div
              style={{
                marginTop: 12,
                padding: "10px 12px",
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

          {successMsg && (
            <div
              style={{
                marginTop: 12,
                padding: "10px 12px",
                borderRadius: 10,
                background: "rgba(21,128,61,0.85)",
                border: "1px solid rgba(74,222,128,0.8)",
                color: "#bbf7d0",
                fontSize: 13,
              }}
            >
              {successMsg}
            </div>
          )}

          {/* Submit button */}
          <button
            type="button"
            onClick={handleAnalyzeCOI}
            disabled={loading}
            style={{
              marginTop: 20,
              padding: "10px 22px",
              borderRadius: 999,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
              border: "1px solid rgba(56,189,248,0.9)",
              background:
                "linear-gradient(90deg,rgba(56,189,248,0.9),rgba(88,28,135,0.85))",
              color: "#e5f2ff",
              fontSize: 15,
              fontWeight: 600,
              boxShadow:
                "0 0 22px rgba(56,189,248,0.75),0 0 40px rgba(88,28,135,0.4)",
            }}
          >
            {loading ? "Analyzing COI…" : "Analyze COI & Continue →"}
          </button>
        </div>

        {/* RIGHT SIDE — INFO PANEL */}
        <div
          style={{
            borderRadius: 18,
            padding: 16,
            border: "1px solid rgba(148,163,184,0.55)",
            background:
              "radial-gradient(circle at top,rgba(15,23,42,0.98),rgba(15,23,42,0.96))",
            fontSize: 13,
            color: "#9ca3af",
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
            What we extract
          </h3>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li>Policy types, carriers, limits.</li>
            <li>Effective/expiration dates.</li>
            <li>Endorsements (AI, WOS, PNC, 30-day notice).</li>
            <li>Description of operations patterns.</li>
            <li>Broker formatting style.</li>
            <li>
              <strong>Calibration settings</strong> for Rules Engine & AI parser.
            </li>
          </ul>

          <p style={{ marginTop: 12, fontSize: 12, color: "#a5b4fc" }}>
            This sample COI is not stored permanently — it is used only to calibrate
            your automation engines.
          </p>
        </div>
      </div>
    </OnboardingLayout>
  );
}
