// components/onboarding/VendorsMapStep.js
// Wizard Step 3 — Column Mapping

import { useEffect, useState } from "react";

export default function VendorsMapStep({ wizardState, setWizardState }) {
  const csv = wizardState?.vendorsCsv;
  const headers = csv?.headers || [];

  // These are the fields we support mapping to:
  const TARGET_FIELDS = [
    { key: "vendorName", label: "Vendor Name (required)" },
    { key: "email", label: "Vendor Email (required)" },
    { key: "phone", label: "Phone" },
    { key: "category", label: "Category" },
    { key: "carrier", label: "Carrier" },
    { key: "coverageType", label: "Coverage Type" },
    { key: "policyNumber", label: "Policy Number" },
    { key: "expiration", label: "Policy Expiration" },
    { key: "address", label: "Address" },
    { key: "city", label: "City" },
    { key: "state", label: "State" },
    { key: "zip", label: "Zip Code" },
  ];

  // Local mapping state
  const [mapping, setMapping] = useState({});
  const [error, setError] = useState("");

  // Auto-suggest simple pattern matches (AI stubs)
  useEffect(() => {
    const auto = {};
    headers.forEach((h) => {
      const lower = h.toLowerCase();

      if (lower.includes("name")) auto.vendorName = h;
      if (lower.includes("mail") || lower.includes("email")) auto.email = h;
      if (lower.includes("phone")) auto.phone = h;
      if (lower.includes("carrier")) auto.carrier = h;
      if (lower.includes("exp") || lower.includes("end")) auto.expiration = h;
      if (lower.includes("policy")) auto.policyNumber = h;
      if (lower.includes("type")) auto.coverageType = h;
      if (lower.includes("city")) auto.city = h;
      if (lower.includes("state")) auto.state = h;
      if (lower.includes("zip")) auto.zip = h;
      if (lower.includes("category") || lower.includes("class"))
        auto.category = h;
    });

    setMapping((prev) => ({ ...prev, ...auto }));
  }, [headers]);

  function updateField(targetKey, selectedHeader) {
    setMapping((prev) => ({
      ...prev,
      [targetKey]: selectedHeader,
    }));
  }

  function validate() {
    if (!mapping.vendorName) {
      return "Vendor Name is required.";
    }
    if (!mapping.email) {
      return "Vendor Email is required.";
    }
    return "";
  }

  function saveMappingToWizardState() {
    const err = validate();
    setError(err);
    if (err) return;

    setWizardState((prev) => ({
      ...prev,
      vendorsCsv: {
        ...(prev.vendorsCsv || {}),
        mapping,
      },
    }));
  }

  return (
    <div
      style={{
        padding: 16,
        borderRadius: 18,
        background: "rgba(15,23,42,0.96)",
        border: "1px solid rgba(51,65,85,0.9)",
      }}
    >
      <h2
        style={{
          marginTop: 0,
          fontSize: 18,
          fontWeight: 600,
          color: "#e5e7eb",
        }}
      >
        Step 3 — Map CSV Columns
      </h2>

      <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 16 }}>
        Match each of your CSV columns to a standardized vendor field.  
        The wizard will use this mapping to create vendor records and analyze risk.
      </p>

      {/* Mapping Grid */}
      <div style={{ display: "grid", gap: 14 }}>
        {TARGET_FIELDS.map((field) => (
          <div key={field.key}>
            <label
              style={{
                fontSize: 12,
                color: "#9ca3af",
                marginBottom: 4,
                display: "block",
              }}
            >
              {field.label}
            </label>

            <select
              value={mapping[field.key] || ""}
              onChange={(e) => updateField(field.key, e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 999,
                border: "1px solid rgba(71,85,105,0.9)",
                background: "rgba(2,6,23,0.6)",
                color: "#e5e7eb",
                fontSize: 13,
              }}
            >
              <option value="">— Select Column —</option>
              {headers.map((h, idx) => (
                <option key={idx} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

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

      {/* Save Button */}
      <button
        type="button"
        onClick={saveMappingToWizardState}
        style={{
          marginTop: 20,
          padding: "10px 22px",
          borderRadius: 999,
          cursor: "pointer",
          border: "1px solid rgba(56,189,248,0.9)",
          background:
            "linear-gradient(90deg,rgba(56,189,248,0.9),rgba(88,28,135,0.85))",
          color: "#e5f2ff",
          fontSize: 14,
          fontWeight: 600,
          boxShadow:
            "0 0 22px rgba(56,189,248,0.75),0 0 40px rgba(88,28,135,0.4)",
        }}
      >
        ✔ Save Mapping
      </button>

      <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 12 }}>
        After saving mapping, use the wizard’s “Next Step →” button to proceed.
      </p>
    </div>
  );
}
