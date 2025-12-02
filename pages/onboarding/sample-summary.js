// pages/onboarding/sample-summary.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import OnboardingLayout from "../../components/onboarding/OnboardingLayout";

export default function SampleCOISummary() {
  const router = useRouter();

  const [ai, setAi] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* ==========================================================
     LOAD AI SAMPLE CALIBRATION FROM LOCAL STORAGE
  ========================================================== */
  useEffect(() => {
    try {
      const raw = localStorage.getItem("onboarding_ai_sample");
      if (!raw) {
        setError("No AI sample calibration found.");
        return;
      }
      setAi(JSON.parse(raw));
    } catch (err) {
      setError("Failed to load AI sample calibration.");
    }
  }, []);

  async function handleConfirm() {
    if (!ai) return;

    try {
      setLoading(true);

      const res = await fetch("/api/onboarding/sample-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiSample: ai }),
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed to save.");

      router.push("/onboarding/vendors");
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (!ai) {
    return (
      <OnboardingLayout
        currentKey="sample-coi"
        title="Sample COI Summary"
        subtitle="Loading AI analysis…"
      >
        <div style={{ color: "#9ca3af", fontSize: 14 }}>Loading…</div>
      </OnboardingLayout>
    );
  }

  const {
    brokerStyle,
    policyTypes,
    limits,
    endorsements,
    recommendedRules,
    observations,
  } = ai;

  return (
    <OnboardingLayout
      currentKey="sample-coi"
      title="COI Analysis Summary"
      subtitle="Here is what the AI detected from your sample certificate."
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1.7fr) minmax(0,1fr)",
          gap: 24,
        }}
      >
        {/* LEFT SIDE — AI RESULTS */}
        <div>
          {/* Broker Style */}
          <Block title="Broker Formatting Style">
            <p style={p}>{brokerStyle || "Unknown"}</p>
          </Block>

          {/* Policy Types */}
          <Block title="Detected Policy Types">
            <ul style={ul}>
              {policyTypes?.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </Block>

          {/* Limits */}
          <Block title="Limits Extracted">
            <div style={{ fontSize: 13 }}>
              {Object.entries(limits || {}).map(([cov, vals]) => (
                <div key={cov} style={{ marginBottom: 8 }}>
                  <strong style={{ color: "#e5e7eb" }}>{cov}</strong>
                  <pre
                    style={{
                      background: "rgba(2,6,23,0.6)",
                      padding: 8,
                      borderRadius: 8,
                      marginTop: 4,
                      fontSize: 12,
                    }}
                  >
                    {JSON.stringify(vals, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </Block>

          {/* Endorsements */}
          <Block title="Endorsements Detected">
            <ul style={ul}>
              {endorsements?.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </Block>

          {/* Recommended Rules */}
          <Block title="AI Recommended Defaults">
            <pre
              style={{
                background: "rgba(2,6,23,0.6)",
                padding: 10,
                borderRadius: 10,
                fontSize: 12,
              }}
            >
              {JSON.stringify(recommendedRules, null, 2)}
            </pre>
          </Block>

          {/* Observations */}
          <Block title="Additional Observations">
            <p style={p}>{observations || "None"}</p>
          </Block>

          {/* Confirm Button */}
          <button
            onClick={handleConfirm}
            disabled={loading}
            style={{
              marginTop: 22,
              padding: "12px 28px",
              borderRadius: 999,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
              border: "1px solid rgba(56,189,248,0.9)",
              background:
                "linear-gradient(90deg,#38bdf8,#0ea5e9,#0f172a)",
              color: "#e5f2ff",
              fontSize: 15,
              fontWeight: 600,
              boxShadow:
                "0 0 22px rgba(56,189,248,0.75),0 0 40px rgba(88,28,135,0.4)",
            }}
          >
            {loading ? "Saving…" : "Confirm & Continue →"}
          </button>

          {error && (
            <div
              style={{
                marginTop: 12,
                padding: 12,
                borderRadius: 10,
                background: "rgba(127,29,29,0.8)",
                border: "1px solid rgba(248,113,113,0.8)",
                color: "#fecaca",
              }}
            >
              {error}
            </div>
          )}
        </div>

        {/* RIGHT SIDE — INFO */}
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
          <h3 style={{ marginTop: 0, color: "#e5e7eb" }}>What this means</h3>
          <p style={p}>
            The platform now understands how your brokers format certificates,
            including limits, layout quirks, wording patterns, and endorsements.
          </p>
          <p style={p}>
            These patterns will improve future:
          </p>
          <ul style={ul}>
            <li>AI extraction accuracy</li>
            <li>Auto-rule matching</li>
            <li>Exception handling</li>
            <li>Renewal detection</li>
          </ul>
        </div>
      </div>
    </OnboardingLayout>
  );
}

/* ---------- Reusable block styles ---------- */
function Block({ title, children }) {
  return (
    <div
      style={{
        marginBottom: 18,
        padding: 16,
        borderRadius: 16,
        border: "1px solid rgba(148,163,184,0.45)",
        background: "rgba(15,23,42,0.6)",
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
        {title}
      </h3>
      {children}
    </div>
  );
}

const p = { fontSize: 13, color: "#9ca3af" };
const ul = { margin: 0, paddingLeft: 18, fontSize: 13, color: "#9ca3af" };
