"use client";

import { useState } from "react";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/extract", { method: "POST", body: fd });
    const json = await res.json();
    setResult(json);
  }

  return (
    <main className="min-h-screen bg-white text-slate-900 max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">Upload Certificate of Insurance</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block"
        />
        <button
          type="submit"
          className="px-6 py-3 bg-black text-white rounded-lg"
        >
          Extract &amp; Validate
        </button>
      </form>

      {result && (
        <pre className="mt-6 bg-slate-50 p-4 rounded-lg text-sm overflow-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </main>
  );
}
