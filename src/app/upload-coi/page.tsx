"use client";

import { useState } from "react";

export default function UploadCOI() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return setError("Please select a PDF file first.");

    setError(null);
    setResult(null);
    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/extract-coi", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok || !data.ok) throw new Error(data.error || "Extraction failed.");
      setResult(data.extracted);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#0f111a] text-white p-6">
      <div className="max-w-lg w-full bg-[#141826] border border-gray-800 rounded-2xl p-8 shadow-lg">
        <h1 className="text-3xl font-bold text-center mb-6">
          Upload Certificate of Insurance
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="bg-gray-900 text-sm rounded-lg border border-gray-700 p-2 w-full"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-semibold"
          >
            {loading ? "Extracting..." : "Upload & Extract"}
          </button>
        </form>

        {error && (
          <p className="text-red-500 text-center mt-4">❌ Error: {error}</p>
        )}

        {result && (
          <div className="mt-6 bg-gray-900 p-4 rounded-lg border border-gray-700">
            <h2 className="text-xl font-semibold mb-2">✅ Extraction Result:</h2>
            <p><strong>Carrier:</strong> {result.carrier || "N/A"}</p>
            <p><strong>Policy #:</strong> {result.policyNumber || "N/A"}</p>
            <p><strong>Expiration:</strong> {result.expirationDate || "N/A"}</p>
          </div>
        )}
      </div>
    </main>
  );
}
