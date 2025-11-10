"use client";

import React, { useState } from "react";

export default function UploadCOI() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const handleUpload = async () => {
    try {
      setError(null);
      setResult(null);

      if (!file) {
        setError("Please select a PDF first.");
        return;
      }

      setLoading(true);

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/extract-coi", {
        method: "POST",
        body: formData,
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Invalid JSON from server");
      }

      if (!res.ok) throw new Error(data.error || "Upload failed");

      setResult(data.result || "Extraction completed successfully!");
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0B0E17] p-6">
      <div className="bg-[#141825] text-white p-8 rounded-2xl shadow-lg w-full max-w-lg text-center">
        <h1 className="text-2xl font-bold mb-4">
          Upload Certificate of Insurance
        </h1>

        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="block w-full text-gray-300 border border-gray-700 rounded-lg p-2 mb-4 cursor-pointer file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700"
        />

        <button
          onClick={handleUpload}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-3 px-6 rounded-xl w-full"
        >
          {loading ? "Uploading..." : "Upload & Extract"}
        </button>

        {error && (
          <p className="text-red-500 mt-4 font-medium">❌ {error}</p>
        )}

        {result && (
          <div className="mt-4 text-left bg-gray-900 p-3 rounded-lg border border-gray-700 text-sm">
            <strong>✅ Extraction Result:</strong>
            <pre className="whitespace-pre-wrap mt-2">{result}</pre>
          </div>
        )}
      </div>
    </main>
  );
}
