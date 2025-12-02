// pages/onboarding/sample-summary.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import OnboardingLayout from "../../components/onboarding/OnboardingLayout";

export default function SampleCOISummary() {
  const router = useRouter();

  const [ai, setAi] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  /* Load stored AI sample */
  useEffect(() => {
    try {
      const raw = localStorage.getItem("onboarding_ai_sample");
      if (!raw) return setError("Missing AI sample.");
      setAi(JSON.parse(raw));
    } catch (err) {
      setError("Failed to load AI calibration.");
    }
  }, []);

  /* ============================================
     CONFIRM → save summary → calibrate rules → next
  ============================================ */
  async function handleConfirm() {
    if (!ai) return;

    try {
      setLoading(true);
      setError("");

      /* 1) Save raw summary (optional endpoint) */
      const saveRes = await fetch("/api/onboarding/sample-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiSample: ai }),
      });
      const saveJson = await saveRes.json();
      if (!saveJson.ok) throw new Error(saveJson.error || "Failed saving summary.");

      /* Retrieve orgId (UserContext stores it) */
      const storedUser = JSON.parse(localStorage.getItem("supabase.auth.token") || "{}");
      const orgId =
        JSON.parse(localStorage.getItem("activeOrg"))?.id ||
        storedUser?.user?.user_metadata?.org_id ||
        null;

      if (!orgId) {
        console.warn("Missing orgId, skipping calibrate-rules.");
      }

      /* 2) AUTO-CALIBRATE RULE ENGINE */
      if (orgId) {
        const calRes = await fetch("/api/onboarding/ai/calibrate-rules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orgId,
            aiSample: ai,
          }),
        });

        const calJson = await calRes.json();
        if (!calJson.ok)
          throw new Error(calJson.error || "Failed rule calibration.");
      }

      /* 3) Continue to vendor onboarding */
      router.push("/onboarding/vendors");

    } catch (err) {
      console.error(err);
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (!ai) {
    return (
      <OnboardingLayout
        currentKey="sample-coi"
        title="Analyzing Sample COI…"
        subtitle="Please wait while the AI prepares your summary."
      >
        <div style={{ color: "#9ca3af", fontSize: 14 }}>Loading…</div>
      </OnboardingLayout>
    );
  }

  /* Extract fields */
  const {
    brokerStyle,
    policyTypes,
    limits,
    endorsements,
    recommendedRules,
    observations,
  } = ai;

  /* ============================
     Neon Chip Component
  ============================ */
  function Chip({ text, color = "#38bdf8" }) {
    return (
      <span
        style={{
          display: "inline-flex",
          padding: "4px 10px",
          borderRadius: 999,
          fontSize: 11,
          color,
          border: `1px solid ${color}80`,
          background: "rgba(15,23,42,0.85)",
          textShadow: `0 0 6px ${color}88`,
          marginRight: 6,
          marginBottom: 6,
        }}
      >
        {text}
      </span>
    );
  }

  /* ============================
     Cinematic Block Component
  ============================ */
  function Block({ title, children }) {
    return (
      <div
        style={{
          marginBottom: 20,
          padding: 20,
          borderRadius: 20,
          border: "1px solid rgba(148,163,184,0.35)",
          background:
            "radial-gradient(circle at top,rgba(15,23,42,0.9),rgba(15,23,42,0.7))",
          boxShadow:
            "0 0 25px rgba(0,0,0,0.5), inset 0 0 20px rgba(0,0,0,0.4), 0 0 16px rgba(56,189,248,0.25)",
          backdropFilter: "blur(6px)",
          transition: "transform 0.25s ease, box-shadow 0.25s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.boxShadow =
            "0 0 35px rgba(56,189,248,0.4), inset 0 0 20px rgba(0,0,0,0.4)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0px)";
          e.currentTarget.style.boxShadow =
            "0 0 25px rgba(0,0,0,0.5), inset 0 0 20px rgba(0,0,0,0.4), 0 0 16px rgba(56,189,248,0.25)";
        }}
      >
        <h3
          style={{
            marginTop: 0,
            marginBottom: 12,
            fontSize: 16,
            color: "#e5e7eb",
            textShadow: "0 0 8px rgba(56,189,248,0.45)",
            letterSpacing: "0.04em",
          }}
        >
          {title}
        </h3>
        {children}
      </div>
    );
  }

  return (
    <OnboardingLayout
      currentKey="sample-coi"
      title="AI COI Summary"
      subtitle="Your sample COI has been analyzed and used to auto-calibrate your rule engine."
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1.8fr) minmax(0,1fr)",
          gap: 28,
        }}
      >
        {/* LEFT SIDE */}
        <div>
          <Block title="Broker Formatting Style">
            <p style={{ fontSize: 14, color: "#9ca3af" }}>{brokerStyle}</p>
          </Block>

          <Block title="Detected Policy Types">
            {policyTypes?.map((p, i) => (
              <Chip key={i} text={p} />
            ))}
          </Block>

          <Block title="Limits Extracted">
            {Object.entries(limits || {}).map(([policy, vals], i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <strong style={{ color: "#e5e7eb" }}>{policy}</strong>
                <pre
                  style={{
                    background: "rgba(2,6,23,0.6)",
                    padding: "10px 12px",
                    borderRadius: 12,
                    fontSize: 12,
                    marginTop: 6,
                    overflowX: "auto",
                  }}
                >
                  {JSON.stringify(vals, null, 2)}
                </pre>
              </div>
            ))}
          </Block>

          <Block title="Endorsements Detected">
            {endorsements?.map((e, i) => (
              <Chip key={i} text={e} color="#a855f7" />
            ))}
          </Block>

          <Block title="AI Recommended Rule Defaults">
            <pre
              style={{
                background: "rgba(2,6,23,0.6)",
                padding: 14,
                borderRadius: 12,
                fontSize: 12,
              }}
            >
              {JSON.stringify(recommendedRules, null, 2)}
            </pre>
          </Block>

          <Block title="AI Observations">
            <p style={{ fontSize: 14, color: "#9ca3af" }}>{observations}</p>
          </Block>

          {/* CONFIRM BUTTON */}
          <button
            onClick={handleConfirm}
            disabled={loading}
            style={{
              marginTop: 20,
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
                "0 0 25px rgba(56,189,248,0.55), 0 0 50px rgba(88,28,135,0.35)",
              transition: "0.3s",
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

        {/* RIGHT SIDE — INFO PANEL */}
        <div
          style={{
            borderRadius: 20,
            padding: 18,
            border: "1px solid rgba(148,163,184,0.45)",
            background:
              "radial-gradient(circle at 20% 0%,rgba(15,23,42,0.98),rgba(15,23,42,0.94))",
            boxShadow: "0 0 25px rgba(0,0,0,0.45)",
            fontSize: 14,
            color: "#9ca3af",
            lineHeight: 1.6,
          }}
        >
          <h3 style={{ color: "#e5e7eb", marginTop: 0 }}>Why this matters</h3>
          <p>
            This analysis lets the platform auto-tune how it reads your vendors’
            future COIs with extremely high accuracy.
          </p>
          <ul style={{ paddingLeft: 20 }}>
            <li>Better endorsement detection</li>
            <li>Fewer manual corrections</li>
            <li>Improved renewal alerts</li>
            <li>Accurate rule matching</li>
            <li>Reduced false positives</li>
          </ul>
        </div>
      </div>
    </OnboardingLayout>
  );
}
