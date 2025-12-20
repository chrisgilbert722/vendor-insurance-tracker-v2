// components/onboarding/VendorsMapStep.js
// Wizard Step 3 — Column Mapping (Human Gate)

import { useEffect, useState } from "react";

export default function VendorsMapStep({ wizardState }) {
  const csv = wizardState?.vendorsCsv;
  const headers = csv?.headers || [];

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

  const [mapping, setMapping] = useState({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Auto-suggest basic matches
  useEffect(() => {
    const auto = {};
    headers.forEach((h) => {
      const lower = h.toLowerCase();
      if (lower.includes("name")) auto.vendorName = h;
      if (lower.includes("mail")) auto.email = h;
      if (lower.includes("phone")) auto.phone = h;
      if (lower.includes("carrier")) auto.carrier = h;
      if (lower.includes("exp")) auto.expiration = h;
      if (lower.includes("policy")) auto.policyNumber = h;
      if (lower.includes("type")) auto.coverageType = h;
      if (lower.includes("city")) auto.city = h;
      if (lower.includes("state")) auto.state = h;
      if (lower.includes("zip")) auto.zip = h;
      if (lower.includes("category")) auto.category = h;
    });
    setMapping((prev) => ({ ...prev, ...auto }));
  }, [headers]);

  function updateField(key, val) {
    setMapping((prev) => ({ ...prev, [key]: val }));
  }

  function validate() {
    if (!mapping.vendorName) return "Vendor Name is required.";
    if (!mapping.email) return "Vendor Email is required.";
    return "";
  }

  async function saveMapping() {
    const err = validate();
    setError(err);
    if (err) return;

    setSaving(true);
    try {
      const res = await fetch("/api/onboarding/save-mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mapping }),
      });

      const json = await res.json();
      if (!json.ok) {
        throw new Error(json.error || "Save failed");
      }

      // 🔥 THAT’S IT — backend advances onboarding
      // Status poller will auto-advance UI
    } catch (e) {
      setError(e.message || "Failed to save mapping");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Step 3 — Map CSV Columns</h2>

      <div style={{ display: "grid", gap: 14 }}>
        {TARGET_FIELDS.map((f) => (
          <div key={f.key}>
            <label>{f.label}</label>
            <select
              value={mapping[f.key] || ""}
              onChange={(e) => updateField(f.key, e.target.value)}
            >
              <option value="">— Select Column —</option>
              {headers.map((h, i) => (
                <option key={i} value={h}>{h}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {error && <div style={{ color: "salmon", marginTop: 12 }}>{error}</div>}

      <button
        onClick={saveMapping}
        disabled={saving}
        style={{ marginTop: 20 }}
      >
        {saving ? "Saving…" : "✔ Save Mapping"}
      </button>

      <p style={{ fontSize: 12, opacity: 0.7, marginTop: 10 }}>
        Once saved, onboarding will resume automatically.
      </p>
    </div>
  );
}
