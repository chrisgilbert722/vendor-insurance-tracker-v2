import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

export default function VendorsPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [createdVendor, setCreatedVendor] = useState(null);

  // ✅ Protect route
  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push("/auth/login");
        return;
      }
    }

    checkAuth();
  }, [router]);

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
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to create vendor.");
      }

      setCreatedVendor(data.vendor);
      setSuccess("Vendor created successfully!");
    } catch (err) {
      setError(err.message || "Unknown error");
    }
  }

  return (
    <div style={{ padding: "40px" }}>
      <h1>Vendors</h1>
      <p>Create a vendor and get a self-service COI upload link.</p>

      <div style={{ marginTop: "20px", maxWidth: "400px" }}>
        <div style={{ marginBottom: "10px" }}>
          <label>
            Vendor Name
            <br />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: "100%", padding: "8px", marginTop: "4px" }}
            />
          </label>
        </div>

        <div style={{ marginBottom: "10px" }}>
          <label>
            Vendor Email (optional)
            <br />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: "100%", padding: "8px", marginTop: "4px" }}
            />
          </label>
        </div>

        <button onClick={handleCreate} style={{ padding: "8px 16px" }}>
          Create Vendor
        </button>

        {error && <p style={{ color: "red", marginTop: "10px" }}>❌ {error}</p>}
        {success && (
          <p style={{ color: "green", marginTop: "10px" }}>✅ {success}</p>
        )}

        {createdVendor && (
          <div
            style={{
              marginTop: "16px",
              padding: "12px",
              border: "1px solid #ccc",
              borderRadius: "4px",
              background: "#f9f9f9",
            }}
          >
            <p>
              <strong>Vendor:</strong> {createdVendor.name}
            </p>
            {createdVendor.email && (
              <p>
                <strong>Email:</strong> {createdVendor.email}
              </p>
            )}
            <p>
              <strong>Upload Link:</strong>
              <br />
              <a href={createdVendor.uploadUrl} target="_blank" rel="noreferrer">
                {createdVendor.uploadUrl}
              </a>
            </p>
          </div>
        )}
      </div>

      <hr style={{ margin: "30px 0" }} />
      <a href="/dashboard">← Back to Dashboard</a>
    </div>
  );
}
