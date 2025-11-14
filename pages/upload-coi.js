import { useState } from "react";

export default function UploadCOI() {
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleUpload() {
    setError("");
    setSuccess("");

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

      const text = await res.text();

      // Prevent JSON crash
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Server returned invalid JSON");
      }

      if (!res.ok) throw new Error(data.error);

      setSuccess("Upload successful!");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div style={{ padding: "40px" }}>
      <h1>Upload Certificate of Insurance</h1>

      <input
        type="file"
        onChange={(e) => setFile(e.target.files[0])}
      />

      <button onClick={handleUpload}>Upload COI</button>

      {error && <p style={{ color: "red" }}>❌ {error}</p>}
      {success && <p style={{ color: "green" }}>✅ {success}</p>}

      <br /><br />
      <a href="/dashboard">Go to Dashboard →</a>
    </div>
  );
}
