import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import Header from "../components/Header";

// Color badge UI
function badgeStyle(level) {
  switch (level) {
    case "expired":
      return { background: "#ffcccc", color: "#b20000", fontWeight: "bold" };
    case "critical":
      return { background: "#ffe6cc", color: "#cc5200", fontWeight: "bold" };
    case "warning":
      return { background: "#fff8cc", color: "#b59b00", fontWeight: "bold" };
    case "ok":
      return { background: "#e6ffe6", color: "#1b5e20", fontWeight: "bold" };
    default:
      return { background: "#e6e6e6", color: "#555" };
  }
}

export default function Dashboard() {
  const router = useRouter();
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState("");

  // Protect dashboard
  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) router.push("/auth/login");
    }
    checkAuth();
  }, [router]);

  // Load policies
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/get-policies");
        const data = await res.json();
        if (data.ok) setPolicies(data.policies);
      } catch (err) {
        console.error("Failed to load policies:", err);
      }
      setLoading(false);
    }
    load();
  }, []);

  // Apply the search filtering
  const filtered = policies.filter((p) => {
    const t = filterText.toLowerCase();
    if (!t) return true;
    return (
      (p.vendor_name || "").toLowerCase().includes(t) ||
      (p.policy_number || "").toLowerCase().includes(t) ||
      (p.carrier || "").toLowerCase().includes(t) ||
      (p.coverage_type || "").toLowerCase().includes(t)
    );
  });

  // 🔥 RISK SUMMARY COUNTS
  const summary = {
    expired: filtered.filter((p) => p.expiration.level === "expired").length,
    critical: filtered.filter((p) => p.expiration.level === "critical").length,
    warning: filtered.filter((p) => p.expiration.level === "warning").length,
    ok: filtered.filter((p) => p.expiration.level === "ok").length,
  };

  return (
    <div style={{ padding: "40px" }}>
      <Header />

      <h1>Vendor Insurance Dashboard</h1>
      <p>Track vendor insurance compliance and expirations in real-time.</p>

      <a href="/upload-coi">Upload New COI →</a>

      <hr style={{ margin: "30px 0" }} />

      {/* 🔥🔥🔥 RISK SUMMARY BAR 🔥🔥🔥 */}
      <div
        style={{
          display: "flex",
          gap: "20px",
          marginBottom: "30px",
          padding: "20px",
          background: "#f7f7f7",
          borderRadius: "12px",
        }}
      >
        <RiskItem color="#b20000" label="Expired" count={summary.expired} />
        <RiskItem color="#cc5200" label="Critical" count={summary.critical} />
        <RiskItem color="#b59b00" label="Warning" count={summary.warning} />
        <RiskItem color="#1b5e20" label="Active" count={summary.ok} />
      </div>

      <h2>Policies</h2>

      <input
        type="text"
        placeholder="Search vendors, carriers, policy #..."
        value={filterText}
        onChange={(e) => setFilterText(e.target.value)}
        style={{
          padding: "8px",
          width: "320px",
          borderRadius: "4px",
          border: "1px solid #ccc",
          marginBottom: "16px",
        }}
      />

      {loading && <p>Loading...</p>}

      {!loading && filtered.length === 0 && (
        <p>No matching policies. Try a different search or upload a new COI.</p>
      )}

      {filtered.length > 0 && (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginTop: "12px",
          }}
        >
          <thead>
            <tr style={{ background: "#f4f4f4" }}>
              <th style={th}>Vendor</th>
              <th style={th}>Policy #</th>
              <th style={th}>Carrier</th>
              <th style={th}>Coverage</th>
              <th style={th}>Expires</th>
              <th style={th}>Days Left</th>
              <th style={th}>Status</th>
              <th style={th}>Score</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} style={{ cursor: "pointer" }}>
                <td style={td}>{p.vendor_name || "—"}</td>
                <td style={td}>{p.policy_number}</td>
                <td style={td}>{p.carrier}</td>
                <td style={td}>{p.coverage_type}</td>
                <td style={td}>{p.expiration_date}</td>
                <td style={td}>{p.expiration.daysRemaining ?? "—"}</td>

                <td style={{ ...td, ...badgeStyle(p.expiration.level), textAlign: "center" }}>
                  {p.expiration.label}
                </td>

                <td style={{ ...td, fontWeight: "bold", textAlign: "center" }}>
                  {p.complianceScore}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// RISK SUMMARY COMPONENT
function RiskItem({ color, label, count }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          fontSize: "24px",
          fontWeight: "bold",
          color: color,
          marginBottom: "4px",
        }}
      >
        {count}
      </div>
      <div style={{ color: "#333", fontSize: "14px" }}>{label}</div>
    </div>
  );
}

// Table styles
const th = {
  padding: "10px",
  border: "1px solid #ddd",
  fontWeight: "bold",
  textAlign: "left",
};

const td = {
  padding: "10px",
  border: "1px solid #ddd",
};

