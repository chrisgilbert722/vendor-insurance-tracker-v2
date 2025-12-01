// pages/onboarding/insurance.js
import { useState } from "react";
import { useRouter } from "next/router";
import OnboardingLayout from "../../components/onboarding/OnboardingLayout";

const COVERAGES = [
  "General Liability",
  "Auto Liability",
  "Workers' Compensation",
  "Umbrella / Excess Liability",
  "Professional / E&O",
  "Pollution / Environmental",
  "Cyber Liability",
];

export default function OnboardingInsurance() {
  const router = useRouter();

  const [selected, setSelected] = useState([
    "General Liability",
    "Workers' Compensation",
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function toggleCoverage(name) {
    setSelected((prev) =>
      prev.includes(name)
        ? prev.filter((c) => c !== name)
        : [...prev, name]
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/onboarding/insurance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("supabase_token") || ""}`,
        },
        body: JSON.stringify({ coverages: selected }),
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Could not save coverages");

      router.push("/onboarding/rules");
    } catch (err) {
      console.error(err);
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <OnboardingLayout
      currentKey="insurance"
      title="Required Insurance Coverages"
      subtitle="Select the coverages your organization typically requires from vendors."
    >
      <form onSubmit={handleSubmit}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1.5fr) minmax(0,1.2fr)",
            gap: 20,
          }}
        >
          {/* ========== LEFT SIDE — COVERAGE BUTTONS ========== */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {COVERAGES.map((c) => {
              const active = selected.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCoverage(c)}
                  style={{
                    borderRadius: 999,
                    padding: "8px 14px",
                    border: active
                      ? "1px solid rgba(56,189,248,0.9)"
                      : "1px solid rgba(75,85,99,0.9)",
                    background: active
                      ? "radial-gradient(circle at top,#0f172a,#1e3a8a)"
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
                  {c}
                </button>
              );
            })}
          </div>

          {/* ========== RIGHT SIDE — INFO PANEL ========== */}
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
              Why this matters
            </h3>
            <p style={{ marginTop: 0 }}>
              These baseline coverage types help pre-configure your AI rules engine,
              default requirements and compliance scoring. You can refine the limits,
              endorsements and exceptions per vendor after onboarding.
            </p>
          </div>
        </div>

        {/* ========== ERROR BOX ========== */}
        {error && (
          <div
            style={{
              marginTop: 16,
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

        {/* ========== SUBMIT BUTTON ========== */}
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
            width: "fit-content",
          }}
        >
          {loading ? "Saving..." : "Save & Continue →"}
        </button>
      </form>
    </OnboardingLayout>
  );
}
