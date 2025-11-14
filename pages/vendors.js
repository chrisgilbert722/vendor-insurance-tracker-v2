import { useState } from "react";
import Header from "../components/Header";

export default function VendorsPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [createdVendor, setCreatedVendor] = useState(null);

  async function handleCreate() {
    setError("");
    setSuccess("");
    setCreatedVendor(null);

    if (!name.trim()) {
      setError("Vendor name is required.");
      return;
    }

    try {
      const res = await fetch("/api/vendors/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error);

      setCreatedVendor(data.vendor);
      setSuccess("Vendor created successfully!");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div style={{ padding: "40px" }}>
      <Header />

      <h1>Vendors</h1>
      <p>Create a vendor and get a self-service COI upload link.</p>

      <div style={{ marginTop: "20px", maxWidth: "400px" }}>
        <label>Vendor Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
        />

        <label>Vendor Email (optional)</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
        />

        <button onClick={handleCreate} style={{ padding: "8px 16px" }}>
          Create Vendor
        </button>

        {error && <p style={{ color: "red" }}>❌ {error}</p>}
        {success && <p style={{ color: "green" }}>✅ {success}</p>}
        {createdVendor && (
          <pre
            style={{
              padding: "12px",
              background: "#f4f4f4",
              borderRadius: "6px",
              marginTop: "10px",
            }}
          >
            Vendor: {createdVendor.name}
            {"\n"}
            Upload Link:
            {"\n"}
            {createdVendor.uploadUrl}
          </pre>
        )}
      </div>

      <hr style={{ margin: "30px 0" }} />
      <a href="/dashboard">← Back to Dashboard</a>
    </div>
  );
}
