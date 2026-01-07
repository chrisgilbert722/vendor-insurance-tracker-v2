// components/onboarding/VendorsMapStep.js
// STEP 3 — Map CSV Columns (Fallback + Confidence Review)

import { useEffect, useState } from "react";

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

export default function VendorsMapStep({ wizardState, setWizardState, onComplete }) {
  const csv = wizardState?.vendorsCsv || {};
  const headers = Array.isArray(csv.headers) ? csv.headers : [];
  const detectedMapping = csv.mapping || {};

  const [mapping, setMapping] = useState(detectedMapping);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Keep wizardState in sync
  useEffect(() => {
    setWizardState((prev) => ({
      ...prev,
      vendorsCsv: {
        ...(prev.vendorsCsv || {}),
        mapping,
      },
    }));
  }, [mapping, setWizardState]);

  function update(key, val) {
    setMapping((m) => ({
      ...m,
      [key]: {
        column: val,
        source: "user",
      },
    }));
  }

  function validate() {
    if (!mapping.vendorName?.column) return "Vendor Name is required.";
    if (!mapping.email?.column) return "Vendor Email is required.";
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

      onComplete?.();
    } catch (e) {
      setError(e.message || "Unable to save mapping.");
    } finally {
      setSaving(false);
    }
  }

  function renderBadge(fieldKey) {
    const meta = detectedMapping[fieldKey];
    if (!meta || meta.source !== "ai" || typeof meta.confidence !== "number") {
      return null;
    }

    const pct = Math.round(meta.confidence * 100);

    if (pct >= 95) {
      return (
        <span style={{ marginLeft: 8, color: "#22c55e", fontSize: 11 }}>
          ✓ {pct}% confident
        </span>
      );
    }

    if (pct >= 85) {
      return (
        <span style={{ marginLeft: 8, color: "#facc15", fontSize: 11 }}>
          ⚠ Review suggested ({pct}%)
        </span>
      );
    }

    return null;
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
          Review Mapping (Optional)
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
          Confirm Vendor Data Mapping
        </h2>

        <p style={{ marginTop: 6, color: "#9ca3af", fontSize: 14 }}>
          AI mapped your file automatically. Review only if something looks off.
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
              {renderBadge(f.key)}
            </label>

            <select
              value={mapping[f.key]?.column || ""}
              onChange={(e) => update(f.key, e.target.value)}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 14,
                background: "rgba(2,6,23,0.9)",
                border: "1px solid rgba(148,163,184,0.35)",
                color: "#e5e7eb",
              }}
            >
              <option value="">Select column</option>
              {headers.map((h) => (
                <option key={h} value={h}>
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
          }}
        >
          {saving ? "Saving…" : "Confirm & Continue →"}
        </button>
      </div>
    </div>
  );
}
