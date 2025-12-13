// components/DocumentsUpload.js
import { useState } from "react";
import { uploadFileToStorage } from "../lib/uploadFileToStorage";
import axios from "axios";

export default function DocumentsUpload({ orgId, vendorId, onDocumentUploaded }) {
  const [file, setFile] = useState(null);
  const [documentType, setDocumentType] = useState("COI");
  const [expiresOn, setExpiresOn] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => setFile(e.target.files[0]);

  const handleUpload = async () => {
    if (!file) return alert("Select a file first");
    setLoading(true);

    try {
      // 1️⃣ Upload file to local storage or S3
      const fileUrl = await uploadFileToStorage(file);

      // 2️⃣ Save record in DB
      const { data } = await axios.post("/api/vendor/documents/upload", {
        orgId,
        vendorId,
        documentType,
        fileName: file.name,
        fileUrl,
        expiresOn: expiresOn || null,
      });

      if (!data.ok) throw new Error(data.error || "Upload failed");

      // 3️⃣ Inject into documents hub
      onDocumentUploaded(data.document);

      // Reset form
      setFile(null);
      setDocumentType("COI");
      setExpiresOn("");
    } catch (err) {
      console.error(err);
      alert(err.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 mb-4">
      <select
        value={documentType}
        onChange={(e) => setDocumentType(e.target.value)}
        className="border p-1 rounded"
      >
        <option value="COI">COI</option>
        <option value="W9">W-9</option>
        <option value="License">License</option>
        <option value="Contract">Contract</option>
      </select>

      <input type="date" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} />

      <input type="file" onChange={handleFileChange} />

      <button
        onClick={handleUpload}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {loading ? "Uploading..." : "Upload Document"}
      </button>
    </div>
  );
}
