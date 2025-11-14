import { useState } from "react";

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

      // Try to detect JSON vs non-JSON
      const contentType = res.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Upload failed");
        }

        setSuccess("Upload successful!");
        setDebugResponse(JSON.stringify(data, null, 2));
      } else {
        // Not JSON – read raw text so we can see what the server sent
        const text = await res.text();
        setDebugResponse(text.slice(0, 500)); // show first 500 chars
        throw new Error("Server returned a non-JSON response.");
      }
    } catch (err) {
      setError(err.message || "Unknown error");
    }
  }

  return (
    <div style={{ padding: "40px" }}>
      <h1>Upload Certificate of Insurance</h1>

      <input
        type="file"
        onChange={(e) => setFile(e.target.files[0] || null)}
      />

      <button onClick={handleUpload}>Upload COI</button>

      {error && <p style={{ color: "red" }}>❌ {error}</p>}
      {success && <p style={{ color: "green" }}>✅ {success}</p>}

      {debugResponse && (
        <pre
          style={{
            marginTop: "20px",
            padding: "12px",
            border: "1px solid #ccc",
            maxWidth: "800px",
            whiteSpace: "pre-wrap",
            fontSize: "12px",
            background: "#f7f7f7",
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
