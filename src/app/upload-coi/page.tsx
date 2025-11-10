"use client";

import React, { useState } from "react";

export default function UploadCOIPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    try {
      setError(null);
      setResult(null);

      if (!file) {
        setError("Please select a PDF file first.");
        return;
      }

      setLoading(true);

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/extract-coi", {
        method: "POST",
        body: formData,
      });

      // ✅ Ensure valid response
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Invalid response format from server");
      }

      if (!res.ok) throw new Error(data.error || "Upload failed");

      setResult(data.result || data.message || "No structured data found.");
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message || "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0B0E17] flex flex-col items-center justify-center p-8">
      <div className="bg-[#141825] border border-gray-800 rounded-2xl p-8 shadow-xl max-w-xl w-full text-center text-white">
        <h1 className="text-3xl font-semibold mb-6">
          Upload Certificate of Insurance
        </h1>

        <div className="flex flex-col items-center gap-4">
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 
                       file:text-sm file:font-semibold file:bg-blue-600 file:text-white 
                       hover:file:bg-blue-700 cursor-pointer text-gray-300"
          />

          <button
            onClick={handleUpload}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-8 rounded-xl disabled:opacity-50"
          >
            {loading ? "Uploading..." : "Upload & Extract"}
          </button>

          {result && (
            <div className="mt-6 bg-gray-900 p-4 rounded-lg border border-gray-700 text-left text-sm text-gray-100">
              <strong>✅ Extraction Result:</strong>
              <pre className="whitespace-pre-wrap mt-2">{result}</pre>
            </div>
          )}

          {error && (
            <p className="text-red-500 font-medium mt-4">
              ❌ Error: {error}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
