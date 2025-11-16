// pages/alerts.js
import { useEffect, useState } from "react";
import Link from "next/link";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [tone, setTone] = useState("professional"); // "professional" | "gmode"
  const [batchSending, setBatchSending] = useState(false);
  const [batchMessage, setBatchMessage] = useState("");

  useEffect(() => {
    async function loadAlerts() {
      try {
        const res = await fetch("/api/alerts/summary");
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || "Failed to load alerts");
        setAlerts(data);
      } catch (err) {
        setError(err.message || "Unknown alert load error");
      } finally {
        setLoading(false);
      }
    }
    loadAlerts();
  }, []);

  /* ============================================================
     BATCH SEND HANDLER
  ============================================================ */
  async function handleBatchSend(items, label) {
    setBatchMessage("");
    if (!items || items.length === 0) {
      setBatchMessage(`No ${label} items to email.`);
      return;
    }

    setBatchSending(true);

    try {
      const res = await fetch("/api/alerts/send-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, tone }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error);

      setBatchMessage(`Sent ${data.sent} email(s), skipped ${data.skipped}.`);
    } catch (err) {
      setBatchMessage(err.message || "Failed to send batch emails.");
    } finally {
      setBatchSending(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "#e5e7eb",
        padding: "30px 40px",
        fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
      }}
    >
      <div style={{ maxWidth: "960px", margin: "0 auto" }}>
        {/* HEADER */}
        <p style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.18em", color: "#64748b" }}>
          G-Track · Alerts Engine
        </p>
        <h1 style={{ fontSize: "30px", marginTop: "6px", marginBottom: "6px", fontWeight: 700 }}>
          Risk & Alerts Center
        </h1>

        <Link href="/dashboard" style={{ fontSize: "12px", color: "#38bdf8", textDecoration: "none" }}>
          ← Back to Dashboard
        </Link>

        {/* TONE TOGGLE */}
        <div style={{ marginTop: "18px", display: "flex", gap: "12px", alignItems: "center" }}>
          <span style={{ fontSize: "12px", color: "#94a3b8" }}>Email tone:</span>

          <button
            onClick={() => setTone("professional")}
            style={{
              padding: "4px 12px",
              borderRadius: "999px",
              border: "1px solid #1e293b",
              background: tone === "professional" ? "#0ea5e9" : "transparent",
              color: tone === "professional" ? "#0f172a" : "#e5e7eb",
            }}
          >
            Professional
          </button>

          <button
            onClick={() => setTone("gmode")}
            style={{
              padding: "4px 12px",
              borderRadius: "999px",
              border: "1px solid #1e293b",
              background: tone === "gmode" ? "#f97316" : "transparent",
              color: tone === "gmode" ? "#0f172a" : "#e5e7eb",
            }}
          >
            G-Mode
          </button>
        </div>

        {batchMessage && (
          <p style={{ marginTop: "12px", fontSize: "13px", color: "#a5b4fc" }}>
            {batchMessage}
          </p>
        )}
      </div>

      {/* MAIN BLOCK */}
      <div style={{ maxWidth: "960px", margin: "20px auto" }}>
        {loading && <p>Loading alerts…</p>}
        {error && <p style={{ color: "#f87171" }}>⚠ {error}</p>}

        {!loading && alerts && (
          <div style={{ display: "grid", gap: "20px" }}>
            {/* SUMMARY CARDS */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(170px,1fr))",
                gap: "16px",
              }}
            >
              <SummaryCard label="Expired" icon="🔥" count={alerts.counts.expired} tone="bad" />
              <SummaryCard label="Critical ≤ 30d" icon="⚠️" count={alerts.counts.critical} tone="warn" />
              <SummaryCard label="Warning ≤ 90d" icon="🟡" count={alerts.counts.warning} tone="soft" />
              <SummaryCard label="Non-Compliant" icon="🛡️" count={alerts.counts.nonCompliant} tone="bad" />
            </div>

            {/* NON-COMPLIANT */}
            <AlertList
              title="🛡️ Non-Compliant Vendors"
              subtitle="These vendors fail organizational coverage requirements. Treat as high-risk until updated COIs are received."
              items={alerts.nonCompliant}
              type="nonCompliant"
              tone={tone}
              batchSending={batchSending}
              onBatchSend={() =>
                handleBatchSend(alerts.nonCompliant, "non-compliant")
              }
            />

            {/* EXPIRED */}
            <AlertList
              title="🔥 Expired Policies"
              subtitle="These COIs are dead. If the vendor is onsite, you're carrying their risk."
              items={alerts.expired}
              type="expired"
              tone={tone}
              batchSending={batchSending}
              onBatchSend={() => handleBatchSend(alerts.expired, "expired")}
            />

            {/* CRITICAL */}
            <AlertList
              title="⚠️ Critical — Expires ≤ 30 Days"
              subtitle="These are about to expire. Chase these first."
              items={alerts.critical}
              type="critical"
              tone={tone}
              batchSending={batchSending}
              onBatchSend={() => handleBatchSend(alerts.critical, "critical")}
            />

            {/* WARNING */}
            <AlertList
              title="🟡 Warning — Expires ≤ 90 Days"
              subtitle="Not urgent yet, but keep them on your radar."
              items={alerts.warning}
              type="warning"
              tone={tone}
              batchSending={batchSending}
              onBatchSend={() => handleBatchSend(alerts.warning, "warning")}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   SUMMARY CARD COMPONENT
============================================================ */
function SummaryCard({ label, icon, count, tone }) {
  const background =
    tone === "bad"
      ? "linear-gradient(135deg, rgba(248,113,113,0.15), rgba(15,23,42,0.95))"
      : tone === "warn"
      ? "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(15,23,42,0.95))"
      : "linear-gradient(135deg, rgba(56,189,248,0.12), rgba(15,23,42,0.95))";

  return (
    <div
      style={{
        borderRadius: "16px",
        padding: "14px 16px",
        background,
        border: "1px solid rgba(148,163,184,0.25)",
      }}
    >
      <div style={{ fontSize: "22px" }}>{icon}</div>
      <div style={{ fontSize: "24px", fontWeight: 700 }}>{count}</div>
      <div style={{ fontSize: "13px", marginTop: "2px" }}>{label}</div>
    </div>
  );
}

/* ============================================================
   ALERT LIST COMPONENT (supports non-compliant)
============================================================ */
function AlertList({
  title,
  subtitle,
  items,
  type,
  tone,
  batchSending,
  onBatchSend,
}) {
  const [sendingId, setSendingId] = useState(null);
  const [sentIds, setSentIds] = useState({});
  const [localError, setLocalError] = useState("");

  const isNC = type === "nonCompliant";

  async function handleSendEmail(item) {
    setLocalError("");
    const idKey = item.id || item.vendor_id;
    setSendingId(idKey);

    try {
      const payload = isNC
        ? {
            vendorEmail: item.vendor_email,
            vendorName: item.vendor_name,
            policyNumber: "(N/A)",
            carrier: "",
            coverageType: item.missing.map((m) => m.coverage_type).join(", "),
            expirationDate: "",
            daysLeft: "",
            tone,
          }
        : {
            vendorEmail: item.vendor_email,
            vendorName: item.vendor_name,
            policyNumber: item.policy_number,
            carrier: item.carrier,
            coverageType: item.coverage_type,
            expirationDate: item.expiration_date,
            daysLeft: item.daysLeft,
            tone,
          };

      const res = await fetch("/api/alerts/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error);

      setSentIds((prev) => ({ ...prev, [idKey]: true }));
    } catch (err) {
      setLocalError(err.message || "Email failed");
    } finally {
      setSendingId(null);
    }
  }

  function renderLine(item) {
    if (isNC) {
      return `Missing: ${item.missing
        .map((m) => m.coverage_type)
        .join(", ")}. High compliance risk.`;
    }

    if (item.daysLeft === null) return "Unknown expiration.";
    if (item.daysLeft < 0) return `Expired ${Math.abs(item.daysLeft)} days ago.`;
    if (item.daysLeft <= 30) return `Expires in ${item.daysLeft} days.`;

    return `Expires in ${item.daysLeft} days.`;
  }

  return (
    <div
      style={{
        borderRadius: "18px",
        background: "linear-gradient(145deg, rgba(15,23,42,0.98), rgba(15,23,42,0.9))",
        padding: "16px 18px",
        border:
          type === "nonCompliant"
            ? "1px solid rgba(248,113,113,0.5)"
            : "1px solid rgba(51,65,85,0.5)",
      }}
    >
      <div style={{ marginBottom: "10px" }}>
        <h2 style={{ fontSize: "15px", fontWeight: 600 }}>{title}</h2>
        <p style={{ fontSize: "12px", color: "#94a3b8" }}>{subtitle}</p>
        {localError && (
          <p style={{ fontSize: "12px", color: "#fca5a5", marginTop: "4px" }}>
            ⚠ {localError}
          </p>
        )}
      </div>

      {/* Batch Send */}
      <button
        onClick={onBatchSend}
        disabled={batchSending || !items || items.length === 0}
        style={{
          marginBottom: "14px",
          padding: "6px 12px",
          borderRadius: "999px",
          background: "#22c55e",
          color: "#020617",
          border: "none",
          cursor:
            batchSending || !items || items.length === 0
              ? "not-allowed"
              : "pointer",
          opacity:
            batchSending || !items || items.length === 0 ? 0.5 : 1,
          fontSize: "12px",
          fontWeight: 600,
        }}
      >
        {batchSending ? "Sending…" : "Send all emails"}
      </button>

      {!items || items.length === 0 ? (
        <p style={{ fontSize: "12px", color: "#6b7280" }}>
          No items in this category.
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "10px" }}>
          {items.map((p) => {
            const idKey = p.id || p.vendor_id;

            return (
              <li
                key={idKey}
                style={{
                  borderRadius: "12px",
                  padding: "10px 12px",
                  background: "rgba(15,23,42,0.96)",
                  border: "1px solid rgba(71,85,105,0.8)",
                }}
              >
                <div style={{ fontWeight: 600 }}>{p.vendor_name}</div>

                <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                  {renderLine(p)}
                </div>

                {/* Email button */}
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
                  <button
                    onClick={() => handleSendEmail(p)}
                    disabled={
                      sendingId === idKey ||
                      sentIds[idKey] ||
                      !p.vendor_email
                    }
                    style={{
                      padding: "6px 10px",
                      borderRadius: "999px",
                      fontSize: "11px",
                      background: "#0ea5e9",
                      color: "#0f172a",
                      border: "none",
                      cursor:
                        sendingId === idKey ||
                        sentIds[idKey] ||
                        !p.vendor_email
                          ? "not-allowed"
                          : "pointer",
                      opacity:
                        sendingId === idKey ||
                        sentIds[idKey] ||
                        !p.vendor_email
                          ? 0.5
                          : 1,
                    }}
                  >
                    {sentIds[idKey]
                      ? "Email sent"
                      : sendingId === idKey
                      ? "Sending…"
                      : "Send email"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ============================================================
   OPTIONAL: LINE BREAKDOWN FOR FUTURE AI-COMMENTS
============================================================ */
function renderGModeLine(p) {
  // fallback — not used in main rendering anymore
  return "";
}
