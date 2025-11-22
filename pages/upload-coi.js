--- BEGIN FILE ---

// pages/upload-coi.js
import { useState } from "react";
import { useOrg } from "../context/OrgContext";
import { useRole } from "../lib/useRole";
import { useRouter } from "next/router"; // needed for vendorId

// SINGLE delay() — FIXED
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/* ===========================
   UPLOAD COI V3 — UI STATE
=========================== */

const STEP_CONFIG = [
  { id: "upload", label: "Uploading file" },
  { id: "extract", label: "Extracting fields" },
  { id: "validate", label: "Validating coverage" },
  { id: "analyze", label: "Analyzing risk" },
  { id: "done", label: "Complete" },
];

/* ===========================
   MAIN PAGE COMPONENT
=========================== */

export default function UploadCOIPage() {
  const { orgId } = useOrg();
  const { isAdmin, isManager } = useRole();
  const canUpload = isAdmin || isManager;

  const router = useRouter();
  const vendorId = router.query.vendorId; // <-- get vendorId from URL (?vendorId=123)

  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeStep, setActiveStep] = useState(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0] || null;
    setFile(f || null);
    setError("");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const f = e.dataTransfer.files?.[0];
    if (f) {
      setFile(f);
      setError("");
    }
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      setError("Attach a PDF COI file before uploading.");
      return;
    }

    if (!canUpload) {
      setError("You don’t have permission to upload COIs.");
      return;
    }

    if (!vendorId) {
      setError(
        "Missing vendorId in URL. Open this page from a vendor profile or append ?vendorId=123."
      );
      return;
    }

    setIsSubmitting(true);
    setError("");
    setResult(null);
    setActiveStep("upload");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("vendorId", vendorId); // <-- send vendorId to API

      const res = await fetch("/api/upload-coi", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(
          `Upload failed (${res.status}) — ${text || "Check server logs."}`
        );
      }

      setActiveStep("extract");
      await delay(800);

      setActiveStep("validate");
      await delay(800);

      setActiveStep("analyze");
      const data = await res.json();
      await delay(600);

      setResult(data);
      setActiveStep("done");
    } catch (err) {
      console.error(err);
      setError(
        err?.message ||
          "Something went wrong while uploading or analyzing this COI."
      );
      setActiveStep(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        position: "relative",
        background:
          "radial-gradient(circle at top left,#020617 0%, #020617 40%, #000 100%)",
        padding: "30px 40px 40px",
        color: "#e5e7eb",
        overflowX: "hidden",
      }}
    >
      {/* AURA */}
      <div
        style={{
          position: "absolute",
          top: -240,
          left: "50%",
          transform: "translateX(-50%)",
          width: 1100,
          height: 1100,
          background:
            "radial-gradient(circle, rgba(59,130,246,0.35), transparent 60%)",
          filter: "blur(120px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* HEADER */}
      <div style={{ position: "relative", zIndex: 2 }}>
        <div
          style={{
            display: "flex",
            gap: 16,
            alignItems: "center",
            marginBottom: 18,
          }}
        >
          <div
            style={{
              padding: 12,
              borderRadius: 999,
              background:
                "radial-gradient(circle at 30% 0,#0ea5e9,#6366f1,#0f172a)",
              boxShadow: "0 0 40px rgba(59,130,246,0.6)",
            }}
          >
            <span style={{ fontSize: 22 }}>📄</span>
          </div>

          <div>
            <div
              style={{
                display: "inline-flex",
                gap: 8,
                padding: "4px 10px",
                borderRadius: 999,
                border: "1px solid rgba(148,163,184,0.4)",
                background:
                  "linear-gradient(120deg,rgba(15,23,42,0.9),rgba(15,23,42,0))",
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  color: "#9ca3af",
                  letterSpacing: 1.2,
                  textTransform: "uppercase",
                }}
              >
                Upload COI V3
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: "#38bdf8",
                  letterSpacing: 1,
                  textTransform: "uppercase",
                }}
              >
                AI Processing Pipeline
              </span>
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: 26,
                fontWeight: 600,
                letterSpacing: 0.2,
              }}
            >
              Turn raw COIs into{" "}
              <span
                style={{
                  background:
                    "linear-gradient(90deg,#38bdf8,#a5b4fc,#e5e7eb)",
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                }}
              >
                structured risk data
              </span>
              .
            </h1>

            <p
              style={{
                marginTop: 6,
                marginBottom: 0,
                fontSize: 13,
                color: "#cbd5f5",
                maxWidth: 700,
              }}
            >
              Drag & drop a certificate of insurance.  
              We’ll ingest the PDF, extract coverage, limits, endorsements,  
              and expirations — then flag what matters most.
            </p>

            <div
              style={{
                marginTop: 6,
                fontSize: 11,
                color: "#9ca3af",
              }}
            >
              Vendor context:{" "}
              <span style={{ color: "#e5e7eb" }}>
                {vendorId ? `vendorId=${vendorId}` : "none (append ?vendorId=123)"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN GRID */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "grid",
          gridTemplateColumns: "minmax(0,2.1fr) minmax(0,1.4fr)",
          gap: 20,
          alignItems: "flex-start",
        }}
      >

        {/* LEFT PANEL — UPLOAD */}
        <div
          style={{
            borderRadius: 24,
            padding: 16,
            background:
              "radial-gradient(circle at top left,rgba(15,23,42,0.97),rgba(15,23,42,0.92))",
            border: "1px solid rgba(148,163,184,0.6)",
            boxShadow: "0 24px 60px rgba(15,23,42,0.98)",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <form onSubmit={handleSubmit}>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              style={{
                borderRadius: 18,
                padding: 18,
                border: `2px dashed ${isDragging ? "#38bdf8" : "rgba(75,85,99,0.9)"}`,
                background: isDragging
                  ? "rgba(56,189,248,0.08)"
                  : "rgba(15,23,42,0.9)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                cursor: "pointer",
                transition: "border 0.2s ease, background 0.2s ease",
              }}
              onClick={() => {
                if (!canUpload) return;
                const input = document.getElementById("coi-upload-input");
                if (input) input.click();
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "999px",
                  background:
                    "radial-gradient(circle at 30% 0,#38bdf8,#1d4ed8,#020617)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 0 30px rgba(56,189,248,0.5)",
                }}
              >
                <span style={{ fontSize: 26 }}>⬆️</span>
              </div>

              <div
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: "#e5e7eb",
                }}
              >
                {file ? file.name : "Drop COI PDF here or click to browse"}
              </div>

              <div
                style={{
                  fontSize: 12,
                  color: "#9ca3af",
                }}
              >
                PDF only · max 25MB  
                <br />
                Org:{" "}
                <span style={{ color: "#e5e7eb" }}>
                  {orgId || "(Org context active)"}
                </span>
              </div>

              <input
                id="coi-upload-input"
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                style={{ display: "none" }}
                disabled={!canUpload}
              />
            </div>

            {error && (
              <div
                style={{
                  marginTop: 12,
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: "1px solid rgba(248,113,113,0.8)",
                  background: "rgba(127,29,29,0.9)",
                  color: "#fecaca",
                  fontSize: 12,
                }}
              >
                {error}
              </div>
            )}

            <div
              style={{
                marginTop: 14,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 8,
              }}
            >
              <button
                type="submit"
                disabled={isSubmitting || !canUpload}
                style={{
                  borderRadius: 999,
                  padding: "9px 16px",
                  border: "1px solid rgba(59,130,246,0.9)",
                  background:
                    "radial-gradient(circle at top left,#3b82f6,#1d4ed8,#0f172a)",
                  color: "#e5f2ff",
                  fontSize: 13,
                  fontWeight: 500,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: isSubmitting || !canUpload ? "not-allowed" : "pointer",
                  opacity: isSubmitting || !canUpload ? 0.6 : 1,
                }}
              >
                {isSubmitting ? (
                  <>
                    <span
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: "999px",
                        border: "2px solid rgba(191,219,254,0.7)",
                        borderTopColor: "transparent",
                        animation: "spin 0.8s linear infinite",
                      }}
                    />
                    <span>Uploading &amp; analyzing…</span>
                  </>
                ) : (
                  <>Upload &amp; analyze COI</>
                )}
              </button>

              <div
                style={{
                  fontSize: 10,
                  color: "#6b7280",
                }}
              >
                POST → <code>/api/upload-coi</code>
              </div>
            </div>
          </form>

          {/* Steps */}
          <div>
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 1.2,
                color: "#9ca3af",
                marginBottom: 8,
              }}
            >
              Processing pipeline
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${STEP_CONFIG.length}, minmax(0,1fr))`,
                gap: 8,
              }}
            >
              {STEP_CONFIG.map((step, index) => {
                const isActive = activeStep === step.id;
                const isCompleted =
                  activeStep &&
                  STEP_CONFIG.findIndex((s) => s.id === activeStep) > index;

                const bg = isCompleted
                  ? "rgba(34,197,94,0.12)"
                  : isActive
                  ? "rgba(56,189,248,0.16)"
                  : "rgba(15,23,42,0.9)";

                const border = isCompleted
                  ? "1px solid rgba(34,197,94,0.9)"
                  : isActive
                  ? "1px solid rgba(56,189,248,0.8)"
                  : "1px solid rgba(51,65,85,0.9)";

                return (
                  <div
                    key={step.id}
                    style={{
                      borderRadius: 14,
                      padding: "8px 10px",
                      background: bg,
                      border,
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      minHeight: 60,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          textTransform: "uppercase",
                          color: "#e5e7eb",
                        }}
                      >
                        Step {index + 1}
                      </span>
                      <span style={{ fontSize: 11, color: "#9ca3af" }}>
                        {isCompleted
                          ? "Done"
                          : isActive
                          ? "In progress"
                          : "Pending"}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#cbd5f5",
                      }}
                    >
                      {step.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL — RESULTS */}
        <div
          style={{
            borderRadius: 24,
            padding: 16,
            background:
              "radial-gradient(circle at top right,rgba(15,23,42,0.96),rgba(15,23,42,1))",
            border: "1px solid rgba(148,163,184,0.55)",
            boxShadow: "0 24px 60px rgba(15,23,42,0.98)",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            minHeight: 260,
          }}
        >
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 1.2,
              color: "#9ca3af",
              marginBottom: 4,
            }}
          >
            COI Summary
          </div>

          {!result && (
            <div
              style={{
                fontSize: 12,
                color: "#9ca3af",
              }}
            >
              Upload a certificate to see extracted carrier,  
              policy, coverage, endorsements, and risk data here.
            </div>
          )}

          {result && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div
                style={{
                  display: "grid",
