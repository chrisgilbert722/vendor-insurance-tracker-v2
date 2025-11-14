import { useEffect, useState } from "react";

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

        if (data.ok) {
          setPolicies(data.policies);
        }
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

  function openDetails(p) {
    setSelectedPolicy(p);
    setShowModal(true);
  }

  function closeDetails() {
    setShowModal(false);
    setSelectedPolicy(null);
  }

  return (
    <div style={{ padding: "40px" }}>
      <h1>Vendor Insurance Tracker Dashboard</h1>
      <p>Welcome! Choose an action below:</p>

      <a href="/upload-coi">Upload New COI →</a>

      <hr style={{ margin: "30px 0" }} />

      <h2>Saved Policies</h2>

      <div style={{ marginBottom: "16px", marginTop: "8px" }}>
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
          }}
        />
      </div>

      {loading && <p>Loading...</p>}

      {!loading && filtered.length === 0 && (
        <p>No matching policies. Try a different search or upload a new COI.</p>
      )}

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
              <th style={{ border: "1px solid #ccc", padding: "8px" }}>Vendor</th>
              <th style={{ border: "1px solid #ccc", padding: "8px" }}>Policy #</th>
              <th style={{ border: "1px solid #ccc", padding: "8px" }}>Carrier</th>
              <th style={{ border: "1px solid #ccc", padding: "8px" }}>Coverage</th>
              <th style={{ border: "1px solid #ccc", padding: "8px" }}>Effective</th>
              <th style={{ border: "1px solid #ccc", padding: "8px" }}>Expires</th>
              <th style={{ border: "1px solid #ccc", padding: "8px" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr
                key={p.id}
                onClick={() => openDetails(p)}
                style={{ cursor: "pointer" }}
              >
                <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                  {p.vendor_name || "–"}
                </td>
                <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                  {p.policy_number}
                </td>
                <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                  {p.carrier}
                </td>
                <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                  {p.coverage_type}
                </td>
                <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                  {p.effective_date}
                </td>
                <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                  {p.expiration_date}
                </td>
                <td
                  style={{
                    border: "1px solid #ccc",
                    padding: "8px",
                    textAlign: "center",
                    ...statusStyles(p.computedStatus?.level),
                  }}
                >
                  {p.computedStatus?.label || "unknown"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Simple details modal */}
      {showModal && selectedPolicy && (
        <div
          onClick={closeDetails}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              padding: "24px",
              borderRadius: "8px",
              maxWidth: "600px",
              width: "100%",
              boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
            }}
          >
            <h3>Policy Details</h3>
            <p><strong>Vendor:</strong> {selectedPolicy.vendor_name || "–"}</p>
            <p><strong>Policy #:</strong> {selectedPolicy.policy_number}</p>
            <p><strong>Carrier:</strong> {selectedPolicy.carrier}</p>
            <p><strong>Coverage:</strong> {selectedPolicy.coverage_type}</p>
            <p><strong>Effective:</strong> {selectedPolicy.effective_date}</p>
            <p><strong>Expires:</strong> {selectedPolicy.expiration_date}</p>
            <p>
              <strong>Status:</strong>{" "}
              {selectedPolicy.computedStatus?.label || "unknown"}
            </p>
            <p><strong>Created:</strong> {new Date(selectedPolicy.created_at).toLocaleString()}</p>

            <button
              onClick={closeDetails}
              style={{
                marginTop: "16px",
                padding: "8px 16px",
                borderRadius: "4px",
                border: "none",
                background: "#333",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
