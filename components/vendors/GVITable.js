// components/vendors/GVITable.js
// CINEMATIC GVI TABLE V4.5 — with renewal intelligence

import Link from "next/link";

const GP = {
  ink: "#0f172a",
  panel: "rgba(15,23,42,0.92)",
  border: "rgba(148,163,184,0.45)",
  text: "#e5e7eb",
  soft: "#94a3b8",

  neonBlue: "#38bdf8",
  neonPurple: "#a855f7",
  neonGreen: "#22c55e",
  neonGold: "#facc15",
  neonRed: "#fb7185",
};

const STAGE_ICONS = {
  0: "💀",
  1: "🔥",
  3: "⏳",
  7: "⚠️",
  30: "📅",
  90: "🟦",
  999: "💠"
};
function Pill({ color, children }) {
  return (
    <span
      style={{
        padding: "3px 10px",
        borderRadius: 999,
        background: `${color}22`,
        border: `1px solid ${color}55`,
        fontSize: 11,
        fontWeight: 600,
        color,
        display: "inline-flex",
      }}
    >
      {children}
    </span>
  );
}

function ScoreBar({ score }) {
  const color =
    score >= 85
      ? GP.neonGreen
      : score >= 60
      ? GP.neonGold
      : GP.neonRed;

  return (
    <div
      style={{
        width: "100%",
        height: 6,
        borderRadius: 999,
        background: "rgba(15,23,42,0.7)",
        marginTop: 4,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${score}%`,
          height: "100%",
          background: color,
        }}
      />
    </div>
  );
}

function RenewalBadge({ stage, label }) {
  const color =
    stage === 0
      ? GP.neonRed
      : stage <= 3
      ? GP.neonGold
      : stage <= 7
      ? GP.neonBlue
      : stage <= 30
      ? GP.neonPurple
      : GP.neonGreen;

  return (
    <span
      style={{
        padding: "3px 10px",
        borderRadius: 999,
        background: `${color}22`,
        border: `1px solid ${color}55`,
        fontSize: 11,
        fontWeight: 600,
        color,
        whiteSpace: "nowrap",
      }}
    >
      {STAGE_ICONS[stage] || "📄"} {label}
    </span>
  );
}
export default function GVITable({ vendors }) {
  if (!vendors || !vendors.length) {
    return (
      <div
        style={{
          fontSize: 13,
          color: GP.soft,
          textAlign: "center",
          padding: 20,
        }}
      >
        No vendor data available.
      </div>
    );
  }

  return (
    <div
      style={{
        borderRadius: 28,
        background:
          "radial-gradient(circle at top left,rgba(15,23,42,0.98),rgba(15,23,42,0.92))",
        border: `1px solid ${GP.border}`,
        boxShadow:
          "0 0 35px rgba(0,0,0,0.7), inset 0 0 25px rgba(0,0,0,0.7)",
        overflow: "hidden",
        marginTop: 24,
      }}
    >
      <table
        style={{
          width: "100%",
          fontSize: 13,
          borderCollapse: "separate",
          borderSpacing: 0,
        }}
      >
        <thead>
          <tr>
            {[
              "Vendor",
              "Compliance",
              "Alerts",
              "AI Score",
              "Renewal",
              "Days Left",
              "Next Action",
            ].map((h) => (
              <th
                key={h}
                style={{
                  padding: "12px 14px",
                  textAlign: "left",
                  color: GP.soft,
                  background: "rgba(15,23,42,1)",
                  fontWeight: 600,
                  borderBottom: "1px solid rgba(51,65,85,0.8)",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {vendors.map((v) => {
            const c = v.compliance || {};
            const r = v.renewal || {};
            const scoreColor =
              v.aiScore >= 85
                ? GP.neonGreen
                : v.aiScore >= 60
                ? GP.neonGold
                : GP.neonRed;

            const urgencyColor =
              r.urgency_score >= 90
                ? GP.neonRed
                : r.urgency_score >= 70
                ? GP.neonGold
                : r.urgency_score >= 40
                ? GP.neonBlue
                : GP.neonGreen;

            return (
              <tr
                key={v.id}
                style={{
                  background:
                    "linear-gradient(90deg,rgba(15,23,42,0.98),rgba(15,23,42,0.94))",
                  borderBottom: "1px solid rgba(51,65,85,0.4)",
                  transition: "0.15s ease",
                }}
              >
                {/* Vendor */}
                <td style={{ padding: "12px 14px", fontWeight: 600 }}>
                  <Link href={`/vendor/${v.id}`}>
                    <span
                      style={{
                        color: GP.neonBlue,
                        cursor: "pointer",
                        textDecoration: "none",
                      }}
                    >
                      {v.name}
                    </span>
                  </Link>
                </td>

                {/* Compliance */}
                <td style={{ padding: "12px 14px" }}>
                  <Pill color={c.status === "fail" ? GP.neonRed : c.status === "warn" ? GP.neonGold : GP.neonGreen}>
                    {c.status.toUpperCase()}
                  </Pill>
                  <div style={{ fontSize: 11, color: GP.soft, marginTop: 4 }}>
                    {c.summary}
                  </div>
                </td>

                {/* Alerts */}
                <td style={{ padding: "12px 14px" }}>
                  <Pill color={v.alertsCount > 0 ? GP.neonRed : GP.neonGreen}>
                    {v.alertsCount}
                  </Pill>
                </td>

                {/* AI Score */}
                <td style={{ padding: "12px 14px", color: scoreColor, fontWeight: 700 }}>
                  {v.aiScore}
                  <ScoreBar score={v.aiScore} />
                </td>

                {/* Renewal Stage */}
                <td style={{ padding: "12px 14px" }}>
                  <RenewalBadge
                    stage={r.stage}
                    label={r.stage_label}
                  />
                </td>

                {/* Days Left */}
                <td
                  style={{
                    padding: "12px 14px",
                    fontWeight: 700,
                    color: urgencyColor,
                  }}
                >
                  {r.daysLeft !== null ? r.daysLeft : "—"}
                </td>

                {/* Next Action */}
                <td style={{ padding: "12px 14px", fontSize: 12, color: GP.soft }}>
                  {r.next_action}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
