"use client";

import React, { useEffect, useState } from "react";

export default function DashboardPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/fetch-extracts")
      .then((res) => res.json())
      .then((json) => {
        setData(json.records || []);
        setLoading(false);
      });
  }, []);

  if (loading) return <p className="text-center mt-20 text-gray-300">Loading...</p>;

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <h1 className="text-3xl font-bold mb-6">Vendor COI Compliance Dashboard</h1>
      <div className="overflow-x-auto bg-gray-900 rounded-lg shadow-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-800 text-gray-300">
            <tr>
              <th className="px-4 py-2 text-left">File</th>
              <th className="px-4 py-2 text-left">Carrier</th>
              <th className="px-4 py-2 text-left">Policy #</th>
              <th className="px-4 py-2 text-left">Effective</th>
              <th className="px-4 py-2 text-left">Expiration</th>
              <th className="px-4 py-2 text-left">Compliance</th>
              <th className="px-4 py-2 text-left">Score</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r, i) => (
              <tr key={i} className="border-t border-gray-800 hover:bg-gray-800">
                <td className="px-4 py-2">{r.file_name}</td>
                <td className="px-4 py-2">{r.carrier}</td>
                <td className="px-4 py-2">{r.policy_number}</td>
                <td className="px-4 py-2">{r.effective_date}</td>
                <td className="px-4 py-2">{r.expiration_date}</td>
                <td
                  className={`px-4 py-2 font-semibold ${
                    r.compliance_status.includes("Expired")
                      ? "text-red-500"
                      : r.compliance_status.includes("Expiring")
                      ? "text-yellow-400"
                      : "text-green-400"
                  }`}
                >
                  {r.compliance_status}
                </td>
                <td className="px-4 py-2">{r.compliance_score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
