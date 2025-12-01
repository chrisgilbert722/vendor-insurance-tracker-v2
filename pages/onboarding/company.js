// pages/onboarding/company.js
import { useState } from "react";
import OnboardingLayout from "../../components/onboarding/OnboardingLayout";

export default function OnboardingCompany() {
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [hqLocation, setHqLocation] = useState("");
  const [vendorCount, setVendorCount] = useState("");

  return (
    <OnboardingLayout
      currentKey="company"
      title="Company Profile"
      subtitle="These details calibrate your dashboard metrics, alerts thresholds, and policy templates."
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1.6fr) minmax(0,1.1fr)",
          gap: 20,
        }}
      >
        {/* Form */}
        <div>
          <label style={labelStyle}>Company Name</label>
          <input
            style={inputStyle}
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Acme Construction Group"
          />

          <label style={labelStyle}>Industry</label>
          <input
            style={inputStyle}
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            placeholder="Construction, Property Management, Manufacturing, etc."
          />

          <label style={labelStyle}>Headquarters Location</label>
          <input
            style={inputStyle}
            value={hqLocation}
            onChange={(e) => setHqLocation(e.target.value)}
            placeholder="Dallas, TX • USA"
          />

          <label style={labelStyle}>Approx. Active Vendors</label>
          <input
            style={inputStyle}
            value={vendorCount}
            onChange={(e) => setVendorCount(e.target.value)}
            placeholder="e.g. 75"
          />
        </div>

        {/* Side Info */}
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
            Why this matters
          </h3>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li>Your company name appears on all PDFs, exports, and AI summaries.</li>
            <li>
              Industry and HQ help us nudge you toward the correct coverage bundles
              and limits.
            </li>
            <li>
              Vendor count helps us size notifications, queue batching, and storage
              retention defaults.
            </li>
          </ul>
        </div>
      </div>
    </OnboardingLayout>
  );
}

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
