import { useEffect, useState } from "react";

const card = {
  padding: "14px 18px",
  borderRadius: "12px",
  background: "rgba(15, 23, 42, 0.9)",
  border: "1px solid rgba(148,163,184,0.4)",
  color: "#e5e7eb",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "20px",
};

const label = {
  fontSize: "11px",
  color: "#9ca3af",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const title = {
  fontSize: "13px",
  fontWeight: 600,
};

const pillBase = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "5px 12px",
  borderRadius: "9999px",
  fontSize: "11px",
  fontWeight: 500,
};

const dot = {
  width: "8px",
  height: "8px",
  borderRadius: "50%",
};

function colors(health) {
  switch (health) {
    case "healthy":
      return {
        pillBg: "rgba(34,197,94,0.15)",
        pillBorder: "rgba(34,197,94,0.5)",
        pillText: "#4ade80",
        dotBg: "#22c55e",
      };
    case "warning":
      return {
        pillBg: "rgba(234,179,8,0.15)",
        pillBorder: "rgba(234,179,8,0.5)",
        pillText: "#facc15",
        dotBg: "#eab308",
      };
    case "stale":
      return {
        pillBg: "rgba(248,113,113,0.15)",
        pillBorder: "rgba(248,113,113,0.5)",
        pillText: "#fca5a5",
        dotBg: "#ef4444",
      };
    case "error":
      return {
        pillBg: "rgba(239,68,68,0.15)",
        pillBorder: "rgba(239,68,68,0.5)",
        pillText: "#f87171",
        dotBg: "#ef4444",
      };
    case "missing":
    default:
      return {
        pillBg: "rgba(148,163,184,0.15)",
        pillBorder: "rgba(148,163,184,0.5)",
        pillText: "#e5e7eb",
        dotBg: "#94a3b8",
      };
  }
}

function healthText(h) {
  switch (h) {
    case "healthy": return "Healthy";
    case "warning": return "Delayed";
    case "stale": return "Stale";
    case "error": return "Error";
    case "missing": return "No Signal";
    default: return "Unknown";
  }
}

export default function RenewalsHealthWidget() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const res = await fetch("/api/renewals/health");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setData({ ok: false, health: "error", error: err.message });
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 30000); // auto-refresh
    return () => clearInterval(id);
  }, []);

  const h = data?.health || "unknown";
  const c = colors(h);

  return (
    <div style={card}>
      <div>
        <div style={label}>Renewals Engine</div>
        <div style={title}>CRON Heartbeat</div>

        <div style={{ marginTop: "6px", fontSize: "11px", color: "#94a3b8" }}>
          {loading && "Checking…"}
          {!loading && data?.lastRunAt && (
            <>
              Last run:{" "}
              {new Date(data.lastRunAt).toLocaleString(undefined, {
                hour12: true,
              })}
              {typeof data.diffMinutes === "number" && (
                <> · {data.diffMinutes} min ago</>
              )}
              {typeof data.runCount === "number" && (
                <> · total: {data.runCount}</>
              )}
            </>
          )}
          {!loading && !data?.lastRunAt && "No runs recorded yet."}
        </div>
      </div>

      <div
        style={{
          ...pillBase,
          background: c.pillBg,
          border: `1px solid ${c.pillBorder}`,
          color: c.pillText,
        }}
      >
        <div
          style={{
            ...dot,
            background: c.dotBg,
            boxShadow: `0 0 6px ${c.dotBg}`,
          }}
        ></div>
        <span>{healthText(h)}</span>
      </div>
    </div>
  );
}
