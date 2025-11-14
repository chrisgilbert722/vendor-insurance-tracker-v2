import { useEffect, useState } from "react";
import Header from "../components/Header";

function statusStyles(level) {
  switch (level) {
    case "expired":
      return { background: "#ffe5e5", color: "#b00020", fontWeight: "bold" };
    case "critical":
      return { background: "#fff4e5", color: "#e65100", fontWeight: "bold" };
    case "warning":
      return { background: "#fffbe5", color: "#f9a825", fontWeight: "bold" };
    case "ok":
      return { background: "#e6f4ea", color: "#1b5e20", fontWeight: "bold" };
    default:
      return { background: "#f5f5f5", color: "#555" };
  }
}

export default function Dashboard() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState(null);

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

      <h1>Vendor Insurance Tracker Dashboard</h1>
      <p>Welcome! Choose an action below:</p>

      <a href="/upload-coi">Upload New COI →</a>

      <hr style={{ margin: "30px 0" }} />

      <h2>Saved Policies</h2>

      <input
        type="text"
        placeholder="Search by vendor, carrier, policy #, coverage..."
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

      {!loading && filtered.length === 0 && <p>No matching policies.</p>}

      {filtered.length > 0 && (
        <table
          style={{
            marginTop: "12px",
            borderCollapse: "collapse",
            width: "100%",
          }}
        >
          <thead>
            <tr>
              <th>Vendor</th>
              <th>Policy #</th>
              <th>Carrier</th>
              <th>Coverage</th>
              <th>Effective</th>
              <th>Expires</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr
                key={p.id}
                onClick={() => {
                  setSelectedPolicy(p);
                  setShowModal(true);
                }}
                style={{ cursor: "pointer" }}
              >
                <td>{p.vendor_name || "—"}</td>
                <td>{p.policy_number}</td>
                <td>{p.carrier}</td>
                <td>{p.coverage_type}</td>
                <td>{p.effective_date}</td>
                <td>{p.expiration_date}</td>
                <td style={{ ...statusStyles(p.computedStatus?.level) }}>
                  {p.computedStatus?.label || "unknown"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showModal && selectedPolicy && (
        <div
          onClick={() => setShowModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              padding: "24px",
              borderRadius: "8px",
              width: "500px",
            }}
          >
            <h3>Policy Details</h3>

            <p><b>Vendor:</b> {selectedPolicy.vendor_name || "—"}</p>
            <p><b>Policy #:</b> {selectedPolicy.policy_number}</p>
            <p><b>Carrier:</b> {selectedPolicy.carrier}</p>
            <p><b>Coverage:</b> {selectedPolicy.coverage_type}</p>
            <p><b>Effective:</b> {selectedPolicy.effective_date}</p>
            <p><b>Expires:</b> {selectedPolicy.expiration_date}</p>

            <button
              onClick={() => setShowModal(false)}
              style={{ marginTop: "12px", padding: "8px 16px" }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
