// components/vendors/GVITable.js
import Link from "next/link";

const GP = {
  soft: "#94a3b8",
  neonBlue: "#38bdf8",
  neonGreen: "#22c55e",
  neonGold: "#facc15",
  neonRed: "#fb7185",
};

function Pill({ color, children }) {
  return (
    <span style={{ padding: "3px 10px", borderRadius: 999, border: `1px solid ${color}`, color }}>
      {children}
    </span>
  );
}

export default function GVITable({ vendors }) {
  if (!Array.isArray(vendors) || vendors.length === 0) {
    return <div style={{ fontSize: 13, color: GP.soft, textAlign: "center", padding: 20 }}>No vendor data available.</div>;
  }

  return (
    <table style={{ width: "100%", fontSize: 13 }}>
      <tbody>
        {vendors.map((v) => {
          const compliance = v.compliance || {};
          const status =
            compliance.status ||
            v.status ||
            v.computedStatus ||
            "unknown";

          return (
            <tr key={v.id}>
              <td>
                <Link href={`/vendor/${v.id}`}>
                  <span style={{ color: GP.neonBlue }}>{v.name}</span>
                </Link>
              </td>

              <td>
                <Pill
                  color={
                    status === "fail"
                      ? GP.neonRed
                      : status === "warn"
                      ? GP.neonGold
                      : GP.neonGreen
                  }
                >
                  {String(status).toUpperCase()}
                </Pill>
              </td>

              <td>{v.alertsCount ?? 0}</td>
              <td>{v.aiScore ?? "—"}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
