// pages/onboarding/vendors.js
import { useState } from "react";
import OnboardingLayout from "../../components/onboarding/OnboardingLayout";

export default function OnboardingVendors() {
  const [vendorName, setVendorName] = useState("");
  const [vendorEmail, setVendorEmail] = useState("");

  return (
    <OnboardingLayout
      currentKey="vendors"
      title="Invite Your First Vendor"
      subtitle="Send a direct link so they can upload their COI and enter insurance details into your portal."
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1.5fr) minmax(0,1.2fr)",
          gap: 20,
        }}
      >
        <div>
          <label style={labelStyle}>Vendor Name</label>
          <input
            style={inputStyle}
            value={vendorName}
            onChange={(e) => setVendorName(e.target.value)}
            placeholder="Acme Roofing LLC"
          />

          <label style={labelStyle}>Vendor Contact Email</label>
          <input
            style={inputStyle}
            value={vendorEmail}
            onChange={(e) => setVendorEmail(e.target.value)}
            placeholder="owner@acmeroofing.com"
          />

          <div
            style={{
              marginTop: 10,
              fontSize: 12,
              color: "#9ca3af",
            }}
          >
            This is a preview of your ongoing workflow—your team can send vendor
            invitations in bulk later from the Vendors area.
          </div>
        </div>

        <div
          style={{
            borderRadius: 18,
            padding: 16,
            border: "1px solid rgba(148,163,184,0.55)",
            background:
              "radial-gradient(circle at top,rgba(15,23,42,0.98),rgba(15,23,42,0.96))",
            fontSize: 13,
            color: "#9ca3af",
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
            They’ll receive a clean, branded link with your logo, required
            coverages, and an upload workflow for their COI. No logins or portals
            for them to manage.
          </p>
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
