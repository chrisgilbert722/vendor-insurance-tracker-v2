"use client";

import React, { useEffect, useMemo, useState } from "react";

type Rec = {
  id: number;
  file_name: string | null;
  carrier: string | null;
  policy_number: string | null;
  effective_date: string | null;
  expiration_date: string | null;
  compliance_status: string | null;
  compliance_score: number | null;
  created_at: string;
};

function statusColor(s: string) {
  if (!s) return "text-gray-300";
  if (s.includes("Expired")) return "text-red-500";
  if (s.includes("Expiring")) return "text-yellow-400";
  if (s.includes("Compliant")) return "text-green-400";
  return "text-gray-300";
}

export default function DashboardPage() {
  const [records, setRecords] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"All"|"Compliant"|"Expiring"|"Expired"|"Pending">("All");
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/fetch-extracts", { cache: "no-store" });
        const data = await res.json();
        if (data.ok) setRecords(data.records);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    return records.filter(r => {
      const q = query.trim().toLowerCase();
      const matchQ = !q
        || (r.file_name || "").toLowerCase().includes(q)
        || (r.carrier || "").toLowerCase().includes(q)
        || (r.policy_number || "").toLowerCase().includes(q);

      const st = (r.compliance_status || "Pending");
      const matchF = filter === "All"
        ? true
        : st.includes(filter);

      return matchQ && matchF;
    });
  }, [records, query, filter]);

  function exportCSV() {
    const header = [
      "File","Carrier","Policy #","Effective","Expiration","Compliance","Score","Uploaded"
    ].join(",");
    const rows = filtered.map(r => [
      r.file_name || "",
      r.carrier || "",
      r.policy_number || "",
      r.effective_date || "",
      r.expiration_date || "",
      r.compliance_status || "Pending",
      (r.compliance_score ?? "").toString(),
      new Date(r.created_at).toLocaleString()
    ].map(v => `"${String(v).replaceAll('"','""')}"`).join(","));
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `coi-dashboard-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-[#0B0E17] text-white p-6">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h1 className="text-2xl font-semibold">Compliance Dashboard</h1>
          <div className="flex gap-2">
            <input
              placeholder="Search: file, carrier, policy #"
              className="bg-[#141825] border border-gray-800 rounded-lg px-3 py-2 text-sm w-72"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select
              className="bg-[#141825] border border-gray-800 rounded-lg px-3 py-2 text-sm"
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
            >
              {["All","Compliant","Expiring","Expired","Pending"].map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <button onClick={exportCSV} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm">
              Export CSV
            </button>
            <a href="/upload-coi" className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm">
              Upload COI
            </a>
          </div>
        </header>

        {loading ? (
          <p className="text-gray-400">Loading…</p>
        ) : (
          <div className="overflow-x-auto bg-[#141825] border border-gray-800 rounded-xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#111522] text-gray-300 text-left">
                  <th className="px-3 py-2">File</th>
                  <th className="px-3 py-2">Carrier</th>
                  <th className="px-3 py-2">Policy #</th>
                  <th className="px-3 py-2">Effective</th>
                  <th className="px-3 py-2">Expiration</th>
                  <th className="px-3 py-2">Compliance</th>
                  <th className="px-3 py-2">Score</th>
                  <th className="px-3 py-2">Uploaded</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-8 text-gray-400">No records yet.</td></tr>
                ) : filtered.map(r => (
                  <tr key={r.id} className="border-t border-gray-800">
                    <td className="px-3 py-2">{r.file_name || "-"}</td>
                    <td className="px-3 py-2">{r.carrier || "-"}</td>
                    <td className="px-3 py-2">{r.policy_number || "-"}</td>
                    <td className="px-3 py-2">{r.effective_date || "—"}</td>
                    <td className="px-3 py-2">{r.expiration_date || "—"}</td>
                    <td className={`px-3 py-2 font-semibold ${statusColor(r.compliance_status || "Pending")}`}>
                      {r.compliance_status || "Pending"}
                    </td>
                    <td className="px-3 py-2">{r.compliance_score ?? "—"}</td>
                    <td className="px-3 py-2">{new Date(r.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
