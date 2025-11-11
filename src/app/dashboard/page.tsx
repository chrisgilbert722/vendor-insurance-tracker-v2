"use client";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/list");
        if (!res.ok) throw new Error("Failed to load records");
        const data = await res.json();
        setRecords(data.records);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return <p className="text-center text-gray-400 mt-10">Loading dashboard...</p>;
  if (error) return <p className="text-center text-red-500 mt-10">Error: {error}</p>;

  return (
    <main className="min-h-screen bg-gray-950 text-white p-10">
      <h1 className="text-3xl font-bold mb-6 text-center">📊 COI Dashboard</h1>

      <div className="overflow-x-auto border border-gray-800 rounded-lg shadow-lg">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-gray-800">
            <tr>
              <th className="px-4 py-2 text-left">File</th>
              <th className="px-4 py-2 text-left">Carrier</th>
              <th className="px-4 py-2 text-left">Policy #</th>
              <th className="px-4 py-2 text-left">Effective</th>
              <th className="px-4 py-2 text-left">Expires</th>
              <th className="px-4 py-2 text-left">Uploaded</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-400">
                  No COIs uploaded yet.
                </td>
              </tr>
            ) : (
              records.map((r) => (
                <tr key={r.id} className="border-b border-gray-800 hover:bg-gray-900">
                  <td className="px-4 py-2">{r.file_name}</td>
                  <td className="px-4 py-2">{r.carrier}</td>
                  <td className="px-4 py-2">{r.policy_number}</td>
                  <td className="px-4 py-2">{r.effective_date || "—"}</td>
                  <td className="px-4 py-2">{r.expiration_date || "—"}</td>
                  <td className="px-4 py-2">{new Date(r.created_at).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
