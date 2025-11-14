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

    if (!file) return setError("Please select a file first.");

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
        setDebugResponse(text);
        throw new Error("Server returned non-JSON.");
      }
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div style={{ padding: "40px" }}>
      <Header />

      <h1>Upload Certificate of Insurance</h1>

      <input
        type="file"
        onChange={(e) => setFile(e.target.files[0] || null)}
        style={{ marginBottom: "10px" }}
      />

      <button onClick={handleUpload}>Upload COI</button>

      {error && <p style={{ color: "red" }}>❌ {error}</p>}
      {success && <p style={{ color: "green" }}>✅ {success}</p>}

      {debugResponse && (
        <pre
          style={{
            marginTop: "20px",
            padding: "12
