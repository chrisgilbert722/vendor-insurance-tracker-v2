// pages/onboarding/vendors.js
import { useState } from "react";
import { useRouter } from "next/router";
import OnboardingLayout from "../../components/onboarding/OnboardingLayout";

export default function OnboardingVendors() {
  const router = useRouter();

  const [vendorName, setVendorName] = useState("");
  const [vendorEmail, setVendorEmail] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!vendorName.trim()) {
      setError("Vendor name is required.");
      setLoading(false);
      return;
    }

    if (!vendorEmail.trim() || !vendorEmail.includes("@")) {
      setError("A valid vendor contact email is required.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/onboarding/vendors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${
            localStorage.getItem("supabase_token") || ""
          }`,
        },
        body: JSON.stringify({
          vendorName,
          vendorEmail,
        }),
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Could not create vendor.");

      router.push("/onboarding/complete");
    } catch (err) {
      console.error(err);
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <OnboardingLayout
      currentKey="vendors"
      title="Invite Your First Vendor"
      subtitle="Send a direct onboarding invite so the vendor can upload their COI and complete compliance setup."
    >
      <form onSubmit={handleSubmit}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1.5fr) minmax(0,1.2fr)",
            gap: 20,
          }}
        >
          {/* LEFT SIDE — FORM */}
          <div>
            {/* Vendor Name */}
            <label style={labelStyle}>Vendor Company Name</label>
            <input
              style={inputStyle}
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              placeholder="Acme Roofing LLC"
            />

            {/* Vendor Email */}
            <label style={labelStyle}>Vendor Contact Email</label>
            <input
              style={inputStyle}
              value={vendorEmail}
              onChange={(e) => setVendorEmail(e.target.value)}
              placeholder="owner@acmeroofing.com"
            />

            {/* Error Box */}
            {error && (
              <div
                style={{
                  marginTop: 14,
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: "rgba(127,29,29,0.9)",
                  border: "1px solid rgba(248,113,113,0.8)",
                  color: "#fecaca",
                  fontSize: 13,
                }}
              >
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 20,
                padding: "10px 22px",
                borderRadius: 999,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
                border: "1px solid rgba(56,189,248,0.9)",
                background:
                  "linear-gradient(90deg,rgba(56,189,248,0.9),rgba(88,28,135,0.85))",
                color: "#e5f2ff",
                fontSize: 15,
                fontWeight: 600,
                boxShadow:
                  "0 0 22px rgba(56,189,248,0.75),0 0 40px rgba(88,28,135,0.4)",
              }}
            >
              {loading ? "Creating..." : "Create Vendor & Finish →"}
            </button>
          </div>

          {/* RIGHT SIDE — CONTEXT PANEL */}
          <div
            style={{
              borderRadius: 18,
              padding: 16,
              border: "1px solid rgba(148,163,184,0.55)",
              background:
                "radial-gradient(circle at top,rgba(15,23,42,0.98),rgba(15,23,42,0.96))",
              fontSize: 13,
              color: "#9ca3af",
              lineHeight: 1.6,
            }}
          >
            <h3
              style={{
                marginTop: 0,
                marginBottom: 8,
                fontSize: 15,
                color: "#e5e7eb",
              }}
            >
              What your vendor sees
            </h3>

            <p style={{ marginTop: 0 }}>
              They’ll receive a branded invite with your org details and a guided
              process to upload their Certificate of Insurance and enter policy data.
            </p>

            <p style={{ marginTop: 12 }}>
              Vendors do NOT need accounts — they authenticate via magic-link and
              upload files directly into your compliance system.
            </p>

            <p style={{ marginTop: 12, fontSize: 12, color: "#a5b4fc" }}>
              You can invite vendors in bulk from the Vendors dashboard later.
            </p>
          </div>
        </div>
      </form>
    </OnboardingLayout>
  );
}

/* ========== Styles ========== */
const labelStyle = {
  display: "block",
  fontSize: 11,
  color: "#9ca3af",
  marginBottom: 4,
  marginTop: 12,
};

const inputStyle = {
  width: "100%",
  borderRadius: 999,
  padding: "8px 12px",
  border: "1px solid rgba(51,65,85,0.9)",
  background: "rgba(15,23,42,0.96)",
  color: "#e5e7eb",
  fontSize: 13,
  outline: "none",
};
