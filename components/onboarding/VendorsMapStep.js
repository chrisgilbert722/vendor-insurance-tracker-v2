// components/onboarding/VendorsMapStep.js
// STEP 3 — Map CSV Columns (Cinematic, Neon Focus)

import { useState } from "react";

const TARGET_FIELDS = [
  { key: "vendorName", label: "Vendor Name", required: true },
  { key: "email", label: "Vendor Email", required: true },
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

export default function VendorsMapStep() {
  const [mapping, setMapping] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update(key, val) {
    setMapping((m) => ({ ...m, [key]: val }));
  }

  function validate() {
    if (!mapping.vendorName) return "Vendor Name is required.";
    if (!mapping.email) return "Vendor Email is required.";
    return "";
  }

  async function save() {
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
      if (!json.ok) throw new Error(json.error || "Save failed");
    } catch (e) {
      setError(e.message || "Unable to save mapping.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        padding: 28,
        borderRadius: 22,
        background:
          "linear-gradient(180deg, rgba(15,23,42,0.95), rgba(2,6,23,0.98))",
        border: "1px solid rgba(56,189,248,0.35)",
        boxShadow:
          "0 0 0 1px rgba(255,255,255,0.03), 0 30px 80px rgba(0,0,0,0.65)",
      }}
    >
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#38bdf8",
            marginBottom: 6,
          }}
        >
          Step 3 · Required
        </div>

        <h2
          style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 600,
            background:
              "linear-gradient(90deg,#e5e7eb,#38bdf8,#a855f7)",
            WebkitBackgroundClip: "text",
            color: "transparent",
          }}
        >
          Map CSV Columns
        </h2>

        <p style={{ marginTop: 6, color: "#9ca3af", fontSize: 14 }}>
          Define how your vendor data is structured so AI can analyze and enforce compliance.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 18,
        }}
      >
        {TARGET_FIELDS.map((f) => (
          <div key={f.key}>
            <label
              style={{
                display: "block",
                fontSize: 12,
                color: f.required ? "#e5e7eb" : "#9ca3af",
                marginBottom: 6,
              }}
            >
              {f.label} {f.required && "•"}
            </label>

            <select
              value={mapping[f.key] || ""}
              onChange={(e) => update(f.key, e.target.value)}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 14,
                background: "rgba(2,6,23,0.9)",
                border: "1px solid rgba(148,163,184,0.35)",
                color: "#e5e7eb",
                outline: "none",
                transition: "all 200ms ease",
              }}
              onFocus={(e) => {
                e.target.style.boxShadow =
                  "0 0 0 2px rgba(56,189,248,0.6), 0 0 20px rgba(56,189,248,0.45)";
                e.target.style.borderColor = "#38bdf8";
              }}
              onBlur={(e) => {
                e.target.style.boxShadow = "none";
                e.target.style.borderColor = "rgba(148,163,184,0.35)";
              }}
            >
              <option value="">Select column</option>
            </select>
          </div>
        ))}
      </div>

      {error && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            borderRadius: 12,
            background: "rgba(127,29,29,0.25)",
            border: "1px solid rgba(248,113,113,0.7)",
            color: "#fecaca",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      <div style={{ marginTop: 28, display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={save}
          disabled={saving}
          style={{
            padding: "12px 28px",
            borderRadius: 999,
            border: "1px solid rgba(56,189,248,0.9)",
            background:
              "linear-gradient(90deg,#38bdf8,#6366f1,#a855f7)",
            color: "#020617",
            fontWeight: 800,
            fontSize: 14,
            cursor: saving ? "not-allowed" : "pointer",
            boxShadow:
              "0 0 22px rgba(56,189,248,0.9), 0 0 50px rgba(168,85,247,0.55)",
          }}
        >
          {saving ? "Saving…" : "Save Mapping"}
        </button>
      </div>
    </div>
  );
}
