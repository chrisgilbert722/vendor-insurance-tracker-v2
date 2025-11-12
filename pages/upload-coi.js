'use client';
import React, { useState } from 'react';

export default function UploadCOI() {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files?.[0] || null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg(null);

    if (!file) {
      setMsg('⚠️ Please choose a PDF file first.');
      return;
    }

    setBusy(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/extract-coi', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed.');

      setMsg(`✅ ${data.message || 'COI uploaded successfully!'}`);
    } catch (err) {
      console.error(err);
      setMsg(`❌ Error: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-white p-6">
      <div className="bg-gray-900 p-8 rounded-2xl shadow-lg max-w-md w-full border border-gray-800">
        <h1 className="text-2xl font-bold mb-6 text-center">
          Upload Certificate of Insurance
        </h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="file:mr-3 file:rounded-full file:border-0 file:bg-blue-600 file:text-white file:px-4 file:py-2 hover:file:bg-blue-700 text-gray-300 bg-gray-800 rounded-lg w-full"
          />
          <button
            type="submit"
            disabled={busy}
            className={`w-full py-3 rounded-lg font-semibold transition ${
              busy
                ? 'bg-gray-700 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {busy ? 'Uploading...' : 'Upload COI'}
          </button>
        </form>

        {msg && (
          <p
            className={`mt-4 text-center ${
              msg.startsWith('✅')
                ? 'text-green-400'
                : msg.startsWith('⚠️')
                ? 'text-yellow-400'
                : 'text-red-400'
            }`}
          >
            {msg}
          </p>
        )}

        <div className="mt-6 text-center">
          <a
            href="/dashboard"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            Go to Dashboard →
          </a>
        </div>
      </div>
    </main>
  );
}
