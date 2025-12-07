// components/renewals/VendorRenewalTimeline.js
// ==========================================================
// Vendor Renewal Timeline Panel (Cockpit V9 styled)
// Shows SLA stages, AI emails, and escalation events.
// ==========================================================

import { useEffect, useState } from "react";

const SEVERITY_COLORS = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#facc15",
  warning: "#facc15",
  info: "#38bdf8",
  default: "#9ca3af",
};

const ACTION_LABELS = {
  sla_90_day: "90-Day Notice",
  sla_30_day: "30-Day Notice",
  sla_7_day: "7-Day Notice",
  sla_3_day: "3-Day Notice",
  sla_expired: "Expired",
  sla_missing: "Missing Expiration",
  renewal_email_ai_v3: "AI Renewal Email Sent",
  broker_escalation: "Broker Escalation",
  internal_escalation: "Internal Escalation",
  termination_warning: "Suspension Warning",
};

export default function VendorRenewalTimeline({ vendorId }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!vendorId) return;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(
          `/api/vendor/renewal-timeline?vendorId=${encodeURIComponent(
            vendorId
          )}`
        );
        const json = await res.json();
        if (!res.ok || !json.ok) {
          throw new Error(json.error || "Failed to load renewal timeline");
        }

        setEvents(json.events || []);
      } catch (err) {
        console.error("[VendorRenewalTimeline] error:", err);
        setError(err.message || "Failed to load renewal timeline");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [vendorId]);

  return (
    <div
      style={{
        borderRadius: 18,
        padding: 16,
        background: "rgba(15,23,42,0.9)",
        border: "1px solid rgba(80,120,255,0.4)",
        boxShadow:
          "0 0 24px rgba(64,106,255,0.28), inset 0 0 18px rgba(15,23,42,0.9)",
        backdropFilter: "blur(10px)",
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          marginBottom: 6,
        }}
      >
        Renewal Timeline
      </div>

      <div
        style={{
          fontSize: 11,
          color: "#9ca3af",
          marginBottom: 10,
        }}
      >
        SLA stages, renewal emails, and escalation events in chronological
        order.
      </div>

      {loading && (
        <div style={{ fontSize: 12, color: "#9ca3af" }}>Loading timeline…</div>
      )}

      {error && (
        <div style={{ fontSize: 12, color: "#f97373" }}>
          Failed to load: {error}
        </div>
      )}

      {!loading && !error && events.length === 0 && (
        <div style={{ fontSize: 12, color: "#6b7280" }}>
          No renewal events logged for this vendor yet.
        </div>
      )}

      {!loading && !error && events.length > 0 && (
        <div
          style={{
            marginTop: 4,
            maxHeight: 260,
            overflowY: "auto",
            paddingRight: 4,
          }}
        >
          {events.map((ev, idx) => {
            const color =
              SEVERITY_COLORS[ev.severity?.toLowerCase()] ||
              SEVERITY_COLORS.default;

            const label = ACTION_LABELS[ev.action] || ev.action;

            return (
              <div
                key={ev.id || idx}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                  padding: "8px 0",
                  borderBottom:
                    idx === events.length - 1
                      ? "none"
                      : "1px solid rgba(31,41,55,0.8)",
                }}
              >
                {/* Dot */}
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "999px",
                    marginTop: 6,
                    backgroundColor: color,
                    boxShadow: `0 0 8px ${color}`,
                    flexShrink: 0,
                  }}
                />

                {/* Content */}
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#e5e7eb",
                      marginBottom: 2,
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#9ca3af",
                      marginBottom: 2,
                    }}
                  >
                    {new Date(ev.created_at).toLocaleString()}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#cbd5f5",
                    }}
                  >
                    {ev.message}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
