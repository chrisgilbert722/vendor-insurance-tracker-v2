// --- EliteComplianceBlock ---
// Place at: /components/elite/EliteComplianceBlock.js

import React, { useEffect, useState } from "react";
import EliteStatusPill from "./EliteStatusPill";
import EliteRuleResults from "./EliteRuleResults";

export default function EliteComplianceBlock({ coidata }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [overall, setOverall] = useState(null);
  const [rules, setRules] = useState([]);

  useEffect(() => {
    if (!coidata) return;

    const run = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await fetch("/api/elite/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ coidata }),
        });

        const data = await res.json();
        if (!data.ok) {
          throw new Error(data.error || "Elite error");
        }

        setOverall(data.overall);
        setRules(data.rules || []);
      } catch (err) {
        console.error("EliteComplianceBlock error:", err);
        setError("Elite rule engine error");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [JSON.stringify(coidata)]); // simple change detection

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <EliteStatusPill status={overall} />
        {loading && (
          <span style={{ fontSize: 11, opacity: 0.6 }}>Evaluating…</span>
        )}
        {error && (
          <span style={{ fontSize: 11, color: "#b00020" }}>{error}</span>
        )}
      </div>

      {/* Detailed rule breakdown */}
      <EliteRuleResults rules={rules} />
    </div>
  );
}
