// pages/upload-coi.js
import { useState, useEffect } from "react";
import { useOrg } from "../context/OrgContext";
import { useRole } from "../lib/useRole";
import { useRouter } from "next/router";
import DocumentViewerV3 from "../components/documents/DocumentViewerV3";

// simple helper for step animation
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

// Map ?type= to pretty labels
function getTypeLabel(type) {
  if (!type) return null;
  const t = String(type).toLowerCase();
  if (t === "gl") return "General Liability COI";
  if (t === "wc") return "Workers' Compensation COI";
  if (t === "auto") return "Auto Liability COI";
  if (t === "umbrella") return "Umbrella / Excess COI";
  if (t === "generic") return "Insurance document";
  return null;
}

/* ===========================
   MAIN PAGE COMPONENT
=========================== */

export default function UploadCOIPage() {
  const { activeOrgId } = useOrg();
  const { isAdmin, isManager } = useRole();
  const canUpload = isAdmin || isManager;

  const router = useRouter();
  const vendorIdFromUrl = router.query.vendorId;
  const uploadType = router.query.type || null;
  const expectedLabel = getTypeLabel(uploadType);

  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeStep, setActiveStep] = useState(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Document Viewer V3 state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [fileUrl, setFileUrl] = useState(null);
  const [extracted, setExtracted] = useState(null);

  // Vendor selection state (for when vendorId is not in URL)
  const [selectedVendorId, setSelectedVendorId] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [showVendorPicker, setShowVendorPicker] = useState(false);
  const [pendingUploadResult, setPendingUploadResult] = useState(null);

  // Effective vendorId: from URL or user selection
  const vendorId = vendorIdFromUrl || selectedVendorId;

  // Load vendors for picker when needed
  useEffect(() => {
    if (showVendorPicker && activeOrgId && vendors.length === 0) {
      loadVendors();
    }
    // Also preload vendors if no vendorId (anticipate picker)
    if (!vendorId && activeOrgId && vendors.length === 0 && !loadingVendors) {
      loadVendors();
    }
  }, [showVendorPicker, activeOrgId, vendorId]);

  async function loadVendors() {
    if (!activeOrgId) return;
    setLoadingVendors(true);
    try {
      const res = await fetch(`/api/vendors?orgId=${activeOrgId}`);
      const data = await res.json();
      if (data.ok && data.vendors) {
        setVendors(data.vendors);
      }
    } catch (err) {
      console.error("Failed to load vendors:", err);
    } finally {
      setLoadingVendors(false);
    }
  }

  /* ------------ handlers ----------- */

  const handleFileChange = (e) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
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

  // FIXED: Upload handler does NOT require vendorId
  // Upload always proceeds, vendor picker shown AFTER upload if needed
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      setError("Attach a PDF COI file before uploading.");
      return;
    }

    if (!canUpload) {
      setError("You don't have permission to upload COIs.");
      return;
    }

    // FIXED: Always proceed with upload, pass vendorId if available
    // Vendor picker will be shown AFTER upload completes if no vendor selected
    await performUpload(file, vendorId || null);
  };

  async function performUpload(uploadFile, vId) {
    setIsSubmitting(true);
    setError("");
    setResult(null);
    setActiveStep("upload");
    setViewerOpen(false);
    setFileUrl(null);
    setExtracted(null);

    // Track if we need to show vendor picker after upload
    const needsVendorSelection = !vId;

    try {
      const formData = new FormData();
      formData.append("file", uploadFile);

      // FIXED: Only append vendorId if we have one
      if (vId) {
        formData.append("vendorId", vId);
      }

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
      await delay(700);

      setActiveStep("validate");
      await delay(700);

      setActiveStep("analyze");
      const data = await res.json();
      await delay(600);

      setResult(data);

      if (data?.fileUrl) {
        setFileUrl(data.fileUrl);
        setExtracted(data.extracted || null);
        setViewerOpen(true);
      }

      setActiveStep("done");

      // FIXED: Show vendor picker AFTER successful upload if no vendor was selected
      if (needsVendorSelection) {
        setPendingUploadResult(data);
        setShowVendorPicker(true);
      }
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
  }

  // FIXED: Handle vendor selection after upload
  function handleVendorSelect(vId) {
    setSelectedVendorId(vId);
    setShowVendorPicker(false);

    // If we have a pending upload, link it to the selected vendor
    if (pendingUploadResult) {
      // Update result to show vendor association
      setResult({
        ...pendingUploadResult,
        linkedVendorId: vId,
        vendorLinked: true,
      });

      // If the upload returned a document/policy ID, we could call an API here
      // to associate it with the vendor. For now, we track it client-side.
      const docId = pendingUploadResult?.documentId || pendingUploadResult?.policyId;
      if (docId) {
        // Fire event to notify other components
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("coi:linked", {
            detail: { documentId: docId, vendorId: vId }
          }));
        }
      }

      setPendingUploadResult(null);
    }
  }

  /* ------------ render ----------- */

  // Show loading state while router initializes
  if (!router.isReady) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background:
            "radial-gradient(circle at top left,#020617 0%, #020617 40%, #000 100%)",
          padding: "30px 40px 40px",
          color: "#e5e7eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "999px",
              border: "3px solid rgba(56,189,248,0.3)",
              borderTopColor: "#38bdf8",
              animation: "spin 1s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          <div style={{ fontSize: 14, color: "#9ca3af" }}>Loading...</div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

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

      {/* HEADER + EXPECTED DOCUMENT BANNER */}
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
              Drag & drop a certificate of insurance. We'll ingest the PDF,
              extract coverage, limits, endorsements, and expirations, then flag
              what matters most — all in one cinematic pipeline.
            </p>

            {/* Vendor context indicator */}
            <div
              style={{
                marginTop: 6,
                fontSize: 11,
                color: "#9ca3af",
              }}
            >
              {vendorId ? (
                <>
                  Vendor context:{" "}
                  <span style={{ color: "#22c55e" }}>
                    vendorId={vendorId}
                  </span>
                </>
              ) : (
                <span style={{ color: "#38bdf8" }}>
                  Upload first — select vendor after
                </span>
              )}
            </div>

            {/* MAGICALLY GUIDED DOCUMENT TYPE (Option D) */}
            {expectedLabel && (
              <div
                style={{
                  marginTop: 8,
                  padding: "8px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(34,197,94,0.7)",
                  background:
                    "linear-gradient(120deg,rgba(22,163,74,0.2),rgba(5,46,22,0.7))",
                  color: "#bbf7d0",
                  fontSize: 12,
                  display: "inline-flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: 1.1,
                    color: "#86efac",
                  }}
                >
                  Expected Document (from AI Fix Mode)
                </span>
                <span>
                  Please upload a{" "}
                  <strong style={{ color: "#f9fafb" }}>
                    {expectedLabel}
                  </strong>{" "}
                  to continue your compliance fix.
                </span>
                <span style={{ fontSize: 11, color: "#bbf7d0" }}>
                  If this doesn't look right, you can still upload any COI —
                  we'll analyze it automatically.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* VENDOR PICKER MODAL - Shows AFTER upload when no vendor was selected */}
      {showVendorPicker && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              borderRadius: 24,
              padding: 24,
              maxWidth: 480,
              width: "90%",
              background:
                "radial-gradient(circle at top left,rgba(15,23,42,0.98),rgba(15,23,42,0.95))",
              border: "1px solid rgba(56,189,248,0.5)",
              boxShadow: "0 24px 60px rgba(0,0,0,0.9)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 12,
              }}
            >
              <span style={{ fontSize: 24 }}>✅</span>
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 18,
                    fontWeight: 600,
                    color: "#22c55e",
                  }}
                >
                  COI Uploaded Successfully
                </h3>
                <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>
                  Now select which vendor this COI belongs to
                </p>
              </div>
            </div>

            {loadingVendors ? (
              <div style={{ padding: 20, textAlign: "center", color: "#9ca3af" }}>
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "999px",
                    border: "2px solid rgba(56,189,248,0.3)",
                    borderTopColor: "#38bdf8",
                    animation: "spin 1s linear infinite",
                    margin: "0 auto 8px",
                  }}
                />
                Loading vendors...
              </div>
            ) : vendors.length === 0 ? (
              <div
                style={{
                  padding: 20,
                  textAlign: "center",
                  color: "#9ca3af",
                  borderRadius: 12,
                  border: "1px dashed rgba(75,85,99,0.6)",
                  background: "rgba(15,23,42,0.5)",
                }}
              >
                <div style={{ marginBottom: 8 }}>No vendors found.</div>
                <div style={{ fontSize: 12 }}>
                  Create a vendor first, then link this COI.
                </div>
              </div>
            ) : (
              <div
                style={{
                  maxHeight: 300,
                  overflow: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {vendors.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => handleVendorSelect(v.id)}
                    style={{
                      padding: "12px 16px",
                      borderRadius: 12,
                      border: "1px solid rgba(51,65,85,0.8)",
                      background: "rgba(15,23,42,0.9)",
                      color: "#e5e7eb",
                      fontSize: 14,
                      textAlign: "left",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      transition: "border-color 0.15s ease, background 0.15s ease",
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.borderColor = "rgba(56,189,248,0.8)";
                      e.currentTarget.style.background = "rgba(30,58,138,0.3)";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.borderColor = "rgba(51,65,85,0.8)";
                      e.currentTarget.style.background = "rgba(15,23,42,0.9)";
                    }}
                  >
                    <span>{v.name}</span>
                    {v.email && (
                      <span style={{ fontSize: 12, color: "#9ca3af" }}>
                        {v.email}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
              <button
                onClick={() => {
                  setShowVendorPicker(false);
                  setPendingUploadResult(null);
                }}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  borderRadius: 999,
                  border: "1px solid rgba(75,85,99,0.8)",
                  background: "rgba(15,23,42,0.9)",
                  color: "#9ca3af",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Skip for now
              </button>
              <button
                onClick={() => router.push("/vendors")}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  borderRadius: 999,
                  border: "1px solid rgba(59,130,246,0.9)",
                  background:
                    "radial-gradient(circle at top left,#3b82f6,#1d4ed8,#0f172a)",
                  color: "#e5f2ff",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Create Vendor
              </button>
            </div>
          </div>
        </div>
      )}

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
        {/* LEFT — Upload & Steps */}
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
          {/* Upload section */}
          <form onSubmit={handleSubmit}>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              style={{
                borderRadius: 18,
                padding: 18,
                border: `2px dashed ${
                  isDragging ? "#38bdf8" : "rgba(75,85,99,0.9)"
                }`,
                background: isDragging
                  ? "rgba(56,189,248,0.08)"
                  : "rgba(15,23,42,0.9)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                cursor: canUpload ? "pointer" : "not-allowed",
                transition: "border-color 0.2s ease, background 0.2s ease",
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
                PDF only · max 25MB · tied to org{" "}
                <span style={{ color: "#e5e7eb" }}>
                  {activeOrgId || "(Org context active)"}
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
              {/* FIXED: Button is ALWAYS clickable (only disabled when submitting or no permission) */}
              <button
                type="submit"
                disabled={isSubmitting || !canUpload || !file}
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
                  cursor: isSubmitting || !canUpload || !file ? "not-allowed" : "pointer",
                  opacity: isSubmitting || !canUpload || !file ? 0.6 : 1,
                }}
              >
                {isSubmitting ? "Uploading & analyzing…" : "Upload & analyze COI"}
              </button>

              <div
                style={{
                  fontSize: 10,
                  color: "#6b7280",
                }}
              >
                {vendorId
                  ? "COI will be attached to selected vendor"
                  : "Select vendor after upload"}
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

        {/* RIGHT — COI SUMMARY / RAW OUTPUT */}
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
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 4,
            }}
          >
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 1.2,
                color: "#9ca3af",
              }}
            >
              COI Summary
            </div>

            {result?.fileUrl && (
              <button
                type="button"
                onClick={() => setViewerOpen(true)}
                style={{
                  borderRadius: 999,
                  padding: "6px 12px",
                  border: "1px solid rgba(56,189,248,0.9)",
                  background:
                    "radial-gradient(circle at top left,#38bdf8,#0ea5e9,#0f172a)",
                  color: "#e5f2ff",
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Open PDF Viewer
              </button>
            )}
          </div>

          {/* Show vendor linked status */}
          {result?.vendorLinked && (
            <div
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: "1px solid rgba(34,197,94,0.7)",
                background: "rgba(22,163,74,0.15)",
                color: "#bbf7d0",
                fontSize: 12,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span>✅</span>
              <span>
                COI linked to vendor ID: <strong>{result.linkedVendorId}</strong>
              </span>
            </div>
          )}

          {!result && (
            <div
              style={{
                fontSize: 12,
                color: "#9ca3af",
              }}
            >
              Upload a certificate to see extracted carrier, policy, coverage,
              limits, endorsement, and risk data here. We'll render the raw JSON
              response plus a readable summary.
            </div>
          )}

          {result && (
            <pre
              style={{
                margin: 0,
                borderRadius: 14,
                background: "#020617",
                border: "1px solid rgba(30,64,175,0.9)",
                padding: 10,
                fontSize: 11,
                maxHeight: 260,
                overflow: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </div>
      </div>

      {/* DOCUMENT VIEWER V3 */}
      <DocumentViewerV3
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        fileUrl={fileUrl}
        title="Uploaded COI"
        extracted={extracted}
      />
    </div>
  );
}
