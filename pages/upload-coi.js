import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

export default function UploadCOI() {
  const router = useRouter();

  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [debugResponse, setDebugResponse] = useState("");

  // 🚨 Route protection
  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) router.push("/auth/login");
    }
    checkAuth();
  }, [router]);

  async function handleUpload() {
    setError("");
    setSuccess("");
    setDebugResponse("");

    if (!file) {
      setError("Please select a PDF first.");
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
        if (!res.ok) throw new Error(data.error);

        setSuccess("Upload successful!");
        setDebugResponse(JSON.stringify(data, null, 2));
      } else {
        const text = await res.text();
        setDebugResponse(text.slice(0, 500));
        throw new Error("Server returned invalid data.");
      }
    } catch (err) {
      setError(err.message || "Unknown upload error");
    }
  }

  return (
    <div style={{ padding: "40px" }}>
      <h1>Upload Certificate of Insurance</h1>

      <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files[0])} />
      <button onClick={handleUpload} style={{ marginLeft: "12px" }}>
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
            whiteSpace: "pre-wrap",
            background: "#f7f7f7",
            fontSize: "12px",
          }}
        >
          {debugResponse}
        </pre>
      )}

      <br /><br />
      <a href="/dashboard">← Back to Dashboard</a>
    </div>
  );
}
