import { useState, useEffect } from "react";
import { useRouter } from "next/router";

export default function VendorUpload() {
  const router = useRouter();
  const { token } = router.query;

  const [file, setFile] = useState(null);
  const [vendor, setVendor] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!token) return;

    async function fetchVendor() {
      try {
        const res = await fetch(`/api/vendors/validate?token=${token}`);
        const data = await res.json();

        if (!data.ok) throw new Error(data.error);

        setVendor(data.vendor_name);
      } catch (err) {
        setError(err.message || "Invalid upload link.");
      }
    }

    fetchVendor();
  }, [token]);

  async function handleUpload() {
    setError("");
    setSuccess("");

    if (!file) {
      setError("You must upload a PDF.");
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

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccess("COI uploaded successfully!");
    } catch (err) {
      setError(err.message || "Upload failed");
    }
  }

  return (
    <div style={{ padding: "40px" }}>
      <h1>Upload COI for {vendor || "Vendor"}</h1>

      {error && <p style={{ color: "red" }}>❌ {error}</p>}
      {success && <p style={{ color: "green" }}>✅ {success}</p>}

      {!error && (
        <>
          <p>Select your COI PDF:</p>
          <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files[0])} />
          <br /><br />
          <button onClick={handleUpload}>Upload COI</button>
        </>
      )}
    </div>
  );
}
