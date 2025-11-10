"use client";
import React, { useState } from "react";

export default function UploadCOIPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async () => {
    try {
      setError(null);
      setStatus("Uploading...");
      if (!file) throw new Error("Please select a PDF file first.");

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/extract-coi", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed.");

      setStatus(json.result || "✅ Extraction completed successfully!");
    } catch (e: any) {
      setError(e.message);
      setStatus(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#0B0E17] text-white flex flex-col items-center justify-center p-8">
      <div className="bg-[#141825] p-8 rounded-2xl shadow-xl max-w-lg w-full text-center">
        <h1 className="text-3xl font-bold mb-6">Upload Certificate of Insurance</h1>
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 
                     file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer text-gray-300 mb-4"
        />
        <button
          onClick={handleUpload}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-xl w-full"
        >
          Upload & Extract
        </button>

        {status && <p className="mt-4 text-green-400">{status}</p>}
        {error && <p className="mt-4 text-red-500">❌ {error}</p>}
      </div>
    </main>
  );
}
