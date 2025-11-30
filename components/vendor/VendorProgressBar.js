// components/vendor/VendorProgressBar.js

import { useEffect, useState } from "react";

export default function VendorProgressBar({ orgId, vendorId }) {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!orgId || !vendorId) return;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/vendor/progress?orgId=${orgId}&vendorId=${vendorId}`
        );
        const data = await res.json();
        if (data.ok) setProgress(data.progress);
      } catch (err) {
        console.error("VendorProgressBar error:", err);
      }
      setLoading(false);
    }

    load();
  }, [orgId, vendorId]);

  if (!orgId || !vendorId) return null;

  if (loading || !progress) {
    return (
      <div
        style={{
          marginTop: 10,
          fontSize: 11,
          color: "#9ca3af",
        }}
      >
        Calculating compliance progress…
      </div>
    );
  }

  const pct = progress.progress_pct || 0;
  const status = progress.status || "unknown";

  let barColor = "#38bdf8";
  if (pct >= 90) barColor = "#22c55e";
  else if (pct >= 60) barColor = "#facc15";
  else barColor = "#fb7185";

  return (
    <div
      style={{
        marginTop: 12,
        marginBottom: 6,
      }}
    >
      <div
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: 1.1,
          color: "#9ca3af",
          marginBottom: 4,
        }}
      >
        Compliance Progress
      </div>

      <div
        style={{
          position: "relative",
          height: 10,
          borderRadius: 999,
          background: "rgba(15,23,42,0.9)",
          border: "1px solid rgba(51,65,85,0.9)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: barColor,
            boxShadow: `0 0 12px ${barColor}80`,
            transition: "width 0.4s ease",
          }}
        />
      </div>

      <div
        style={{
          marginTop: 4,
          display: "flex",
          justifyContent: "space-between",
          fontSize: 11,
          color: "#9ca3af",
        }}
      >
        <span>
          {progress.fixed_rules}/{progress.total_rules} issues resolved
        </span>
        <span>{pct}% · {status}</span>
      </div>

      {progress.summary && (
        <div
          style={{
            marginTop: 4,
            fontSize: 11,
            color: "#6b7280",
          }}
        >
          {progress.summary}
        </div>
      )}
    </div>
  );
}
