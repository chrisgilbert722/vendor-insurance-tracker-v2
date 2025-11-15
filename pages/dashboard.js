import { useEffect, useState } from "react";
import Header from "../components/Header";

// Badge Style based on expiration level
function badgeStyle(level) {
  switch (level) {
    case "expired":
      return { background: "#ffebee", color: "#b71c1c", fontWeight: "600" };
    case "critical":
      return { background: "#fff3e0", color: "#e65100", fontWeight: "600" };
    case "warning":
      return { background: "#fff8e1", color: "#f9a825", fontWeight: "600" };
    case "ok":
      return { background: "#e8f5e9", color: "#1b5e20", fontWeight: "600" };
    default:
      return { background: "#eceff1", color: "#546e7a" };
  }
}

export default function Dashboard() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState("");
  const [metrics, setMetrics] = useState(null);
  const [deltas, setDeltas] = useState(null);

  // Load policies from backend
  useEffect(() => {
    async function loadPolicies() {
      try {
        const res = await fetch("/api/get-policies");
        const data = await res.json();
        if (data.ok) {
          setPolicies(data.policies);
        } else {
          console.error("Error from /api/get-policies:", data.error);
        }
      } catch (err) {
        console.error("FAILED TO LOAD POLICIES:", err);
      } finally {
        setLoading(false);
      }
    }

    loadPolicies();
  }, []);

  // Load metrics summary (for risk summary bar)
  useEffect(() => {
    async function loadSummary() {
      try {
        const res = await fetch("/api/metrics/summary");
        const data = await res.json();
        if (data.ok) {
          setMetrics(data.latest);
          setDeltas(data.deltas);
        } else {
          console.error("Error from /api/metrics/summary:", data.error);
        }
      } catch (err) {
        console.error("METRICS FETCH FAILED:", err);
      }
    }

    loadSummary();
  }, []);

  // Filtered view for search
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

      <h1 style={{ marginBottom: "8px" }}>Vendor Insurance Dashboard</h1>
      <p style={{ color: "#607d8b", marginBottom: "8px" }}>
        Real-time visibility into vendor insurance compliance, expiration risk,
        and coverage health.
      </p>

      <a
        href="/upload-coi"
        style={{
          display: "inline-block",
          marginTop: "8px",
          marginBottom: "16px",
          padding: "8px 16px",
          borderRadius: "999px",
          background: "#111827",
          color: "#fff",
          textDecoration: "none",
          fontSize: "14px",
        }}
      >
        + Upload New COI
      </a>

      <hr style={{ margin: "20px 0" }} />

      {/* ELITE HYBRID RISK SUMMARY BAR */}
      <div
        style={{
          display: "flex",
          gap: "16px",
          marginBottom: "28px",
          padding: "20px",
          background: "#ffffff",
          borderRadius: "16px",
          boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
        }}
      >
        <RiskItem
          label="Expired"
          icon="🔥"
          color="#b71c1c"
          count={metrics?.expired_count ?? 0}
          delta={deltas?.expired ?? 0}
        />
        <RiskItem
          label="Critical"
          icon="⚠️"
          color="#e65100"
          count={metrics?.critical_count ?? 0}
          delta={deltas?.critical ?? 0}
        />
        <RiskItem
          label="Warning"
          icon="🟡"
          color="#f9a825"
          count={metrics?.warning ?? 0}
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

      <h2 style={{ marginBottom: "12px" }}>Policies</h2>

      <input
        type="text"
        placeholder="Search vendors, carriers, policy #, coverage..."
        value={filterText}
        onChange={(e) => setFilterText(e.target.value)}
        style={{
          padding: "8px",
          width: "320px",
          borderRadius: "4px",
          border: "1px solid #ccc",
          marginBottom: "16px",
          fontSize: "14px",
        }}
      />

      {loading && <p>Loading policies...</p>}

      {!loading && filtered.length === 0 && (
        <p>No matching policies. Try a different search or upload a new COI.</p>
      )}

      {filtered.length > 0 && (
        <div
          style={{
            borderRadius: "16px",
            background: "#ffffff",
            boxShadow: "0 4px 16px rgba(15, 23, 42, 0.04)",
            overflow: "hidden",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "14px",
            }}
          >
            <thead style={{ background: "#f5f5f5" }}>
              <tr>
                <th style={th}>Vendor</th>
                <th style={th}>Policy #</th>
                <th style={th}>Carrier</th>
                <th style={th}>Coverage</th>
                <th style={th}>Expires</th>
                <th style={th}>Days Left</th>
                <th style={th}>Status</th>
                <th style={th}>Risk</th>
                <th style={th}>Score</th>
                <th style={th}>Flags</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const exp = p.expiration || {};
                const score = p.complianceScore ?? 0;
                const riskBucket = p.riskBucket || "Unknown";
                const flags = Array.isArray(p.flags) ? p.flags : [];

                return (
                  <tr key={p.id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={td}>{p.vendor_name || "—"}</td>
                    <td style={td}>{p.policy_number}</td>
                    <td style={td}>{p.carrier}</td>
                    <td style={td}>{p.coverage_type}</td>
                    <td style={td}>{p.expiration_date || "—"}</td>
                    <td style={td}>
                      {typeof exp.daysRemaining === "number"
                        ? `${exp.daysRemaining} days`
                        : "—"}
                    </td>

                    <td style={{ ...td, ...badgeStyle(exp.level), textAlign: "center" }}>
                      {exp.label || "Unknown"}
                    </td>

                    <td style={{ ...td, fontWeight: "500" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: "999px",
                          background: "#eceff1",
                          fontSize: "12px",
                        }}
                      >
                        {riskBucket}
                      </span>
                    </td>

                    <td style={{ ...td, textAlign: "center" }}>
                      <div
                        style={{
                          fontWeight: "700",
                          color:
                            score >= 90
                              ? "#1b5e20"
                              : score >= 70
                              ? "#f9a825"
                              : score >= 40
                              ? "#e65100"
                              : "#b71c1c",
                        }}
                      >
                        {score}
                      </div>
                      <div
                        style={{
                          marginTop: "4px",
                          height: "4px",
                          width: "70px",
                          background: "#eceff1",
                          borderRadius: "999px",
                          overflow: "hidden",
                          marginLeft: "auto",
                          marginRight: "auto",
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.min(score, 100)}%`,
                            height: "100%",
                            background:
                              score >= 90
                                ? "#4caf50"
                                : score >= 70
                                ? "#ffca28"
                                : score >= 40
                                ? "#ff9800"
                                : "#ef5350",
                            transition: "width 0.3s ease",
                          }}
                        />
                      </div>
                    </td>

                    {/* Flags with tooltip (Icon + count) */}
                    <td style={{ ...td, textAlign: "center" }}>
                      {flags.length === 0 ? (
                        <span style={{ color: "#9e9e9e", fontSize: "12px" }}>
                          —
                        </span>
                      ) : (
                        <span
                          title={flags.join("\n")}
                          style={{
                            cursor: "help",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            fontSize: "12px",
                          }}
                        >
                          <span>🚩</span>
                          <span>{flags.length} flag{flags.length > 1 ? "s" : ""}</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Risk card in summary bar
function RiskItem({ label, icon, color, count, delta }) {
  let arrow = "➖";
  let arrowColor = "#90a4ae";

  if (delta > 0) {
    arrow = "⬆️";
    arrowColor = "#b71c1c";
  } else if (delta < 0) {
    arrow = "⬇️";
    arrowColor = "#1b5e20";
  }

  return (
    <div style={{ textAlign: "center", flex: 1, minWidth: "90px" }}>
      <div style={{ fontSize: "22px" }}>{icon}</div>
      <div style={{ fontSize: "22px", fontWeight: "700", color }}>
        {count}
      </div>
      <div style={{ fontSize: "13px", marginTop: "4px", color: "#37474f" }}>
        {label}
      </div>
      <div style={{ fontSize: "12px", marginTop: "4px", color: arrowColor }}>
        {arrow} {delta > 0 ? `+${delta}` : delta}
      </div>
    </div>
  );
}

// Score card in summary bar
function ScoreItem({ avgScore, delta }) {
  if (!avgScore && avgScore !== 0) {
    return (
      <div style={{ textAlign: "center", minWidth: "90px" }}>
        <div style={{ fontSize: "22px" }}>📊</div>
        <div style={{ fontSize: "22px", fontWeight: "700" }}>—</div>
        <div style={{ fontSize: "13px", marginTop: "4px", color: "#37474f" }}>
          Avg Score
        </div>
        <div style={{ fontSize: "12px", marginTop: "4px", color: "#90a4ae" }}>
          No data
        </div>
      </div>
    );
  }

  const score = Number(avgScore) || 0;

  let arrow = "➖";
  let arrowColor = "#90a4ae";

  if (delta > 0) {
    arrow = "⬆️";
    arrowColor = "#1b5e20";
  } else if (delta < 0) {
    arrow = "⬇️";
    arrowColor = "#b71c1c";
  }

  const color =
    score >= 90 ? "#1b5e20" : score >= 70 ? "#b59b00" : score >= 40 ? "#e65100" : "#b20000";

  return (
    <div style={{ textAlign: "center", minWidth: "90px" }}>
      <div style={{ fontSize: "22px" }}>📊</div>
      <div style={{ fontSize: "22px", fontWeight: "700", color }}>
        {score.toFixed(0)}
      </div>
      <div style={{ fontSize: "13px", marginTop: "4px", color: "#37474f" }}>
        Avg Score
      </div>
      <div style={{ fontSize: "12px", marginTop: "4px", color: arrowColor }}>
        {arrow} {typeof delta === "number" ? delta.toFixed(1) : "0.0"}
      </div>
      <div
        style={{
          marginTop: "6px",
          height: "4px",
          width: "80px",
          background: "#eceff1",
          borderRadius: "999px",
          overflow: "hidden",
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        <div
          style={{
            width: `${Math.min(score, 100)}%`,
            height: "100%",
            background: color,
            transition: "width 0.3s ease",
          }}
        />
      </div>
    </div>
  );
}

// TABLE STYLES
const th = {
  padding: "10px",
  border: "1px solid #e0e0e0",
  fontWeight: "600",
  textAlign: "left",
  fontSize: "13px",
  color: "#546e7a",
};

const td = {
  padding: "10px",
  borderBottom: "1px solid #f0f0f0",
  fontSize: "13px",
  color: "#37474f",
};
