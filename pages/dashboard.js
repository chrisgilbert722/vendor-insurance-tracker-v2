import { useEffect, useState } from "react";

export default function Dashboard() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div style={{ padding: "40px" }}>
      <h1>Vendor Insurance Tracker Dashboard</h1>
      <p>Welcome! Choose an action below:</p>

      <a href="/upload-coi">Upload New COI →</a>

      <hr style={{ margin: "30px 0" }} />

      <h2>Saved Policies</h2>

      {loading && <p>Loading...</p>}

      {!loading && policies.length === 0 && (
        <p>No policies found. Upload one!</p>
      )}

      {policies.length > 0 && (
        <table
          style={{
            marginTop: "20px",
            borderCollapse: "collapse",
            width: "100%",
          }}
        >
          <thead>
            <tr>
              <th style={{ border: "1px solid #ccc", padding: "8px" }}>Policy #</th>
              <th style={{ border: "1px solid #ccc", padding: "8px" }}>Carrier</th>
              <th style={{ border: "1px solid #ccc", padding: "8px" }}>Coverage</th>
              <th style={{ border: "1px solid #ccc", padding: "8px" }}>Effective</th>
              <th style={{ border: "1px solid #ccc", padding: "8px" }}>Expires</th>
              <th style={{ border: "1px solid #ccc", padding: "8px" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {policies.map((p) => (
              <tr key={p.id}>
                <td style={{ border: "1px solid #ccc", padding: "8px" }}>{p.policy_number}</td>
                <td style={{ border: "1px solid #ccc", padding: "8px" }}>{p.carrier}</td>
                <td style={{ border: "1px solid #ccc", padding: "8px" }}>{p.coverage_type}</td>
                <td style={{ border: "1px solid #ccc", padding: "8px" }}>{p.effective_date}</td>
                <td style={{ border: "1px solid #ccc", padding: "8px" }}>{p.expiration_date}</td>
                <td style={{ border: "1px solid #ccc", padding: "8px" }}>{p.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
