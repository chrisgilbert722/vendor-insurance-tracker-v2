"use client";

import React, { useState } from "react";

export default function UploadCOIPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setMessage("Please choose a PDF file first.");
      return;
    }

    try {
      setLoading(true);
      setMessage("Uploading…");

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/extract-coi", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Upload failed");

      setMessage("✅ Upload & extraction successful!");
    } catch (err: any) {
      setMessage(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0B0E17] text-white flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full bg-[#141825] border border-gray-800 rounded-xl p-6 shadow-lg">
        <h1 className="text-2xl font-bold mb-4 text-center">Upload Certificate of Insurance</h1>
        <form onSubmit={handleUpload} className="flex flex-col gap-4">
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="bg-[#0B0E17] border border-gray-700 rounded-lg p-3 text-sm"
          />
          <button
            disabled={!file || loading}
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 py-3 rounded-lg text-sm font-semibold disabled:opacity-50"
          >
            {loading ? "Processing…" : "Upload COI"}
          </button>
        </form>

        {message && (
          <p className="mt-4 text-center text-sm text-gray-300">{message}</p>
        )}

        <div className="mt-6 text-center">
          <a
            href="/dashboard"
            className="text-blue-400 hover:text-blue-500 underline text-sm"
          >
            Go to Dashboard →
          </a>
        </div>
      </div>
    </main>
  );
}
