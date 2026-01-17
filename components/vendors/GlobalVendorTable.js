import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function GlobalVendorTable({ orgId }) {
  const router = useRouter();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!orgId) return;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`/api/vendors/gvi?orgId=${orgId}`);
        const data = await res.json();
        if (!data.ok) throw new Error(data.error);

        setVendors(Array.isArray(data.vendors) ? data.vendors : []);
      } catch (err) {
        console.error("[vendors] load error", err);
        setError("Failed to load vendors");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [orgId]);

  if (loading) {
    return <div style={{ fontSize: 12, color: "#9ca3af" }}>Loading vendors…</div>;
  }

  if (error) {
    return <div style={{ fontSize: 12, color: "#fecaca" }}>{error}</div>;
  }

  return (
    <div>
      <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {["Vendor", "Status", "AI Score", "Alerts", "Actions"].map((h) => (
              <th
                key={h}
                style={{
                  padding: "8px 10px",
                  color: "#9ca3af",
                  borderBottom: "1px solid rgba(51,65,85,0.9)",
                  textAlign: "left",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {vendors.map((v) => {
            if (!v.external_uuid) {
              console.error("[vendors] Missing external_uuid:", v);
              return null;
            }

            const status = v.status || v.computedStatus || "unknown";

            return (
              <tr
                key={v.external_uuid}
                onClick={() => router.push(`/admin/vendor/${v.id}`)}
                style={{
                  cursor: "pointer",
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background =
                    "rgba(56,189,248,0.08)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <td style={cell}>{v.name}</td>
                <td style={cell}>{status.toUpperCase()}</td>
                <td style={cell}>{v.aiScore ?? "—"}</td>
                <td style={cell}>{v.alertsCount ?? 0}</td>

                <td style={{ ...cell, textAlign: "right" }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "6px 14px",
                      borderRadius: 999,
                      border: "1px solid rgba(56,189,248,0.9)",
                      background:
                        "radial-gradient(circle at top,#38bdf8,#0ea5e9,#020617)",
                      color: "#e0f2fe",
                      fontSize: 11,
                      fontWeight: 700,
                      boxShadow: "0 0 18px rgba(56,189,248,0.6)",
                      pointerEvents: "none", // 🔒 row handles click
                    }}
                  >
                    ⚡ Review
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const cell = {
  padding: "8px 10px",
  borderBottom: "1px solid rgba(51,65,85,0.6)",
};
