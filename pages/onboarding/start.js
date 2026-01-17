// pages/onboarding/start.js
// ============================================================
// ONBOARDING START — Creates org and begins onboarding flow
// ============================================================

import { useState } from "react";
import { useRouter } from "next/router";
import { useOrg } from "../../context/OrgContext";
import OnboardingLayout from "../../components/onboarding/OnboardingLayout";

export default function OnboardingStart() {
  const router = useRouter();
  const { orgs, setActiveOrg } = useOrg();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // If user already has an org, they can continue
  const hasOrg = orgs && orgs.length > 0;

  async function handleStartOnboarding() {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("supabase_token") || "";

      // Create org (or get existing)
      const res = await fetch("/api/orgs/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const json = await res.json();

      if (!json.ok) {
        throw new Error(json.error || "Failed to create organization");
      }

      // Activate the org
      if (json.org) {
        setActiveOrg(json.org);

        // Store org info for subsequent requests
        if (json.org.external_uuid) {
          localStorage.setItem("verivo:activeOrgUuid", json.org.external_uuid);
        }
        if (json.org.id) {
          localStorage.setItem("verivo:activeOrgId", String(json.org.id));
        }
      }

      // Navigate to next step
      router.push("/onboarding/company");
    } catch (err) {
      console.error("[onboarding/start] error:", err);
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <OnboardingLayout
      currentKey="start"
      title="Welcome to Verivo"
      subtitle="We'll configure your organization, coverage rules, and vendor workflow so your team can hit the ground running."
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,2fr) minmax(0,1.2fr)",
          gap: 18,
          alignItems: "flex-start",
        }}
      >
        <div>
          <h2
            style={{
              marginTop: 0,
              marginBottom: 10,
              fontSize: 18,
              color: "#e5e7eb",
            }}
          >
            What we'll do in this wizard:
          </h2>
          <ul
            style={{
              margin: 0,
              paddingLeft: 18,
              fontSize: 14,
              color: "#cbd5f5",
              lineHeight: 1.6,
            }}
          >
            <li>Capture your company profile and core settings.</li>
            <li>Upload your vendor list (CSV) for bulk onboarding.</li>
            <li>Select your required insurance coverages and limits.</li>
            <li>Configure your AI rules engine defaults.</li>
            <li>Invite your internal team.</li>
          </ul>

          {error && (
            <div
              style={{
                marginTop: 16,
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

          <button
            onClick={handleStartOnboarding}
            disabled={loading}
            style={{
              marginTop: 20,
              padding: "12px 28px",
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
            {loading ? "Setting up..." : hasOrg ? "Continue Onboarding →" : "Start Onboarding →"}
          </button>
        </div>

        <div
          style={{
            borderRadius: 18,
            padding: 14,
            border: "1px solid rgba(56,189,248,0.5)",
            background:
              "radial-gradient(circle at top,rgba(15,23,42,0.98),rgba(15,23,42,0.96))",
            boxShadow:
              "0 0 26px rgba(56,189,248,0.4),0 0 50px rgba(15,23,42,1)",
          }}
        >
          <div
            style={{
              fontSize: 13,
              color: "#a5b4fc",
              marginBottom: 6,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
            }}
          >
            Estimated time
          </div>
          <div style={{ fontSize: 22, marginBottom: 12 }}>≈ 5–8 minutes</div>
          <div style={{ fontSize: 13, color: "#9ca3af" }}>
            You can safely stop at any point. Your progress is saved as you go.
          </div>
        </div>
      </div>
    </OnboardingLayout>
  );
}
