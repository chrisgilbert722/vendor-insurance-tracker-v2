// pages/vendor-upload.js
// ============================================================
// PUBLIC VENDOR UPLOAD PAGE — No login required
// Vendors access via secure token link to upload COI/docs
// ============================================================

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";

// ============================================================
// TOAST COMPONENT
// ============================================================
function Toast({ open, message, type, onClose }) {
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => onClose(), 4000);
      return () => clearTimeout(timer);
    }
  }, [open, onClose]);

  if (!open) return null;

  const bgColor =
    type === "success"
      ? "rgba(22,163,74,0.95)"
      : type === "error"
      ? "rgba(220,38,38,0.95)"
      : "rgba(59,130,246,0.95)";

  return (
    <div
      style={{
        position: "fixed",
        top: 20,
        right: 20,
        zIndex: 9999,
        padding: "12px 20px",
        borderRadius: 12,
        background: bgColor,
        color: "#fff",
        fontSize: 14,
        fontWeight: 500,
        boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
      }}
    >
      {message}
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================
export default function VendorUploadPage() {
  const router = useRouter();
  const { token } = router.query;
  const fileInputRef = useRef(null);

  // State
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  // Toast state
  const [toast, setToast] = useState({ open: false, message: "", type: "info" });

  function showToast(message, type = "info") {
    setToast({ open: true, message, type });
  }

  // Validate token on mount
  useEffect(() => {
    if (!router.isReady) return;
    if (!token) {
      setError("Missing upload token. Please use the link provided in your email.");
      setLoading(false);
      return;
    }

    validateToken(token);
  }, [router.isReady, token]);

  async function validateToken(t) {
    try {
      setLoading(true);
      const res = await fetch(`/api/vendors/validate-token?token=${t}`);
      const data = await res.json();

      if (!data.ok) {
        setError(data.error || "Invalid or expired upload link.");
        return;
      }

      setVendor(data.vendor);
    } catch (err) {
      console.error("Token validation error:", err);
      setError("Unable to validate upload link. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // File handlers
  function handleFileChange(e) {
    const f = e.target.files?.[0] || null;
    if (f) {
      setFile(f);
      showToast(`File selected: ${f.name}`, "success");
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    const f = e.dataTransfer.files?.[0];
    if (f) {
      setFile(f);
      showToast(`File dropped: ${f.name}`, "success");
    }
    setIsDragging(false);
  }

  function handleDragOver(e) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDropZoneClick() {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }

  // Upload handler
  async function handleUpload() {
    if (!file || !token) {
      showToast("Please select a file first", "error");
      return;
    }

    setUploading(true);
    showToast("Uploading document...", "info");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("token", token);

      const res = await fetch("/api/vendors/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!data.ok) {
        showToast(data.error || "Upload failed", "error");
        return;
      }

      setUploadResult(data);
      setUploadComplete(true);
      showToast("Document uploaded successfully!", "success");
    } catch (err) {
      console.error("Upload error:", err);
      showToast("Upload failed. Please try again.", "error");
    } finally {
      setUploading(false);
    }
  }

  function handleUploadAnother() {
    setFile(null);
    setUploadComplete(false);
    setUploadResult(null);
  }

  // Loading state
  if (!router.isReady || loading) {
    return (
      <Page>
        <div style={{ textAlign: "center", padding: 60 }}>
          <Spinner />
          <div style={{ marginTop: 16, fontSize: 14, color: "#9ca3af" }}>
            Validating upload link...
          </div>
        </div>
      </Page>
    );
  }

  // Error state
  if (error) {
    return (
      <Page>
        <div style={{ textAlign: "center", padding: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ margin: 0, fontSize: 22, color: "#fb7185", marginBottom: 8 }}>
            Upload Link Error
          </h2>
          <p style={{ fontSize: 14, color: "#9ca3af", maxWidth: 400, margin: "0 auto" }}>
            {error}
          </p>
          <p style={{ marginTop: 20, fontSize: 12, color: "#6b7280" }}>
            Please contact your administrator for a new upload link.
          </p>
        </div>
      </Page>
    );
  }

  // Success state
  if (uploadComplete) {
    return (
      <Page>
        <Toast
          open={toast.open}
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, open: false })}
        />

        <div style={{ textAlign: "center", padding: 40 }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: "radial-gradient(circle at 30% 0,#22c55e,#15803d,#0f172a)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
              boxShadow: "0 0 40px rgba(34,197,94,0.5)",
            }}
          >
            <span style={{ fontSize: 36 }}>✓</span>
          </div>

          <h2 style={{ margin: 0, fontSize: 24, color: "#e5e7eb", marginBottom: 8 }}>
            Document Uploaded Successfully
          </h2>

          <p style={{ fontSize: 14, color: "#9ca3af", marginBottom: 24 }}>
            Your document has been received and will be reviewed by the compliance team.
          </p>

          {uploadResult?.certificate && (
            <div
              style={{
                padding: 16,
                borderRadius: 12,
                background: "rgba(15,23,42,0.9)",
                border: "1px solid rgba(34,197,94,0.5)",
                marginBottom: 24,
                textAlign: "left",
                maxWidth: 400,
                margin: "0 auto 24px",
              }}
            >
              <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8 }}>
                Upload Details
              </div>
              <div style={{ fontSize: 13, color: "#e5e7eb" }}>
                File: {uploadResult.certificate.file_name}
              </div>
            </div>
          )}

          <button
            onClick={handleUploadAnother}
            style={{
              padding: "12px 24px",
              borderRadius: 999,
              border: "1px solid rgba(56,189,248,0.9)",
              background: "radial-gradient(circle at top left,#3b82f6,#1d4ed8,#0f172a)",
              color: "#e5f2ff",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              marginRight: 12,
            }}
          >
            Upload Another Document
          </button>
        </div>
      </Page>
    );
  }

  // Main upload form
  return (
    <Page>
      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, open: false })}
      />

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            display: "inline-flex",
            gap: 8,
            padding: "4px 12px",
            borderRadius: 999,
            border: "1px solid rgba(148,163,184,0.4)",
            background: "linear-gradient(120deg,rgba(15,23,42,0.9),rgba(15,23,42,0.7))",
            marginBottom: 10,
          }}
        >
          <span style={{ fontSize: 10, color: "#9ca3af", letterSpacing: 1.2, textTransform: "uppercase" }}>
            Vendor Portal
          </span>
          <span style={{ fontSize: 10, color: "#22c55e", letterSpacing: 1, textTransform: "uppercase" }}>
            Secure Upload
          </span>
        </div>

        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 600, color: "#e5e7eb" }}>
          Upload{" "}
          <span
            style={{
              background: "linear-gradient(90deg,#38bdf8,#a5b4fc,#e5e7eb)",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            Insurance Documents
          </span>
        </h1>

        <p style={{ marginTop: 8, fontSize: 13, color: "#9ca3af" }}>
          Upload your Certificate of Insurance (COI), licenses, or other compliance documents.
        </p>

        {vendor && (
          <div
            style={{
              marginTop: 12,
              padding: "10px 14px",
              borderRadius: 12,
              background: "rgba(15,23,42,0.8)",
              border: "1px solid rgba(56,189,248,0.4)",
              display: "inline-block",
            }}
          >
            <div style={{ fontSize: 11, color: "#9ca3af" }}>Uploading for:</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "#38bdf8" }}>
              {vendor.name}
            </div>
          </div>
        )}
      </div>

      {/* Upload Zone */}
      <div
        onClick={handleDropZoneClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        style={{
          borderRadius: 20,
          padding: 40,
          border: `2px dashed ${isDragging ? "#38bdf8" : file ? "#22c55e" : "rgba(75,85,99,0.9)"}`,
          background: isDragging
            ? "rgba(56,189,248,0.08)"
            : file
            ? "rgba(22,163,74,0.08)"
            : "rgba(15,23,42,0.8)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          cursor: "pointer",
          transition: "all 0.2s ease",
          marginBottom: 24,
        }}
      >
        <div
          style={{
            width: 70,
            height: 70,
            borderRadius: "50%",
            background: file
              ? "radial-gradient(circle at 30% 0,#22c55e,#15803d,#020617)"
              : "radial-gradient(circle at 30% 0,#38bdf8,#1d4ed8,#020617)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: file ? "0 0 30px rgba(34,197,94,0.5)" : "0 0 30px rgba(56,189,248,0.5)",
          }}
        >
          <span style={{ fontSize: 32 }}>{file ? "✓" : "📄"}</span>
        </div>

        <div style={{ fontSize: 16, fontWeight: 500, color: "#e5e7eb" }}>
          {file ? file.name : "Drop document here or click to browse"}
        </div>

        <div style={{ fontSize: 12, color: "#9ca3af" }}>
          PDF, PNG, JPG accepted · Max 25MB
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
      </div>

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={uploading || !file}
        style={{
          width: "100%",
          borderRadius: 999,
          padding: "14px 24px",
          border: "1px solid rgba(34,197,94,0.9)",
          background: uploading
            ? "rgba(34,197,94,0.3)"
            : "radial-gradient(circle at top left,#22c55e,#16a34a,#0f172a)",
          color: "#e5f2ff",
          fontSize: 15,
          fontWeight: 600,
          cursor: uploading || !file ? "not-allowed" : "pointer",
          opacity: !file ? 0.5 : 1,
          boxShadow: file ? "0 0 30px rgba(34,197,94,0.4)" : "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
        }}
      >
        {uploading ? (
          <>
            <Spinner small />
            Uploading...
          </>
        ) : (
          "Upload Document"
        )}
      </button>

      {/* Security Notice */}
      <div
        style={{
          marginTop: 24,
          padding: 14,
          borderRadius: 12,
          background: "rgba(15,23,42,0.6)",
          border: "1px solid rgba(51,65,85,0.6)",
          fontSize: 12,
          color: "#9ca3af",
          textAlign: "center",
        }}
      >
        <span style={{ color: "#22c55e" }}>🔒</span> This is a secure upload link.
        Your documents are encrypted and only accessible to authorized personnel.
      </div>
    </Page>
  );
}

// ============================================================
// COMPONENTS
// ============================================================
function Page({ children }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        position: "relative",
        background: "radial-gradient(circle at top left,#020617 0%, #020617 40%, #000 100%)",
        padding: "40px 20px",
        color: "#e5e7eb",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
      }}
    >
      {/* Aura */}
      <div
        style={{
          position: "absolute",
          top: -240,
          left: "50%",
          transform: "translateX(-50%)",
          width: 900,
          height: 900,
          background: "radial-gradient(circle, rgba(56,189,248,0.25), transparent 60%)",
          filter: "blur(140px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Card */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          width: "100%",
          maxWidth: 520,
          borderRadius: 24,
          padding: 28,
          background: "radial-gradient(circle at top left,rgba(15,23,42,0.98),rgba(15,23,42,0.94))",
          border: "1px solid rgba(148,163,184,0.55)",
          boxShadow: "0px 24px 60px rgba(15,23,42,0.95), 0px 0px 45px rgba(56,189,248,0.15)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Spinner({ small }) {
  return (
    <div
      style={{
        width: small ? 18 : 40,
        height: small ? 18 : 40,
        borderRadius: "50%",
        border: `${small ? 2 : 3}px solid rgba(56,189,248,0.3)`,
        borderTopColor: "#38bdf8",
        animation: "spin 1s linear infinite",
        margin: small ? 0 : "0 auto",
      }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
