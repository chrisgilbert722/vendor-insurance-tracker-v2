'use client';

import React, { useState } from 'react';

export default function UploadCOIPage() {
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<string>('');

  async function handleUpload() {
    try {
      setMsg('');
      if (!file) {
        setMsg('Please select a file first.');
        return;
      }
      const fd = new FormData();
      // IMPORTANT: raw body mode (Pages API above expects the whole body as the file)
      // If you prefer standard multipart parsing later, we can switch to formidable.
      const buf = new Uint8Array(await file.arrayBuffer());
      fd.append('file', new Blob([buf]), file.name);

      const res = await fetch('/api/extract-coi', { method: 'POST', body: fd });

      // Always parse JSON; our API guarantees JSON response
      const data = await res.json().catch(() => ({ ok: false, error: 'Bad JSON response' }));

      if (!res.ok || !data.ok) {
        setMsg(`❌ ${data.error ?? 'Upload failed'}`);
        return;
      }
      setMsg('✅ Extraction completed successfully!');
    } catch (e: any) {
      setMsg(`❌ ${e?.message ?? 'Unexpected error'}`);
    }
  }

  return (
    <div className="mx-auto max-w-xl p-6">
      <h1 className="text-3xl font-semibold mb-4">Upload Certificate of Insurance</h1>

      <input
        type="file"
        accept="application/pdf,image/*"
        className="w-full mb-4"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />

      <button
        onClick={handleUpload}
        className="w-full rounded bg-blue-600 text-white py-3 hover:bg-blue-700"
      >
        Upload COI
      </button>

      {msg && <p className="mt-4 text-sm">{msg}</p>}

      <div className="mt-6">
        <a className="text-blue-500 underline" href="/dashboard">Go to Dashboard →</a>
      </div>
    </div>
  );
}
