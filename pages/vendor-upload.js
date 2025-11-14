import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function VendorUploadCOI() {
  const router = useRouter();
  const { token } = router.query;

  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [debugResponse, setDebugResponse] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (token) setReady(true);
  }, [token]);

  async function handleUpload() {
    setError("");
    setSuccess("");
    setDebugResponse("");

    if (!token) {
      setError("Missing or invalid upload link.");
      return;
    }

    if (!file) {
      setError("Please select a file first.");
      return;
    }

    const form = new FormData();
    form.append("file", file);
    form.append("token", token);

    try {
      const res = await fetch("/api/vendor-upload-coi", {
        method: "POST",
        body: form,
      });

      const contentType = res.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        const data = await res.json();

        if (!res.ok || !data.ok) {
          throw new Error(data.error || "Upload failed");
        }

        setSuccess("Upload successful! Your COI was received.");
        setDebugResponse(JSON.stringify(data, null, 2));
      } else {
        const text = await res.text();
        setDebugResponse(text.slice(0, 500));
        throw new Error("Server returned a non-JSON response.");
      }
    } catch (err) {
      setError(err.message || "Unknown error");
    }
  }

  return (
    <div style={{ padding: "40px" }}>
      <h1>Upload Certificate of Insurance</h1>

      {!ready && <p>Checking your upload link…</p>}

      {ready && (
        <>
          <p>
            Please upload your Certificate of Insurance PDF using the form
            below.
          </p>

          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />

          <button onClick={handleUpload} style={{ marginLeft: "10px" }}>
            Upload COI
          </button>

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
        </>
      )}
    </div>
  );
}
