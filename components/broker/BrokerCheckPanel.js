// components/broker/BrokerCheckPanel.js

import { useState } from "react";
import BrokerUploadBox from "./BrokerUploadBox";

export default function BrokerCheckPanel({ orgId, vendorId, policyId }) {
  const [analysis, setAnalysis] = useState(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  async function runAutoCheck() {
    if (!orgId || !vendorId) {
      setError("Missing org or vendor.");
      return;
    }

    try {
      setChecking(true);
      setError("");

      const res = await fetch("/api/ai/broker-coi-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, vendorId, policyId }),
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Check failed.");

      setAnalysis(data.result);
    } catch (err) {
      setError(err.message);
    } finally {
      setChecking(false);
    }
  }

  return (
    <div>
      <BrokerUploadBox
        orgId={orgId}
        vendorId={vendorId}
        policyId={policyId}
        onUploaded={() => {
          // Optional note to user
        }}
      />

      <div style={{ marginTop: 12 }}>
        <button
          onClick={runAutoCheck}
          disabled={checking}
          style={{
            padding: "8px 14px",
            borderRadius: 999,
            border: "1px solid rgba(34,197,94,0.85)",
            background:
              "linear-gradient(90deg,#22c55e,#16a34a,#065f46)",
            color: "white",
            fontSize: 12,
            fontWeight: 600,
            cursor: checking ? "not-allowed" : "pointer",
          }}
        >
          {checking ? "Running Auto-Check…" : "🔍 Auto-Check COI"}
        </button>
      </div>

      {error && (
        <div
          style={{
            marginTop: 8,
            fontSize: 12,
            color: "#fecaca",
          }}
        >
          {error}
        </div>
      )}

      {analysis && (
        <div
          style={{
            marginTop: 12,
            borderRadius: 18,
            border: "1px solid rgba(148,163,184,0.6)",
            background: "rgba(15,23,42,0.98)",
            padding: 14,
            fontSize: 12,
            color: "#e5e7eb",
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 6,
              color: "#f9fafb",
            }}
          >
            Summary
          </div>
          <div style={{ marginBottom: 10 }}>{analysis.summary}</div>

          {analysis.issues?.length > 0 && (
            <>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 4,
                  color: "#fecaca",
                }}
              >
                Issues
              </div>
              <ul style={{ paddingLeft: 18 }}>
                {analysis.issues.map((issue, idx) => (
                  <li key={idx}>
                    <strong>{issue.title}</strong>
                    {issue.detail && <> — {issue.detail}</>}
                    {issue.rule_reference && (
                      <div
                        style={{
                          fontSize: 11,
                          color: "#9ca3af",
                        }}
                      >
                        {issue.rule_reference}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}

          {analysis.fixes?.length > 0 && (
            <>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  marginTop: 10,
                  marginBottom: 4,
                  color: "#bbf7d0",
                }}
              >
                Fixes
              </div>
              <ul style={{ paddingLeft: 18 }}>
                {analysis.fixes.map((fix, idx) => (
                  <li key={idx}>
                    <strong>{fix.title}</strong>
                    {fix.instructions && (
                      <div style={{ fontSize: 11 }}>
                        {fix.instructions}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}

          {analysis.sample_email && (
            <>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  marginTop: 10,
                  marginBottom: 4,
                  color: "#93c5fd",
                }}
              >
                Sample Email to Underwriter / Internal Team
              </div>
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  background: "rgba(15,23,42,0.96)",
                  borderRadius: 10,
                  border: "1px solid rgba(51,65,85,0.9)",
                  padding: 8,
                  fontSize: 11,
                  color: "#e5e7eb",
                }}
              >
                {analysis.sample_email}
              </pre>
            </>
          )}
        </div>
      )}
    </div>
  );
}
