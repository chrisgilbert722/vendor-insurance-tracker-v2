// pages/vendor/portal/[token].js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

const GP = {
  bg: "#020617",
  panel: "rgba(15,23,42,0.98)",
  border: "rgba(51,65,85,0.9)",
  neonBlue: "#38bdf8",
  neonGreen: "#22c55e",
  neonGold: "#facc15",
  neonRed: "#fb7185",
  text: "#e5e7eb",
  textSoft: "#9ca3af",
};

export default function VendorPortal() {
  const router = useRouter();
  const { token } = router.query;

  const [loading, setLoading] = useState(true);
  const [vendorData, setVendorData] = useState(null);
  const [error, setError] = useState("");

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");

  const [selectedFile, setSelectedFile] = useState(null);

  /* ============================================================
     LOAD PORTAL DATA
  ============================================================ */
  useEffect(() => {
    if (!token) return;

    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`/api/vendor/portal?token=${token}`);
        const json = await res.json();
        if (!json.ok) throw new Error(json.error || "Invalid link");

        setVendorData(json);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [token]);

  /* ============================================================
     HANDLE FILE INPUT
  ============================================================ */
  function handleFileInput(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      setUploadError("Only PDF files allowed.");
      return;
    }
    setUploadError("");
    setSelectedFile(f);
  }

  function handleDrop(e) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      setUploadError("Only PDF files allowed.");
      return;
    }
    setSelectedFile(f);
    setUploadError("");
  }

  function handleDragOver(e) {
    e.preventDefault();
  }

  /* ============================================================
     UPLOAD + PARSE COI
  ============================================================ */
  async function handleUpload() {
    if (!selectedFile) {
      setUploadError("Please choose a COI PDF first.");
      return;
    }

    try {
      setUploading(true);
      setUploadError("");
      setUploadSuccess("");

      // 1) Upload to /api/vendor/upload-coi
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("token", token);

      const uploadRes = await fetch("/api/vendor/upload-coi", {
        method: "POST",
        body: formData,
      });

      const json = await uploadRes.json();
      if (!json.ok) throw new Error(json.error || "Upload failed");

      setUploadSuccess("Uploaded! Parsing your COI…");

      // 2) Update UI with new AI data
      setVendorData((prev) => ({
        ...prev,
        ai: json.ai,
        alerts: json.alerts,
        status: { state: json.status, label: json.status.toUpperCase() },
      }));

      setTimeout(() => {
        setUploadSuccess("COI analyzed successfully!");
      }, 600);

    } catch (err) {
      setUploadError(err.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  /* ============================================================
     BASIC LOADING + ERROR UI
  ============================================================ */
  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background:
            "radial-gradient(circle at top left,#020617 0,#020617 45%,#000)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: GP.textSoft,
        }}
      >
        Loading vendor portal…
      </div>
    );
  }

  if (error || !vendorData) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background:
            "radial-gradient(circle at top,#020617 0,#020617 45%,#000)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: GP.text,
          textAlign: "center",
        }}
      >
        <div>
          <div style={{ fontSize: 50 }}>⚠️</div>
          <div style={{ fontSize: 18 }}>Invalid or expired vendor link.</div>
        </div>
      </div>
    );
  }

  const { vendor, org, requirements, alerts, status, ai } = vendorData;

  /* ============================================================
     UI START
  ============================================================ */
  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top,#020617 0,#020617 45%,#000)",
        padding: "32px 24px",
        color: GP.text,
      }}
    >
      {/* HEADER */}
      <div
        style={{
          maxWidth: 1150,
          margin: "0 auto 24px auto",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div style={{ fontSize: 12, color: GP.textSoft, textTransform: "uppercase" }}>
            Vendor Compliance Portal
          </div>

          <h1
            style={{
              margin: "4px 0",
              fontSize: 28,
              background: "linear-gradient(90deg,#38bdf8,#a855f7,#22c55e)",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            {vendor?.name}
          </h1>

          <div style={{ fontSize: 13, color: GP.textSoft }}>
            For {org?.name}
          </div>
        </div>

        {/* STATUS */}
        <div
          style={{
            padding: "6px 14px",
            borderRadius: 999,
            border: `1px solid ${GP.border}`,
            background: "rgba(15,23,42,0.9)",
            textAlign: "right",
          }}
        >
          <div style={{ fontSize: 11, color: GP.textSoft }}>Status</div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color:
                status?.state === "compliant"
                  ? GP.neonGreen
                  : status?.state === "pending"
                  ? GP.neonGold
                  : GP.neonRed,
            }}
          >
            {status?.label || "Pending"}
          </div>
        </div>
      </div>

      {/* MAIN GRID */}
      <div
        style={{
          maxWidth: 1150,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "minmax(0,1.7fr) minmax(0,1.1fr)",
          gap: 24,
        }}
      >
        {/* LEFT SIDE — UPLOAD */}
        <div>
          <div
            style={{
              borderRadius: 20,
              padding: 20,
              border: `1px dashed ${GP.border}`,
              background: "rgba(15,23,42,0.92)",
            }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <h3 style={{ marginTop: 0, color: GP.text }}>Upload COI PDF</h3>

            <input
              id="coiUpload"
              type="file"
              accept="application/pdf"
              style={{ display: "none" }}
              onChange={handleFileInput}
            />

            <label htmlFor="coiUpload">
              <div
                style={{
                  padding: "8px 16px",
                  borderRadius: 999,
                  background: "linear-gradient(90deg,#38bdf8,#0ea5e9)",
                  cursor: "pointer",
                  display: "inline-block",
                }}
              >
                Choose File
              </div>
            </label>

            {selectedFile && (
              <div style={{ marginTop: 10, fontSize: 12, color: GP.neonBlue }}>
                Selected: {selectedFile.name}
              </div>
            )}

            {uploadError && (
              <div
                style={{
                  marginTop: 10,
                  padding: 10,
                  borderRadius: 8,
                  background: "rgba(127,29,29,0.8)",
                  border: "1px solid #f87171",
                  color: "#fecaca",
                }}
              >
                {uploadError}
              </div>
            )}

            {uploadSuccess && (
              <div
                style={{
                  marginTop: 10,
                  padding: 10,
                  borderRadius: 8,
                  background: "rgba(16,185,129,0.2)",
                  border: "1px solid #4ade80",
                  color: "#bbf7d0",
                }}
              >
                {uploadSuccess}
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={uploading}
              style={{
                marginTop: 18,
                padding: "10px 20px",
                borderRadius: 999,
                border: `1px solid ${GP.neonBlue}`,
                background: "linear-gradient(90deg,#38bdf8,#0ea5e9)",
                color: "#e5f2ff",
                cursor: uploading ? "not-allowed" : "pointer",
              }}
            >
              {uploading ? "Uploading & Analyzing…" : "Upload & Analyze COI →"}
            </button>
          </div>

          {/* AI EXTRACTED POLICIES */}
          {ai && (
            <div
              style={{
                marginTop: 24,
                borderRadius: 20,
                padding: 20,
                border: `1px solid ${GP.border}`,
                background: "rgba(15,23,42,0.92)",
              }}
            >
              <h3 style={{ marginTop: 0 }}>Extracted Policies</h3>
              <pre
                style={{
                  background: "rgba(2,6,23,0.6)",
                  padding: 12,
                  borderRadius: 12,
                  fontSize: 12,
                  overflowX: "auto",
                }}
              >
                {JSON.stringify(ai.policies, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* RIGHT SIDE — Alerts + Requirements */}
        <div>
          <div
            style={{
              borderRadius: 20,
              padding: 18,
              border: `1px solid ${GP.border}`,
              background: "rgba(15,23,42,0.92)",
              marginBottom: 24,
            }}
          >
            <h3 style={{ marginTop: 0 }}>Issues to Fix</h3>
            {alerts?.length ? (
              <ul style={{ paddingLeft: 18 }}>
                {alerts.map((a, i) => (
                  <li key={i} style={{ marginBottom: 6 }}>
                    <strong
                      style={{
                        color:
                          a.severity === "critical"
                            ? GP.neonRed
                            : a.severity === "high"
                            ? GP.neonGold
                            : GP.neonBlue,
                      }}
                    >
                      {a.label || a.code}
                    </strong>
                    : {a.message}
                  </li>
                ))}
              </ul>
            ) : (
              <div style={{ color: GP.textSoft }}>No issues detected.</div>
            )}
          </div>

          <div
            style={{
              borderRadius: 20,
              padding: 18,
              border: `1px solid ${GP.border}`,
              background: "rgba(15,23,42,0.92)",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Coverage Requirements</h3>
            <ul style={{ paddingLeft: 18 }}>
              {(requirements?.coverages || []).map((c, i) => (
                <li key={i}>
                  <strong style={{ color: "#e5e7eb" }}>{c.name}</strong>{" "}
                  {c.limit && `— ${c.limit}`}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
