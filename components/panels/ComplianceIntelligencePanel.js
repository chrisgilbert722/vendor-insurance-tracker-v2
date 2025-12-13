import { useEffect, useState } from "react";

/*
============================================================
 Compliance Intelligence Panel
 - Multi-document visibility (COI, W-9, License, Contract)
 - Read-only, safe, non-blocking
 - Visual dominance panel (kill-shot UI)
============================================================
*/

export default function ComplianceIntelligencePanel({ orgId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;

    const load = async () => {
      try {
        setLoading(true);

        // This endpoint can evolve later.
        // For now it safely reads document intelligence results.
        const res = await fetch(
          `/api/documents/intelligence-summary?orgId=${orgId}`
        );
        const json = await res.json();

        if (json.ok) {
          setItems(json.items || []);
        } else {
          setItems([]);
        }
      } catch (err) {
        console.error("[ComplianceIntelligencePanel] load error:", err);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [orgId]);

  return (
    <div
      style={{
        marginTop: 24,
        borderRadius: 22,
        padding: 18,
        background: "rgba(15,23,42,0.96)",
        border: "1px solid rgba(148,163,184,0.45)",
        boxShadow:
          "0 0 28px rgba(56,189,248,0.18), inset 0 0 20px rgba(0,0,0,0.55)",
        color: "#e5e7eb",
      }}
    >
      {/* HEADER */}
      <div style={{ marginBottom: 12 }}>
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "rgba(148,163,184,0.8)",
          }}
        >
          Compliance Intelligence
        </div>

        <div
          style={{
            marginTop: 4,
            fontSize: 15,
            fontWeight: 700,
            background: "linear-gradient(90deg,#38bdf8,#a855f7)",
            WebkitBackgroundClip: "text",
            color: "transparent",
          }}
        >
          AI-Tracked Compliance Documents
        </div>
      </div>

      {/* BODY */}
      {loading ? (
        <div style={{ fontSize: 13, color: "#9ca3af" }}>
          Loading document intelligence…
        </div>
      ) : items.length === 0 ? (
        <div style={{ fontSize: 13, color: "#9ca3af" }}>
          No document intelligence available yet.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
            gap: 12,
          }}
        >
          {items.map((doc, i) => (
            <DocumentCard key={i} doc={doc} />
          ))}
        </div>
      )}
    </div>
  );
}

/*
============================================================
 Document Card
============================================================
*/

function DocumentCard({ doc }) {
  const statusColor =
    doc.status === "valid"
      ? "#22c55e"
      : doc.status === "expiring"
      ? "#facc15"
      : doc.status === "missing"
      ? "#fb7185"
      : "#9ca3af";

  return (
    <div
      style={{
        borderRadius: 16,
        padding: 14,
        border: "1px solid rgba(51,65,85,0.9)",
        background: "rgba(2,6,23,0.7)",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "#e5e7eb",
        }}
      >
        {doc.label || "Document"}
      </div>

      <div
        style={{
          fontSize: 11,
          color: statusColor,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {doc.status || "unknown"}
      </div>

      {doc.expiresAt && (
        <div style={{ fontSize: 11, color: "#9ca3af" }}>
          Expires: {new Date(doc.expiresAt).toLocaleDateString()}
        </div>
      )}

      {doc.resolvedAlerts > 0 && (
        <div style={{ fontSize: 11, color: "#38bdf8" }}>
          Auto-resolved alerts: {doc.resolvedAlerts}
        </div>
      )}

      {doc.confidence && (
        <div style={{ fontSize: 11, color: "#9ca3af" }}>
          AI confidence: {Math.round(doc.confidence * 100)}%
        </div>
      )}
    </div>
  );
}
