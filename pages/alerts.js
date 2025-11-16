import { useEffect, useState } from "react";
import Link from "next/link";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadAlerts() {
      try {
        const res = await fetch("/api/alerts/summary");
        const data = await res.json();
        if (!res.ok || !data.ok) {
          throw new Error(data.error || "Failed to load alerts");
        }
        setAlerts(data);
      } catch (err) {
        console.error("ALERTS FETCH ERROR:", err);
        setError(err.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    loadAlerts();
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "#e5e7eb",
        padding: "30px 40px",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      {/* Header */}
      <div style={{ maxWidth: "960px", margin: "0 auto", paddingBottom: "20px" }}>
        <p
          style={{
            fontSize: "11px",
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            color: "#64748b",
          }}
        >
          G-Track · Alerts Engine
        </p>
        <h1
          style={{
            fontSize: "30px",
            marginTop: "6px",
            marginBottom: "6px",
            fontWeight: 700,
          }}
        >
          Risk & Alerts Center
        </h1>
        <p style={{ fontSize: "14px", color: "#94a3b8", maxWidth: "600px" }}>
          G-mode view of expired and soon-to-expire coverage so you know exactly
          which vendors could blow up your risk profile next.
        </p>

        <div style={{ marginTop: "10px" }}>
          <Link
            href="/dashboard"
            style={{
              fontSize: "12px",
              color: "#38bdf8",
              textDecoration: "none",
            }}
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: "960px", margin: "0 auto" }}>
        {loading && <p style={{ fontSize: "14px" }}>Loading alerts…</p>}
        {error && (
          <p style={{ fontSize: "13px", color: "#fca5a5" }}>⚠ {error}</p>
        )}

        {!loading && alerts && (
          <div style={{ display: "grid", gap: "20px", marginTop: "20px" }}>
            {/* Summary tiles */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "16px",
              }}
            >
              <SummaryCard
                label="Expired"
                icon="🔥"
                count={alerts.counts.expired}
                tone="bad"
              />
              <SummaryCard
                label="Critical (≤30 days)"
                icon="⚠️"
                count={alerts.counts.critical}
                tone="warn"
              />
              <SummaryCard
                label="Warning (≤90 days)"
                icon="🟡"
                count={alerts.counts.warning}
                tone="soft"
              />
            </div>

            {/* Lists */}
            <AlertList
              title="🔥 Expired Policies"
              subtitle="These vendors are on dead coverage. If they’re still on site, you’re carrying the risk."
              items={alerts.expired}
              tone="bad"
            />

            <AlertList
              title="⚠️ Critical — Expires ≤ 30 Days"
              subtitle="Renewal grenades. If you don’t chase these now, they’ll be in the expired bucket next."
              items={alerts.critical}
              tone="warn"
            />

            <AlertList
              title="🟡 Warning — Expires ≤ 90 Days"
              subtitle="Get these on someone’s radar now so they never hit critical or expired."
              items={alerts.warning}
              tone="soft"
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------ Summary Card ------------ */

function SummaryCard({ label, icon, count, tone }) {
  const baseStyle = {
    borderRadius: "16px",
    padding: "14px 16px",
    border: "1px solid rgba(148,163,184,0.25)",
    background:
      tone === "bad"
        ? "linear-gradient(135deg, rgba(248,113,113,0.15), rgba(15,23,42,0.95))"
        : tone === "warn"
        ? "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(15,23,42,0.95))"
        : "linear-gradient(135deg, rgba(56,189,248,0.10), rgba(15,23,42,0.95))",
    boxShadow: "0 18px 40px rgba(15,23,42,0.7)",
  };

  return (
    <div style={baseStyle}>
      <div style={{ fontSize: "22px", marginBottom: "4px" }}>{icon}</div>
      <div style={{ fontSize: "24px", fontWeight: 700 }}>{count}</div>
      <div style={{ fontSize: "13px", color: "#cbd5f5", marginTop: "2px" }}>
        {label}
      </div>
    </div>
  );
}

/* ------------ Alert List with Send Email ------------ */

function AlertList({ title, subtitle, items, tone }) {
  const [sendingId, setSendingId] = useState(null);
  const [sentIds, setSentIds] = useState({});
  const [localError, setLocalError] = useState("");

  const borderColor =
    tone === "bad"
      ? "rgba(248,113,113,0.5)"
      : tone === "warn"
      ? "rgba(245,158,11,0.6)"
      : "rgba(148,163,184,0.7)";

  async function handleSendEmail(item) {
    setLocalError("");
    setSendingId(item.id);

    try {
      const res = await fetch("/api/alerts/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorEmail: item.vendor_email,
          vendorName: item.vendor_name,
          policyNumber: item.policy_number,
          carrier: item.carrier,
          coverageType: item.coverage_type,
          expirationDate: item.expiration_date,
          daysLeft: item.daysLeft,
          tone: "professional", // keep vendor-facing tone clean
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to send email");
      }

      setSentIds((prev) => ({ ...prev, [item.id]: true }));
    } catch (err) {
      console.error("Send email failed:", err);
      setLocalError(err.message || "Failed to send email");
    } finally {
      setSendingId(null);
    }
  }

  return (
    <div
      style={{
        borderRadius: "18px",
        border: `1px solid ${borderColor}`,
        background:
          "linear-gradient(145deg, rgba(15,23,42,0.98), rgba(15,23,42,0.9))",
        padding: "16px 18px",
      }}
    >
      <div style={{ marginBottom: "10px" }}>
        <h2 style={{ fontSize: "15px", fontWeight: 600 }}>{title}</h2>
        <p
          style={{
            fontSize: "12px",
            color: "#94a3b8",
            marginTop: "4px",
            maxWidth: "620px",
          }}
        >
          {subtitle}
        </p>
        {localError && (
          <p style={{ fontSize: "12px", color: "#fca5a5", marginTop: "4px" }}>
            ⚠ {localError}
          </p>
        )}
      </div>

      {(!items || items.length === 0) && (
        <p style={{ fontSize: "12px", color: "#6b7280" }}>
          No items in this band.
        </p>
      )}

      {items && items.length > 0 && (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "grid",
            gap: "10px",
          }}
        >
          {items.map((p) => (
            <li
              key={p.id}
              style={{
                borderRadius: "12px",
                padding: "10px 12px",
                background: "rgba(15,23,42,0.96)",
                border: "1px solid rgba(51,65,85,0.9)",
                fontSize: "12px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                  marginBottom: "2px",
                }}
              >
                <span style={{ fontWeight: 600, color: "#e5e7eb" }}>
                  {p.vendor_name}
                </span>
                <span style={{ color: "#9ca3af" }}>
                  {p.coverage_type || "Unknown coverage"}
                </span>
              </div>

              <div
                style={{
                  fontSize: "11px",
                  color: "#cbd5f5",
                  marginBottom: "2px",
                }}
              >
                Policy{" "}
                <span style={{ fontWeight: 600 }}>{p.policy_number}</span> with{" "}
                <span style={{ fontWeight: 500 }}>{p.carrier}</span>
              </div>

              <div
                style={{
                  fontSize: "11px",
                  color: "#9ca3af",
                  marginBottom: "6px",
                }}
              >
                {renderGModeLine(p)}
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    color: "#64748b",
                  }}
                >
                  {p.vendor_email
                    ? `Will email: ${p.vendor_email}`
                    : "No vendor email on file."}
                </span>

                <button
                  onClick={() => handleSendEmail(p)}
                  disabled={
                    !p.vendor_email || sendingId === p.id || sentIds[p.id]
                  }
                  style={{
                    fontSize: "11px",
                    padding: "6px 10px",
                    borderRadius: "999px",
                    border: "none",
                    cursor:
                      !p.vendor_email || sendingId === p.id || sentIds[p.id]
                        ? "not-allowed"
                        : "pointer",
                    opacity:
                      !p.vendor_email || sendingId === p.id || sentIds[p.id]
                        ? 0.5
                        : 1,
                    background: "#0ea5e9",
                    color: "#0f172a",
                    fontWeight: 600,
                  }}
                >
                  {sentIds[p.id]
                    ? "Email sent"
                    : sendingId === p.id
                    ? "Sending…"
                    : "Send email"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------ G-Mode Narrative Line ------------ */

function renderGModeLine(p) {
  const { daysLeft, expiration_date } = p;

  if (daysLeft === null) {
    return `No valid expiration date on this policy. Treat it like unverified coverage until a clean COI shows up.`;
  }

  if (daysLeft < 0) {
    const daysPast = Math.abs(daysLeft);
    return `Expired ${daysPast} day(s) ago on ${expiration_date}. If this vendor is still on your job with this coverage, you're carrying their risk for them.`;
  }

  if (daysLeft <= 30) {
    return `Expires in ${daysLeft} day(s) on ${expiration_date}. This is a renewal grenade — get a fresh COI before they roll another truck onto your property.`;
  }

  if (daysLeft <= 90) {
    return `Expires in ${daysLeft} day(s) on ${expiration_date}. Not a fire drill yet, but you should have someone on your team chasing this before it drops into critical.`;
  }

  return `Coverage looks stable for now, but set a reminder before ${expiration_date} so this policy never quietly becomes a problem.`;
}
