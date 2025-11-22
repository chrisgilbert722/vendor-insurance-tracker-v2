// pages/upload-coi.js
import { useState } from "react";
import { useOrg } from "../context/OrgContext";
import { useRole } from "../lib/useRole";
import { useRouter } from "next/router";

// SINGLE delay() — required for animations
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// UI step config
const STEP_CONFIG = [
  { id: "upload", label: "Uploading file" },
  { id: "extract", label: "Extracting fields" },
  { id: "validate", label: "Validating coverage" },
  { id: "analyze", label: "Analyzing risk" },
  { id: "done", label: "Complete" }
];

export default function UploadCOIPage() {
  const { orgId } = useOrg();
  const { isAdmin, isManager } = useRole();
  const canUpload = isAdmin || isManager;

  const router = useRouter();
  const vendorId = router.query.vendorId;

  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeStep, setActiveStep] = useState(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* ---------------------
        EVENT HANDLERS
  ---------------------- */

  const handleFileChange = (e) => {
    setFile(e.target.files?.[0] || null);
    setError("");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
    setIsDragging(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) return setError("Attach a PDF COI file.");
    if (!canUpload) return setError("You do not have permission.");
    if (!vendorId) return setError("Missing vendorId in the URL.");

    setIsSubmitting(true);
    setError("");
    setResult(null);
    setActiveStep("upload");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("vendorId", vendorId);

      const res = await fetch("/api/upload-coi", {
        method: "POST",
        body: formData
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Upload failed");
      }

      // UI pipeline simulation
      setActiveStep("extract");
      await delay(700);

      setActiveStep("validate");
      await delay(700);

      setActiveStep("analyze");
      const data = await res.json();
      await delay(600);

      setResult(data);
      setActiveStep("done");
    } catch (err) {
      console.error(err);
      setError(err.message || "Upload error");
      setActiveStep(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ---------------------
        RENDER START
  ---------------------- */

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "30px 40px 40px",
        background:
          "radial-gradient(circle at top left,#020617 0%, #020617 40%, #000 100%)",
        color: "#e5e7eb",
        position: "relative"
      }}
    >
      {/* PAGE HEADER */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, marginBottom: 6 }}>
          Upload COI{" "}
          <span
            style={{
              background: "linear-gradient(90deg,#38bdf8,#a5b4fc,#e5e7eb)",
              WebkitBackgroundClip: "text",
              color: "transparent"
            }}
          >
            (V3)
          </span>
        </h1>

        <div style={{ fontSize: 12, color: "#9ca3af" }}>
          Vendor context:{" "}
          <span style={{ color: "#e5e7eb" }}>
            {vendorId ? `vendorId=${vendorId}` : "none — append ?vendorId=123"}
          </span>
        </div>
      </div>

      {/* MAIN GRID */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,2fr) minmax(0,1fr)",
          gap: 24
        }}
      >
        {/* LEFT: Upload */}
        <div
          style={{
            padding: 20,
            borderRadius: 24,
            background: "rgba(15,23,42,0.96)",
            border: "1px solid rgba(148,163,184,0.5)"
          }}
        >
          <form onSubmit={handleSubmit}>
            {/* DROPZONE */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => {
                if (canUpload) document.getElementById("coi-file").click();
              }}
              style={{
                padding: 22,
                borderRadius: 18,
                border: `2px dashed ${
                  isDragging ? "#38bdf8" : "rgba(75,85,99,0.9)"
                }`,
                background: isDragging
                  ? "rgba(56,189,248,0.1)"
                  : "rgba(15,23,42,0.9)",
                textAlign: "center",
                cursor: canUpload ? "pointer" : "not-allowed"
              }}
            >
              <div style={{ fontSize: 14, marginBottom: 6 }}>
                {file ? file.name : "Drop COI PDF or click to browse"}
              </div>
              <div style={{ fontSize: 11, color: "#9ca3af" }}>
                PDF • Max 25MB • Org {orgId || "(none)"}
              </div>

              <input
                id="coi-file"
                type="file"
                accept="application/pdf"
                style={{ display: "none" }}
                onChange={handleFileChange}
              />
            </div>

            {/* ERROR */}
            {error && (
              <div
                style={{
                  marginTop: 12,
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: "1px solid rgba(248,113,113,0.8)",
                  background: "rgba(127,29,29,0.9)",
                  color: "#fecaca",
                  fontSize: 12
                }}
              >
                {error}
              </div>
            )}

            {/* BUTTON */}
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                marginTop: 16,
                padding: "10px 18px",
                borderRadius: 999,
                border: "1px solid rgba(59,130,246,0.9)",
                background:
                  "radial-gradient(circle at top left,#3b82f6,#1d4ed8,#0f172a)",
                color: "white",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                opacity: isSubmitting ? 0.6 : 1
              }}
            >
              {isSubmitting ? "Processing…" : "Upload & Analyze"}
            </button>
          </form>

          {/* PIPELINE STEPS */}
          <div style={{ marginTop: 20 }}>
            <div
              style={{
                fontSize: 12,
                marginBottom: 8,
                color: "#9ca3af",
                textTransform: "uppercase"
              }}
            >
              Processing Pipeline
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${STEP_CONFIG.length},1fr)`,
                gap: 10
              }}
            >
              {STEP_CONFIG.map((s, i) => {
                const isActive = activeStep === s.id;
                const isDone =
                  activeStep &&
                  STEP_CONFIG.findIndex((x) => x.id === activeStep) > i;

                return (
                  <div
                    key={s.id}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 12,
                      background: isDone
                        ? "rgba(34,197,94,0.12)"
                        : isActive
                        ? "rgba(56,189,248,0.15)"
                        : "rgba(15,23,42,0.85)",
                      border: isDone
                        ? "1px solid rgba(34,197,94,0.8)"
                        : isActive
                        ? "1px solid rgba(56,189,248,0.8)"
                        : "1px solid rgba(75,85,99,0.8)",
                      fontSize: 12
                    }}
                  >
                    Step {i + 1}
                    <br />
                    <span style={{ fontSize: 11, color: "#cbd5f5" }}>
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT: Output */}
        <div
          style={{
            padding: 20,
            borderRadius: 24,
            background: "rgba(15,23,42,0.96)",
            border: "1px solid rgba(148,163,184,0.5)"
          }}
        >
          {!result ? (
            <div style={{ fontSize: 12, color: "#9ca3af" }}>
              Once analyzed, extracted data will appear here.
            </div>
          ) : (
            <pre
              style={{
                marginTop: 10,
                padding: 12,
                borderRadius: 14,
                background: "#020617",
                border: "1px solid rgba(30,64,175,0.8)",
                fontSize: 11,
                maxHeight: 400,
                overflow: "auto",
                whiteSpace: "pre-wrap"
              }}
            >
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
