'use client';

import React from 'react';

export default function UploadCOI() {
  const [file, setFile] = React.useState<File | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (!file) {
      setMsg('Please choose a PDF first.');
      return;
    }

    try {
      setBusy(true);
      const res = await fetch('/api/extract-coi', {
        method: 'POST',
        headers: { 'content-type': 'application/pdf' }, // send buffer
        body: await file.arrayBuffer(),
      });

      const text = await res.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('Server returned non-JSON response.');
      }

      if (!res.ok) throw new Error(data?.error || 'Upload failed.');
      setMsg('✅ Extraction completed successfully!');
    } catch (err: any) {
      setMsg(`❌ ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-8 bg-black text-white">
      <form onSubmit={onSubmit} className="max-w-xl w-full space-y-6 bg-zinc-900/60 p-6 rounded-2xl border border-zinc-800">
        <h1 className="text-3xl font-semibold">Upload Certificate of Insurance</h1>

        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="block w-full rounded-lg border border-zinc-700 bg-zinc-950 p-3"
        />

        <button
          type="submit"
          disabled={busy || !file}
          className="w-full rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 py-3 font-semibold"
        >
          {busy ? 'Uploading…' : 'Upload COI'}
        </button>

        {msg && <p className="text-sm">{msg}</p>}

        <a href="/dashboard" className="text-blue-400 underline">
          Go to Dashboard →
        </a>
      </form>
    </main>
  );
}
