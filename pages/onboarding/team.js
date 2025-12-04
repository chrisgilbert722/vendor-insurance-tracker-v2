// pages/onboarding/team.js
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import OnboardingLayout from "../../components/onboarding/OnboardingLayout";

export default function OnboardingTeam() {
  const router = useRouter();

  const [emails, setEmails] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* ==========================================================
     SECTION 1 — LOAD AI-RECOMMENDED TEAM SUGGESTIONS
     ========================================================== */
  useEffect(() => {
    try {
      const raw = localStorage.getItem("onboarding_ai_intel");
      if (!raw) return;

      const intel = JSON.parse(raw);

      // If AI provided team suggestions, load them into textarea
      if (intel?.teamSuggestions?.length > 0) {
        const suggested = intel.teamSuggestions.join(", ");
        setEmails(suggested);
        console.log("AI Team Suggestions Applied:", suggested);
      }
    } catch (err) {
      console.warn("Could not load AI intel:", err);
    }
  }, []);

  /* ==========================================================
     PARSE EMAILS
     ========================================================== */
  function parseEmails(raw) {
    return raw
      .split(",")
      .map((e) => e.trim())
      .filter((e) => e.length > 3 && e.includes("@"));
  }

  /* ==========================================================
     SUBMIT HANDLER
     ========================================================== */
  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const emailList = parseEmails(emails);

    if (emailList.length === 0) {
      setError("Enter at least one valid email address.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/onboarding/team", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${
            localStorage.getItem("supabase_token") || ""
          }`,
        },
        body: JSON.stringify({ emails: emailList }),
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Could not invite team.");

      router.push("/onboarding/vendors");
    } catch (err) {
      console.error(err);
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <OnboardingLayout
      currentKey="team"
      title="Invite Your Internal Team"
      subtitle="Invite operations, compliance, and risk team members to your workspace."
    >
      <form onSubmit={handleSubmit}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1.5fr) minmax(0,1.2fr)",
            gap: 20,
          }}
        >
          {/* LEFT SIDE — EMAIL ENTRY */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: 11,
                color: "#9ca3af",
                marginBottom: 6,
              }}
            >
              Team Member Emails (comma-separated)
            </label>

            <textarea
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder="risk.manager@company.com, ops.director@company.com"
              rows={5}
              style={{
                width: "100%",
                borderRadius: 16,
                padding: "10px 12px",
                border: "1px solid rgba(51,65,85,0.9)",
                background: "rgba(15,23,42,0.96)",
                color: "#e5e7eb",
                fontSize: 13,
                outline: "none",
                resize: "vertical",
              }}
            />

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
              {loading ? "Sending..." : "Send Invites & Continue →"}
            </button>
          </div>

          {/* RIGHT SIDE — INFO PANEL */}
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
                marginBottom: 8,
                fontSize: 15,
                color: "#e5e7eb",
              }}
            >
              Who should you invite?
            </h3>

            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>Risk & Compliance leadership.</li>
              <li>Operations managers responsible for vendor compliance.</li>
              <li>Anyone who chases vendors for updated COIs.</li>
            </ul>

            <p style={{ marginTop: 14, fontSize: 12, color: "#a5b4fc" }}>
              They’ll receive magic-link login invitations immediately.
            </p>
          </div>
        </div>
      </form>
    </OnboardingLayout>
  );
}
