"use client";

import React, { useState } from "react";

export default function UploadCOI() {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string>("");

  async function handleUpload() {
    if (!file) {
      setMessage("Please select a PDF first.");
      return;
    }

    setMessage("⏳ Uploading and extracting...");
    try {
      const formData = new FormData();
      formData.append("file", file);

      // ✅ send to API route for server-side processing
      const res = await fetch("/api/extract-coi", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.ok) {
        setMessage(`✅ ${data.message}`);
      } else {
        setMessage(`❌ Error: ${data.error || "Unknown error"}`);
      }
    } catch (err: any) {
      setMessage(`❌ ${err.message}`);
    }
  }

  return (
    <main className="min-h-screen bg-[#0D1117] text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-[#161B22] border border-gray-800 rounded-2xl p-8 shadow-lg">
        <h1 className="text-3xl font-semibold mb-6 text-center">
          Upload Certificate of Insurance
        </h1>

        <div className="flex flex-col items-center gap-4">
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="hidden"
            id="pdf-upload"
          />
          <label
            htmlFor="pdf-upload"
            className="cursor-pointer bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-medium"
          >
            Choose File
          </label>

          <p className="text-gray-400">
            {file ? file.name : "No file chosen"}
          </p>

          <button
            onClick={handleUpload}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-semibold w-full"
          >
            Upload & Extract
          </button>

          {message && (
            <p
              className={`text-center text-sm mt-4 ${
                message.startsWith("✅")
                  ? "text-green-400"
                  : message.startsWith("⏳")
                  ? "text-blue-400"
                  : "text-red-400"
              }`}
            >
              {message}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
