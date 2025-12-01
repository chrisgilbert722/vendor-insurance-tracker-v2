// pages/onboarding/company.js
import { useState } from "react";
import { useRouter } from "next/router";
import OnboardingLayout from "../../components/onboarding/OnboardingLayout";

export default function OnboardingCompany() {
  const router = useRouter();

  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [hqLocation, setHqLocation] = useState("");
  const [vendorCount, setVendorCount] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!companyName.trim()) {
      setError("Company name is required.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/onboarding/company", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Send session token if required later:
          Authorization: `Bearer ${localStorage.getItem("supabase_token") || ""}`,
        },
        body: JSON.stringify({
          companyName,
          industry,
          hqLocation,
          vendorCount,
        }),
      });

      const json = await res.json();
      if (!json.ok) {
        throw new Error(json.error || "Could not save company settings.");
      }

      // Move to next step
      router.push("/onboarding/insurance");
    } catch (err) {
      console.error(err);
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <OnboardingLayout
      currentKey="company"
      title="Company Profile"
      subtitle="These details calibrate your dashboard metrics, alerts thresholds, and policy templates."
    >
      <form onSubmit={handleSubmit}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1.6fr) minmax(0,1.1fr)",
            gap: 20,
          }}
        >
          {/* ================= FORM LEFT SIDE ================= */}
          <div>
            {/* Company Name */}
            <label style={labelStyle}>Company Name</label>
            <input
              style={inputStyle}
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Acme Construction Group"
            />

            {/* Industry */}
            <label style={labelStyle}>Industry</label>
            <input
              style={inputStyle}
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="Construction, Property Management, Manufacturing, etc."
            />

            {/* Headquarters */}
            <label style={labelStyle}>Headquarters Location</label>
            <input
              style={inputStyle}
              value={hqLocation}
              onChange={(e) => setHqLocation(e.target.value)}
              placeholder="Dallas, TX"
            />

            {/* Approx vendor count */}
            <label style={labelStyle}>Approx. Active Vendors</label>
            <input
              style={inputStyle}
              value={vendorCount}
              onChange={(e) => setVendorCount(e.target.value)}
              placeholder="e.g. 75"
            />

            {/* Error Box */}
            {error && (
              <div
                style={{
                  marginTop: 14,
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: "rgba(127,29,29,0.85)",
                  border: "1px solid rgba(248,113,113,0.8)",
                  color: "#fecaca",
                  fontSize: 13,
                }}
              >
                {error}
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 18,
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
              {loading ? "Saving..." : "Save & Continue →"}
            </button>
          </div>

          {/* ================= RIGHT SIDE INFO PANEL ================= */}
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
              height: "fit-content",
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
              Why this matters
            </h3>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>Your org name appears on all PDFs, exports, and AI summaries.</li>
              <li>
                Industry + HQ help us determine recommended coverage bundles &
                required endorsements.
              </li>
              <li>
                Vendor count helps size notifications, queue batching, and
                retention defaults.
              </li>
            </ul>
          </div>
        </div>
      </form>
    </OnboardingLayout>
  );
}

/* ===== Styles ===== */
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
