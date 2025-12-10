// components/onboarding/CompanyProfileStep.js
// STEP 8 — Company Profile (Org Info, Branding, Contact Details)

import { useState, useEffect } from "react";

export default function CompanyProfileStep({ orgId, wizardState, setWizardState }) {
  const saved = wizardState?.companyProfile || {};

  const [companyName, setCompanyName] = useState(saved.companyName || "");
  const [address, setAddress] = useState(saved.address || "");
  const [phone, setPhone] = useState(saved.phone || "");
  const [website, setWebsite] = useState(saved.website || "");
  const [primaryContactName, setPrimaryContactName] = useState(saved.primaryContactName || "");
  const [primaryContactEmail, setPrimaryContactEmail] = useState(saved.primaryContactEmail || "");
  const [timezone, setTimezone] = useState(saved.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [brandColor, setBrandColor] = useState(saved.brandColor || "#38bdf8");

  const [error, setError] = useState("");
  const [savedState, setSavedState] = useState(false);

  function saveProfile() {
    if (!companyName.trim()) {
      setError("Company name is required.");
      return;
    }
    if (!primaryContactEmail.includes("@")) {
      setError("Primary contact email is invalid.");
      return;
    }

    setError("");
    setSavedState(true);

    setWizardState((prev) => ({
      ...prev,
      companyProfile: {
        companyName,
        address,
        phone,
        website,
        primaryContactName,
        primaryContactEmail,
        timezone,
        brandColor,
      },
    }));

    setTimeout(() => setSavedState(false), 1500);
  }

  return (
    <div
      style={{
        padding: 18,
        borderRadius: 18,
        background: "rgba(15,23,42,0.96)",
        border: "1px solid rgba(51,65,85,0.9)",
      }}
    >
      <h2 style={{ marginTop: 0, fontSize: 18, fontWeight: 600, color: "#e5e7eb" }}>
        Step 8 — Company Profile
      </h2>

      <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 16 }}>
        Provide basic company details used for emails, dashboards, PDFs, and branding.
      </p>

      {error && (
        <div
          style={{
            marginBottom: 14,
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

      <div style={{ display: "grid", gap: 14 }}>
        {/* Company Name */}
        <InputBlock
          label="Company Name (required)"
          value={companyName}
          onChange={setCompanyName}
        />

        {/* Primary Contact */}
        <InputBlock
          label="Primary Contact Name"
          value={primaryContactName}
          onChange={setPrimaryContactName}
        />

        <InputBlock
          label="Primary Contact Email (required)"
          value={primaryContactEmail}
          onChange={setPrimaryContactEmail}
          type="email"
        />

        {/* Address */}
        <InputBlock
          label="Address"
          value={address}
          onChange={setAddress}
        />

        {/* Phone */}
        <InputBlock
          label="Phone"
          value={phone}
          onChange={setPhone}
        />

        {/* Website */}
        <InputBlock
          label="Company Website"
          value={website}
          onChange={setWebsite}
        />

        {/* Timezone */}
        <div>
          <label style={labelStyle}>Timezone</label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            style={selectStyle}
          >
            {Intl.supportedValuesOf("timeZone").map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>

        {/* Brand Color */}
        <div>
          <label style={labelStyle}>Brand Color</label>
          <input
            type="color"
            value={brandColor}
            onChange={(e) => setBrandColor(e.target.value)}
            style={{
              width: 80,
              height: 36,
              borderRadius: 8,
              cursor: "pointer",
            }}
          />
        </div>
      </div>

      {/* Save Button */}
      <button
        type="button"
        onClick={saveProfile}
        style={{
          marginTop: 20,
          padding: "10px 20px",
          borderRadius: 999,
          border: "1px solid rgba(59,130,246,0.9)",
          background:
            "linear-gradient(90deg,#3b82f6,#2563eb,#1e3a8a)",
          color: "#e0f2fe",
          fontWeight: 600,
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        ✔ Save Company Profile
      </button>

      {savedState && (
        <div
          style={{
            marginTop: 12,
            padding: 10,
            borderRadius: 10,
            background: "rgba(22,163,74,0.2)",
            border: "1px solid rgba(34,197,94,0.9)",
            color: "#bbf7d0",
            fontSize: 13,
          }}
        >
          Company profile saved.
        </div>
      )}
    </div>
  );
}

/* ------------------- Reusable Input Block ------------------- */

function InputBlock({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
      />
    </div>
  );
}

/* ------------------- Shared Styles ------------------- */

const labelStyle = {
  display: "block",
  fontSize: 12,
  color: "#9ca3af",
  marginBottom: 4,
};

const inputStyle = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid rgba(71,85,105,0.9)",
  background: "rgba(2,6,23,0.6)",
  fontSize: 13,
  color: "#e5e7eb",
  outline: "none",
};

const selectStyle = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid rgba(71,85,105,0.9)",
  background: "rgba(2,6,23,0.6)",
  fontSize: 13,
  color: "#e5e7eb",
};
