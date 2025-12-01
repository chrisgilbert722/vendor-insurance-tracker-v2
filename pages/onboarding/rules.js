// pages/onboarding/rules.js
import { useState } from "react";
import { useRouter } from "next/router";
import OnboardingLayout from "../../components/onboarding/OnboardingLayout";

export default function OnboardingRules() {
  const router = useRouter();

  const [strictness, setStrictness] = useState("balanced");
  const [expirationWindow, setExpirationWindow] = useState("30");
  const [missingSeverity, setMissingSeverity] = useState("high");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/onboarding/rules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${
            localStorage.getItem("supabase_token") || ""
          }`,
        },
        body: JSON.stringify({
          strictness,
          expirationWindow: Number(expirationWindow),
          missingSeverity,
        }),
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Could not save rule defaults.");

      router.push("/onboarding/team");
    } catch (err) {
      console.error(err);
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <OnboardingLayout
      currentKey="rules"
      title="AI Rules Engine Defaults"
      subtitle="These settings shape how strict or flexible your automated compliance logic is by default."
    >
      <form onSubmit={handleSubmit}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1.6fr) minmax(0,1.1fr)",
            gap: 20,
          }}
        >
          {/* ============ LEFT COLUMN — FORM CONTROLS ============ */}
          <div>
            {/* Strictness Selector */}
            <label style={labelStyle}>Default Rule Strictness</label>
            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              {[
                { key: "lenient", label: "Lenient" },
                { key: "balanced", label: "Balanced" },
                { key: "strict", label: "Strict" },
              ].map((opt) => {
                const active = strictness === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setStrictness(opt.key)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 999,
                      border: active
                        ? "1px solid rgba(56,189,248,0.9)"
                        : "1px solid rgba(75,85,99,0.9)",
                      background: active
                        ? "radial-gradient(circle at top,#0f172a,#1d4ed8)"
                        : "rgba(15,23,42,0.96)",
                      color: active ? "#e5f2ff" : "#e5e7eb",
                      fontSize: 13,
                      cursor: "pointer",
                      boxShadow: active
                        ? "0 0 18px rgba(56,189,248,0.75)"
                        : "none",
                      transition: "0.2s ease",
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Expiration Warning Window */}
            <label style={labelStyle}>Expiration Warning Window (days)</label>
            <input
              style={inputStyle}
              type="number"
              min="1"
              value={expirationWindow}
              onChange={(e) => setExpirationWindow(e.target.value)}
              placeholder="e.g. 30"
            />

            {/* Default Severity */}
            <label style={labelStyle}>Default Severity for Missing Coverage</label>
            <select
              style={inputStyle}
              value={missingSeverity}
              onChange={(e) => setMissingSeverity(e.target.value)}
            >
              <option value="high">High (block work)</option>
              <option value="medium">Medium (require manual review)</option>
              <option value="low">Low (allow but flag)</option>
            </select>

            {/* Error */}
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
              {loading ? "Saving..." : "Save & Continue →"}
            </button>
          </div>

          {/* ============ RIGHT COLUMN — INFO PANEL ============ */}
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
                marginBottom: 10,
                fontSize: 15,
                color: "#e5e7eb",
              }}
            >
              Why this matters
            </h3>
            <p style={{ marginTop: 0 }}>
              These settings form the baseline rules applied to all vendor COIs.
              Your team can override per vendor, but this gives your organization a
              consistent starting point for compliance automation.
            </p>
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
