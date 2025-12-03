// components/renewals/RenewalAiSummary.js

import { useEffect, useState } from "react";

export default function RenewalAiSummary({ orgId }) {
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`/api/renewals/list?orgId=${orgId}`);
        const json = await res.json();
        if (!json.ok) {
          setSummary("Unable to load renewal data.");
          return;
        }

        const payload = {
          renewals: json.data,
        };

        const aiRes = await fetch("/api/renewals/ai-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const aiJson = await aiRes.json();
        if (aiJson.ok) {
          setSummary(aiJson.summary);
        } else {
          setSummary("AI summary unavailable.");
        }
      } catch (err) {
        console.error("RenewalAiSummary error:", err);
        setSummary("AI summary unavailable.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [orgId]);

  if (!orgId) return null;

  return (
    <div
      style={{
        borderRadius: 16,
        padding: 14,
        border: "1px solid rgba(148,163,184,0.5)",
        background: "rgba(15,23,42,0.96)",
        fontSize: 13,
        color: "#e5e7eb",
      }}
    >
      <div
        style={{
          fontSize: 13,
          color: "#9ca3af",
          marginBottom: 6,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span>🤖</span>
        <span>Renewal AI Summary</span>
      </div>
      {loading ? (
        <div style={{ fontSize: 12, color: "#9ca3af" }}>Analyzing renewals…</div>
      ) : (
        <div style={{ whiteSpace: "pre-wrap" }}>{summary}</div>
      )}
    </div>
  );
}
