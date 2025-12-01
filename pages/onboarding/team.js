// pages/onboarding/team.js
import { useState } from "react";
import OnboardingLayout from "../../components/onboarding/OnboardingLayout";

export default function OnboardingTeam() {
  const [emails, setEmails] = useState("");

  return (
    <OnboardingLayout
      currentKey="team"
      title="Invite Your Internal Team"
      subtitle="Add the compliance, risk, and operations people who should receive alerts and review exceptions."
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1.5fr) minmax(0,1.2fr)",
          gap: 20,
        }}
      >
        <div>
          <label
            style={{
              display: "block",
              fontSize: 11,
              color: "#9ca3af",
              marginBottom: 4,
            }}
          >
            Team emails (comma-separated)
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
          <div
            style={{
              marginTop: 8,
              fontSize: 12,
              color: "#9ca3af",
            }}
          >
            We’ll send them a secure invite with magic-link login. You control roles
            and permissions later from the admin area.
          </div>
        </div>

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
            Suggestions
          </h3>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li>Head of Risk / Compliance.</li>
            <li>Whoever chases vendors for updated COIs.</li>
            <li>Any regional ops managers who own vendor relationships.</li>
          </ul>
        </div>
      </div>
    </OnboardingLayout>
  );
}
