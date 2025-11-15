import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import Header from "../components/Header";

// Badge Style
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

  const [metrics, setMetrics] = useState(null);
  const [deltas, setDeltas] = useState(null);

  // AUTH PROTECT
  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) router.push("/auth/login");
    }
    checkAuth();
  }, [router]);

  // LOAD POLICIES
  useEffect(() => {
    async function loadPolicies() {
      try {
        const res = await fetch("/api/get-policies");
        const data = await res.json();
        if (data.ok) setPolicies(data.policies);
      } catch (err) {
        console.error("FAILED TO LOAD POLICIES:", err);
      }
      setLoading(false);
    }
    loadPolicies();
  }, []);

  // LOAD METRICS SUMMARY
  useEffect(() => {
    async function loadSummary() {
      try {
        const res = await fetch("/api/metrics/summary");
        const data = await res.json();
        if (data.ok) {
          setMetrics(data.latest);
          setDeltas(data.deltas);
        }
      } catch (err) {
        console.error("METRICS FETCH FAILED:", err);
      }
    }
    loadSummary();
  }, []);

  // SEARCH FILTER
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

  return (
    <div style={{ padding: "40px" }}>
      <Header />

      <h1>Vendor Insurance Dashboard</h1>
      <p>Track vendor insurance compliance in real-time.</p>

      <a href="/upload-coi">Upload New COI →</a>

      <hr style={{ margin: "30px 0" }} />

      {/* ⭐⭐⭐ RISK SUMMARY BAR ⭐⭐⭐ */}
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
        <RiskItem
          label="Expired"
          icon="🔥"
          color="#b20000"
          count={metrics?.expired_count ?? 0}
          delta={deltas?.expired ?? 0}
        />
        <RiskItem
          label="Critical"
          icon="⚠️"
          color="#cc5200"
          count={metrics?.critical_count ?? 0}
          delta={deltas?.critical ?? 0}
        />
        <RiskItem
          label="Warning"
          icon="🟡"
          color="#b59b00"
          count={metrics?.warning_count ?? 0}
          delta={deltas?.warning ?? 0}
        />
        <RiskItem
          label="Active"
          icon="✅"
          color="#1b5e20"
          count={metrics?.ok_count ?? 0}
          delta={deltas?.ok ?? 0}
        />
        <ScoreItem
          avgScore={metrics?.avg_score}
          delta={deltas?.avg_score}
        />
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
          border: "1px solid #ccc", // FIXED BUG
          marginBottom: "16px",
        }}
      />

      {loading && <p>Loading policies...</p>}

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

                <td
                  style={{
                    ...td,
                    ...badgeStyle(p.expiration.level),
                    textAlign: "center",
                  }}
                >
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

// RISK ITEM BOX (with icon + delta arrow)
function RiskItem({ label, icon, color, count, delta }) {
  let arrow = "➖";
  let arrowColor = "#555";

  if (delta > 0) {
    arrow = "⬆️";
    arrowColor = "#b20000"; // more risk
  } else if (delta < 0) {
    arrow = "⬇️";
    arrowColor = "#1b5e20"; // less risk
  }

  return (
    <div style={{ textAlign: "center", minWidth: "80px" }}>
      <div style={{ fontSize: "24px" }}>{icon}</div>
      <div
        style={{ fontSize: "22px", fontWeight: "bold", color: color }}
      >
        {count}
      </div>
      <div style={{ fontSize: "13px", color: "#333" }}>{label}</div>
      <div style={{ fontSize: "12px", color: arrowColor }}>
        {arrow} {delta > 0 ? `+${delta}` : delta}
      </div>
    </div>
  );
}

// SCORE BOX (Avg Score)
function ScoreItem({ avgScore, delta }) {
  if (avgScore == null)
    return (
      <div style={{ textAlign: "center", minWidth: "80px" }}>
        <div style={{ fontSize: "24px" }}>📊</div>
        <div style={{ fontSize: "22px", fontWeight: "bold" }}>—</div>
        <div style={{ fontSize: "13px", color: "#333" }}>Avg Score</div>
        <div style={{ fontSize: "12px", color: "#555" }}>No data</div>
      </div>
    );

  let arrow = "➖";
  let arrowColor = "#555";

  if (delta > 0) {
    arrow = "⬆️";
    arrowColor = "#1b5e20";
  } else if (delta < 0) {
    arrow = "⬇️";
    arrowColor = "#b20000";
  }

  return (
    <div style={{ textAlign: "center", minWidth: "80px" }}>
      <div style={{ fontSize: "24px" }}>📊</div>
      <div
        style={{
          fontSize: "22px",
          fontWeight: "bold",
          color:
            avgScore >= 80
              ? "#1b5e20"
              : avgScore >= 60
              ? "#b59b00"
              : "#b20000",
        }}
      >
        {Math.round(avgScore)}
      </div>
      <div style={{ fontSize: "13px", color: "#333" }}>Avg Score</div>
      <div style={{ fontSize: "12px", color: arrowColor }}>
        {arrow} {delta > 0 ? `+${delta.toFixed(1)}` : delta?.toFixed?.(1) || "0"}
      </div>
    </div>
  );
}

// TABLE STYLES
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
