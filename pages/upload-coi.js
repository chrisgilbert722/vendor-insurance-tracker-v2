import { useState } from "react";
import Header from "../components/Header";

export default function UploadCOI() {
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [debugResponse, setDebugResponse] = useState("");

  async function handleUpload() {
    setError("");
    setSuccess("");
    setDebugResponse("");

    if (!file) {
      setError("Please select a file first.");
      return;
    }

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch("/api/extract-coi", {
        method: "POST",
        body: form,
      });

      const contentType = res.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Upload failed");
        }

        setSuccess("Upload successful!");
        setDebugResponse(JSON.stringify(data, null, 2));
      } else {
        const text = await res.text();
        setDebugResponse(text);
        throw new Error("Server returned non-JSON response.");
      }
    } catch (err) {
      setError(err.message || "Unknown error");
    }
  }

  return (
    <div style={{ padding: "40px" }}>
      <Header />

      <h1>Upload Certificate of Insurance</h1>

      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        style={{ marginBottom: "10px" }}
      />

      <button onClick={handleUpload} style={{ padding: "8px 16px" }}>
        Upload COI
      </button>

      {error && <p style={{ color: "red", marginTop: "10px" }}>❌ {error}</p>}
      {success && (
        <p style={{ color: "green", marginTop: "10px" }}>✅ {success}</p>
      )}

      {debugResponse && (
        <pre
          style={{
            marginTop: "20px",
            padding: "12px",
            border: "1px solid #ccc",
            background: "#f7f7f7",
            maxWidth: "800px",
            whiteSpace: "pre-wrap",
            fontSize: "12px",
          }}
        >
          {debugResponse}
        </pre>
      )}

      <br />
      <br />
      <a href="/dashboard">Go to Dashboard →</a>
    </div>
  );
}
