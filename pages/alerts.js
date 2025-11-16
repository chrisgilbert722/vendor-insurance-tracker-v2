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
        background: "#0b1220",
        color: "#e5e7eb",
        padding: "30px 40px",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
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
          G-mode analyst view of expired and soon-to-expire coverage so you know
          exactly which vendors could blow up your risk profile next.
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
            {/* SUMMARY CARDS */}
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

            {/* EXPIRED LIST */}
            <AlertList
              title="🔥 Expired Policies"
              subtitle="These vendors are operating on dead coverage. If they’re on your site, you’re naked."
              items={alerts.expired}
              tone="bad"
            />

            {/* CRITICAL LIST */}
            <AlertList
              title="⚠️ Critical — Expires ≤ 30 Days"
              subtitle="Renewal time bombs. If you don’t chase these, they WILL become today’s expired list."
              items={alerts.critical}
              tone="warn"
            />

            {/* WARNING LIST */}
            <AlertList
              title="🟡 Warning — Expires ≤ 90 Days"
              subtitle="Put them on your radar now so they never show up in critical or expired."
              items={alerts.warning}
              tone="soft"
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* --------- Small Components --------- */

function SummaryCard({ label, icon, count, tone }) {
  const baseStyle = {
    borderRadius: "16px",
    padding: "14px 16px",
    border: "1px solid rgba(148,163,184,0.25)",
    background:
      tone === "bad"
        ? "linear-gradient(135deg, rgba(248,113,113,0.12), rgba(15,23,42,0.9))"
        : tone === "warn"
        ? "linear-gradient(135deg, rgba(245,158,11,0.12), rgba(15,23,42,0.9))"
        : "linear-gradient(135deg, rgba(56,189,248,0.08), rgba(15,23,42,0.9))",
    boxShadow: "0 14px 40px rgba(15,23,42,0.7)",
  };

  return (
    <div style={baseStyle}>
      <div
        style={{
          fontSize: "20px",
          marginBottom: "4px",
        }}
      >
        {icon}
      </div>
      <div style={{ fontSize: "24px", fontWeight: 700 }}>{count}</div>
      <div style={{ fontSize: "13px", color: "#cbd5f5", marginTop: "2px" }}>
        {label}
      </div>
    </div>
  );
}

function AlertList({ title, subtitle, items, tone }) {
  const borderColor =
    tone === "bad"
      ? "rgba(248,113,113,0.4)"
      : tone === "warn"
      ? "rgba(245,158,11,0.5)"
      : "rgba(148,163,184,0.5)";

  return (
    <div
      style={{
        borderRadius: "18px",
        border: `1px solid ${borderColor}`,
        background:
          "linear-gradient(145deg, rgba(15,23,42,0.95), rgba(15,23,42,0.8))",
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
            maxWidth: "600px",
          }}
        >
          {subtitle}
        </p>
      </div>

      {(!items || items.length === 0) && (
        <p style={{ fontSize: "12px", color: "#6b7280" }}>No items in this band.</p>
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
                background: "rgba(15,23,42,0.9)",
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

              <div style={{ fontSize: "11px", color: "#9ca3af" }}>
                {renderGModeLine(p)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function renderGModeLine(p) {
  const { daysLeft, expiration_date } = p;

  if (daysLeft === null) {
    return `No valid expiration date. Treat this as unverified coverage until you see a real COI.`;
  }

  if (daysLeft < 0) {
    return `Expired ${Math.abs(
      daysLeft
    )} day(s) ago on ${expiration_date}. If this vendor is still on your job, you are running them with dead coverage.`;
  }

  if (daysLeft <= 30) {
    return `Expires in ${daysLeft} day(s) on ${expiration_date}. This is a renewal grenade — chase a fresh COI before you let them roll a truck on site.`;
  }

  if (daysLeft <= 90) {
    return `Expires in ${daysLeft} day(s) on ${expiration_date}. Not a fire drill yet, but get this on someone's radar so it never hits critical.`;
  }

  return `Coverage looks stable for now. Set a reminder before ${expiration_date} so this never turns into an expired problem.`;
}
