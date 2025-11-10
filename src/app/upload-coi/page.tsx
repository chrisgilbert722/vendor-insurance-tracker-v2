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
      setMessage("❌ Please choose a PDF file first.");
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

      // Prevent “Unexpected end of JSON input” if server fails
      const text = await res.text();
      const data = text ? JSON.parse(text) : { ok: false, error: "Empty server response" };

      if (!res.ok) throw new Error(data.error || "Upload failed");

      setMessage(`✅ Success: ${data.message || "COI extracted successfully!"}`);
      console.log("Server response:", data);
    } catch (err: any) {
      console.error("Upload error:", err);
      setMessage(`❌ Error: ${err.message}`);
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-xl w-full bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-lg text-center">
        <h1 className="text-3xl font-semibold mb-6">Upload Certificate of Insurance</h1>

        <label className="block mb-4">
          <span className="block mb-2 text-gray-300">Choose File</span>
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="w-full text-gray-400 bg-gray-800 border border-gray-700 p-2 rounded cursor-pointer"
          />
        </label>

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
