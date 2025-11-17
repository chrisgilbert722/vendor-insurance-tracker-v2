import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function VendorUploadPage() {
  const router = useRouter();
  const { vendor } = router.query; // expecting ?vendor=123

  const [vendorId, setVendorId] = useState(null);
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | uploading | done | error
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (vendor) {
      const id = parseInt(vendor, 10);
      if (!Number.isNaN(id)) setVendorId(id);
    }
  }, [vendor]);

  async function handleUpload() {
    setError("");
    setResult(null);

    if (!vendorId) {
      setError("Missing or invalid vendor link.");
      return;
    }
    if (!file) {
      setError("Please select a COI PDF to upload.");
      return;
    }

    setStatus("uploading");

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("vendorId", String(vendorId));

      // ⭐ GLOBAL ELITE UPLOAD ENDPOINT ⭐
      const res = await fetch(`/api/vendors/upload?vendorId=${vendorId}`, {
        method: "POST",
        body: form,
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setResult(data);
      setStatus("done");
    } catch (err) {
      console.error("Vendor upload failed:", err);
      setError(err.message || "Unknown upload error");
      setStatus("error");
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f3f4f6",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "520px",
          background: "#ffffff",
          borderRadius: "16px",
          padding: "24px 26px",
          boxShadow: "0 10px 30px rgba(15,23,42,0.12)",
          border: "1px solid #e5e7eb",
        }}
      >
        <p
          style={{
            fontSize: "11px",
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            color: "#94a3b8",
            marginBottom: "6px",
          }}
        >
          G-Track · Vendor COI Upload
        </p>

        <h1
          style={{
            fontSize: "22px",
            marginBottom: "8px",
            color: "#0f172a",
          }}
        >
          Upload your Certificate of Insurance
        </h1>

        <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "16px" }}>
          Please upload a current COI PDF. Our system will read it and attach it
          to your record automatically.
        </p>

        {!vendorId && (
          <div
            style={{
              marginBottom: "12px",
              padding: "10px 12px",
              borderRadius: "8px",
              background: "#fee2e2",
              color: "#b91c1c",
              fontSize: "12px",
            }}
          >
            Invalid or missing upload link. Please contact the requester for a
            fresh link.
          </div>
        )}

        {vendorId && (
          <>
            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  fontSize: "13px",
                  color: "#0f172a",
                  fontWeight: 500,
                }}
              >
                COI PDF File
              </label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                style={{
                  marginTop: "6px",
                  width: "100%",
                  fontSize: "13px",
                }}
              />
              <p
                style={{
                  fontSize: "11px",
                  color: "#9ca3af",
                  marginTop: "4px",
                }}
              >
                Accepted format: PDF only.
              </p>
            </div>

            <button
              onClick={handleUpload}
              disabled={status === "uploading" || !vendorId}
              style={{
                width: "100%",
                padding: "10px 0",
                borderRadius: "999px",
                border: "none",
                cursor:
                  status === "uploading" || !vendorId ? "not-allowed" : "pointer",
                background:
                  status === "uploading" || !vendorId
                    ? "#cbd5f5"
                    : "#0f172a",
                color:
                  status === "uploading" || !vendorId
                    ? "#6b7280"
                    : "#f9fafb",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              {status === "uploading"
                ? "Uploading…"
                : status === "done"
                ? "Uploaded"
                : "Upload COI"}
            </button>
          </>
        )}

        {error && (
          <p
            style={{
              marginTop: "12px",
              fontSize: "12px",
              color: "#b91c1c",
            }}
          >
            ⚠ {error}
          </p>
        )}

        {status === "done" && result && (
          <div
            style={{
              marginTop: "16px",
              padding: "12px",
              borderRadius: "10px",
              background: "#ecfdf5",
              border: "1px solid #6ee7b7",
              fontSize: "12px",
              color: "#065f46",
            }}
          >
            <p style={{ marginBottom: "4px", fontWeight: 600 }}>
              COI received and processed.
            </p>
            <p style={{ marginBottom: "4px" }}>
              Policy #{result.extracted.policy_number || "—"} —{" "}
              {result.extracted.carrier || "Unknown carrier"}
            </p>
            <p style={{ marginBottom: "4px" }}>
              Coverage: {result.extracted.coverage_type || "—"}
            </p>
            <p style={{ marginBottom: "4px" }}>
              Effective: {result.extracted.effective_date || "—"} | Expires:{" "}
              {result.extracted.expiration_date || "—"}
            </p>
            <p style={{ marginTop: "4px" }}>
              You can close this page. The requesting team has been updated.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
