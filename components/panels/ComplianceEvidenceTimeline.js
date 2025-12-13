import { useEffect, useState } from "react";

export default function ComplianceEvidenceTimeline({ orgId }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;

    fetch(`/api/compliance/events?orgId=${orgId}&limit=40`)
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setEvents(j.events || []);
      })
      .finally(() => setLoading(false));
  }, [orgId]);

  return (
    <div
      style={{
        borderRadius: 20,
        padding: 18,
        border: "1px solid rgba(148,163,184,0.4)",
        background: "rgba(15,23,42,0.96)",
        boxShadow: "0 10px 35px rgba(0,0,0,0.45)",
      }}
    >
      {/* HEADER + EXPORT BUTTONS */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 600,
            background: "linear-gradient(90deg,#38bdf8,#a855f7)",
            WebkitBackgroundClip: "text",
            color: "transparent",
          }}
        >
          Compliance Evidence (Audit Log)
        </h2>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() =>
              window.open(
                `/api/compliance/export.csv?orgId=${orgId}`,
                "_blank"
              )
            }
            style={{
              padding: "6px 12px",
              borderRadius: 10,
              border: "1px solid #38bdf8",
              background: "rgba(56,189,248,0.15)",
              color: "#38bdf8",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Export CSV
          </button>

          <button
            onClick={() =>
              window.open(
                `/api/compliance/export.pdf?orgId=${orgId}`,
                "_blank"
              )
            }
            style={{
              padding: "6px 12px",
              borderRadius: 10,
              border: "1px solid #a855f7",
              background: "rgba(168,85,247,0.15)",
              color: "#a855f7",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Export PDF
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: "#9ca3af" }}>
          Loading evidence…
        </div>
      ) : events.length === 0 ? (
        <div style={{ fontSize: 13, color: "#9ca3af" }}>
          No compliance events recorded yet.
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            maxHeight: 360,
            overflowY: "auto",
            paddingRight: 6,
          }}
        >
          {events.map((e) => (
            <div
              key={e.id}
              style={{
                padding: "10px 12px",
                borderRadius: 14,
                background: "rgba(2,6,23,0.65)",
                border: "1px solid rgba(148,163,184,0.28)",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  color: "#38bdf8",
                  marginBottom: 4,
                }}
              >
                {e.event_type.replace(/_/g, " ")}
              </div>

              <div style={{ fontSize: 13, color: "#e5e7eb" }}>
                Source: <strong>{e.source}</strong>
              </div>

              <div
                style={{
                  fontSize: 11,
                  color: "#9ca3af",
                  marginTop: 4,
                }}
              >
                {new Date(e.occurred_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
