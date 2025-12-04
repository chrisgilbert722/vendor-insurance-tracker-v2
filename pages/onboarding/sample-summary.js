// pages/onboarding/sample-summary.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import OnboardingLayout from "../../components/onboarding/OnboardingLayout";

const GP = {
  bg: "#020617",
  panel: "rgba(15,23,42,0.98)",
  border: "rgba(51,65,85,0.7)",
  neonBlue: "#38bdf8",
  neonPurple: "#a855f7",
  neonGold: "#facc15",
  neonGreen: "#22c55e",
  neonRed: "#fb7185",
  text: "#e5e7eb",
  textSoft: "#9ca3af",
};

export default function SampleSummaryPage() {
  const router = useRouter();

  const [aiSample, setAiSample] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  /* ==========================================================
     LOAD AI SAMPLE FROM LOCAL STORAGE
  ========================================================== */
  useEffect(() => {
    try {
      const raw = localStorage.getItem("onboarding_ai_sample");
      if (raw) {
        setAiSample(JSON.parse(raw));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ==========================================================
     SAVE + CONTINUE → Rules Calibration
  ========================================================== */
  async function handleContinue() {
    try {
      setSaving(true);
      setError("");

      const orgId = localStorage.getItem("active_org_id") || null;

      const res = await fetch("/api/onboarding/ai/calibrate-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aiSample,
          orgId,
        }),
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error);

      // Continue to vendor onboarding
      router.push("/onboarding/vendors");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <OnboardingLayout
        currentKey="sample-summary"
        title="Analyzing COI…"
        subtitle="Loading calibration results."
      >
        <div
          style={{
            padding: 20,
            fontSize: 16,
            color: GP.textSoft,
          }}
        >
          Loading AI summary…
        </div>
      </OnboardingLayout>
    );
  }

  if (!aiSample) {
    return (
      <OnboardingLayout
        currentKey="sample-summary"
        title="No AI Summary Found"
        subtitle="Please upload a sample COI first."
      >
        <div style={{ color: GP.neonRed }}>
          No AI sample detected. Return to the previous step.
        </div>
      </OnboardingLayout>
    );
  }

  const {
    policyTypes = [],
    limits = {},
    endorsements = [],
    recommendedRules = {},
    brokerStyle,
    observations = [],
  } = aiSample;

  return (
    <OnboardingLayout
      currentKey="sample-summary"
      title="AI Sample COI Summary"
      subtitle="Here is what the AI learned from the sample certificate you provided."
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1.7fr) minmax(0,1fr)",
          gap: 22,
        }}
      >
        {/* LEFT SIDE — MAIN AI SUMMARY */}
        <div>
          {/* Broker Style */}
          <div style={panel}>
            <h3 style={panelTitle}>Broker Style Profile</h3>
            <p style={panelText}>{brokerStyle || "No broker style detected."}</p>
          </div>

          {/* Policy Types */}
          <div style={panel}>
            <h3 style={panelTitle}>Detected Policy Types</h3>
            <ul style={ul}>
              {policyTypes.length
                ? policyTypes.map((p, i) => (
                    <li key={i} style={li}>
                      ✓ {p}
                    </li>
                  ))
                : "None detected."}
            </ul>
          </div>

          {/* Limits */}
          <div style={panel}>
            <h3 style={panelTitle}>Detected Coverage Limits</h3>
            <ul style={ul}>
              {Object.keys(limits).length
                ? Object.entries(limits).map(([key, value]) => (
                    <li key={key} style={li}>
                      <strong style={{ color: GP.neonBlue }}>{key}</strong>:{" "}
                      {value}
                    </li>
                  ))
                : "No limits detected."}
            </ul>
          </div>

          {/* Endorsements */}
          <div style={panel}>
            <h3 style={panelTitle}>Detected Endorsements</h3>
            <ul style={ul}>
              {endorsements.length
                ? endorsements.map((e, i) => (
                    <li key={i} style={li}>
                      ● {e}
                    </li>
                  ))
                : "No endorsements detected."}
            </ul>
          </div>
        </div>

        {/* RIGHT SIDE — RULES + OBSERVATIONS */}
        <div>
          {/* Recommended Rules */}
          <div style={panel}>
            <h3 style={panelTitle}>AI Recommended Rule Settings</h3>
            <ul style={ul}>
              <li style={li}>
                Expiration Warning:{" "}
                <strong>{recommendedRules.expirationWarningDays || 30} days</strong>
              </li>
              <li style={li}>
                Missing Coverage Severity:{" "}
                <strong>{recommendedRules.defaultMissingSeverity || "high"}</strong>
              </li>
            </ul>
          </div>

          {/* Observations */}
          <div style={panel}>
            <h3 style={panelTitle}>Document Observations</h3>
            <ul style={ul}>
              {observations.length
                ? observations.map((o, i) => (
                    <li key={i} style={li}>
                      {o}
                    </li>
                  ))
                : "No observations found."}
            </ul>
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                marginTop: 10,
                padding: "10px 12px",
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

          {/* Continue */}
          <button
            onClick={handleContinue}
            disabled={saving}
            style={{
              marginTop: 20,
              width: "100%",
              padding: "12px 18px",
              borderRadius: 999,
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.6 : 1,
              background:
                "linear-gradient(90deg,#38bdf8,#a855f7,#22c55e,#facc15)",
              border: "1px solid rgba(148,163,184,0.55)",
              color: "#e5f2ff",
              fontSize: 15,
              fontWeight: 600,
              boxShadow:
                "0 0 22px rgba(56,189,248,0.75),0 0 40px rgba(88,28,135,0.4)",
            }}
          >
            {saving ? "Saving…" : "Looks Good — Continue →"}
          </button>
        </div>
      </div>
    </OnboardingLayout>
  );
}

/* ============================
   STYLE OBJECTS
============================ */
const panel = {
  borderRadius: 18,
  padding: 18,
  border: "1px solid rgba(148,163,184,0.35)",
  background:
    "radial-gradient(circle at top,rgba(15,23,42,0.98),rgba(15,23,42,0.96))",
  marginBottom: 18,
};

const panelTitle = {
  marginTop: 0,
  marginBottom: 10,
  fontSize: 15,
  color: GP.text,
};

const panelText = {
  fontSize: 13,
  color: GP.textSoft,
  lineHeight: 1.5,
};

const ul = {
  margin: 0,
  paddingLeft: 18,
  fontSize: 13,
  color: GP.textSoft,
  lineHeight: 1.6,
};

const li = {
  marginBottom: 4,
};
