"use client";

import React, { useState } from "react";

export default function UploadCOIPage() {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string>("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] || null);
    setMessage("");
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage("❌ Please select a PDF file.");
      return;
    }

    setMessage("⏳ Uploading...");

    try {
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
        throw new Error("Server did not return valid JSON");
      }

      if (!res.ok) throw new Error(data.error || "Upload failed");

      setMessage(`✅ ${data.message || "COI extracted successfully!"}`);
      console.log("Extraction result:", data.aiResult);
    } catch (err: any) {
      console.error("Upload error:", err);
      setMessage(`❌ ${err.message}`);
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-xl w-full bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-lg text-center">
        <h1 className="text-3xl font-semibold mb-6">Upload Certificate of Insurance</h1>

        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          className="mb-4 w-full text-gray-300"
        />

        <button
          onClick={handleUpload}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition"
        >
          Upload & Extract
        </button>

        {message && (
          <p
            className={`mt-4 text-sm ${
              message.startsWith("✅")
                ? "text-green-400"
                : message.startsWith("⏳")
                ? "text-yellow-400"
                : "text-red-400"
            }`}
          >
            {message}
          </p>
        )}
      </div>
    </main>
  );
}
