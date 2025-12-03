// components/renewals/RenewalCommunicationLog.js
import { useEffect, useState } from "react";

const GP = {
  text: "#e5e7eb",
  textSoft: "#9ca3af",
  bg: "rgba(15,23,42,0.96)",
  border: "1px solid rgba(51,65,85,0.9)",
  critical: "#fb7185",
  high: "#fbbf24",
  medium: "#38bdf8",
  low: "#22c55e",
};

export default function RenewalCommunicationLog({ vendorId }) {
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!vendorId) return;

    async function loadLog() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`/api/renewals/log-v3?vendorId=${vendorId}`);
        const json = await res.json();

        if (!json.ok) throw new Error(json.error);
        setNotifications(json.notifications || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadLog();
  }, [vendorId]);

  const severityColor = (days) => {
    if (days <= 1) return GP.critical;
    if (days <= 3) return GP.high;
    if (days <= 7) return GP.medium;
    return GP.low;
  };

  return (
    <div
      style={{
        marginTop: 30,
        padding: 18,
        borderRadius: 20,
        background: GP.bg,
        border: GP.border,
      }}
    >
      <div
        style={{
          fontSize: 13,
          marginBottom: 10,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: GP.textSoft,
        }}
      >
        Renewal Communication Log
      </div>

      {loading && (
        <div style={{ color: GP.textSoft, fontSize: 13 }}>
          Loading communication history…
        </div>
      )}

      {error && (
        <div style={{ color: GP.critical, fontSize: 13 }}>{error}</div>
      )}

      {!loading && notifications.length === 0 && (
        <div style={{ color: GP.textSoft, fontSize: 13 }}>
          No renewal messages have been sent yet.
        </div>
      )}

      {!loading &&
        notifications.length > 0 && (
          <div
            style={{
              maxHeight: 300,
              overflowY: "auto",
              paddingRight: 6,
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "separate",
                borderSpacing: 0,
                fontSize: 12,
              }}
            >
              <thead>
                <tr>
                  <th style={th}>Days Left</th>
                  <th style={th}>Recipient</th>
                  <th style={th}>Email</th>
                  <th style={th}>Type</th>
                  <th style={th}>Subject</th>
                  <th style={th}>Sent At</th>
                </tr>
              </thead>
              <tbody>
                {notifications.map((n) => (
                  <tr key={n.id} style={rowStyle}>
                    <td
                      style={{
                        ...td,
                        fontWeight: 600,
                        color: severityColor(n.days_left),
                      }}
                    >
                      {n.days_left}
                    </td>
                    <td style={td}>{n.recipient_type}</td>
                    <td style={td}>{n.sent_to}</td>
                    <td style={td}>{n.notification_type}</td>
                    <td style={td}>{n.subject}</td>
                    <td style={td}>
                      {new Date(n.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}

/* table styles */
const th = {
  padding: "8px 10px",
  color: "#9ca3af",
  textAlign: "left",
  borderBottom: "1px solid rgba(51,65,85,0.8)",
  fontSize: 11,
  textTransform: "uppercase",
};

const td = {
  padding: "8px 10px",
  color: "#e5e7eb",
  borderBottom: "1px solid rgba(51,65,85,0.5)",
};

const rowStyle = {
  background:
    "linear-gradient(90deg,rgba(15,23,42,0.98),rgba(15,23,42,0.94))",
  cursor: "default",
};
