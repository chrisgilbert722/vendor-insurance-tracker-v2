// pages/onboarding/ai-wizard.js
// ============================================================
// AI Onboarding Wizard V5 — UUID-SAFE
// - Reads ONLY activeOrgUuid
// - No redirects
// - No legacy org_id assumptions
// - No auth logic
// - Fail-open UI (never bricks app)
// ============================================================

import { useOrg } from "../../context/OrgContext";
import AiWizardPanel from "../../components/onboarding/AiWizardPanel";

export default function AiOnboardingWizardPage() {
  const { activeOrgUuid, loading } = useOrg();

  // Still resolving org context
  if (loading) {
    return (
      <div style={{ padding: 40, color: "#9ca3af" }}>
        Loading organization…
      </div>
    );
  }

  // Org exists but UUID missing (should be rare)
  if (!activeOrgUuid) {
    return (
      <div
        style={{
          padding: 24,
          margin: 40,
          borderRadius: 16,
          background: "rgba(15,23,42,0.95)",
          border: "1px solid rgba(239,68,68,0.6)",
          color: "#fecaca",
        }}
      >
        Invalid organization context. Please re-select your organization.
      </div>
    );
  }

  // ✅ UUID IS SOURCE OF TRUTH
  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "32px 40px",
        color: "#e5e7eb",
        background:
          "radial-gradient(circle at top left,#020617 0,#020617 45%,#000 100%)",
      }}
    >
      <div
        style={{
          borderRadius: 32,
          padding: 22,
          background:
            "radial-gradient(circle at top left,rgba(15,23,42,0.98),rgba(15,23,42,0.95))",
          border: "1px solid rgba(148,163,184,0.45)",
          boxShadow: "0 0 60px rgba(15,23,42,0.95)",
        }}
      >
        {/* 🔒 AUTOPILOT WIZARD — UUID ONLY */}
        <AiWizardPanel orgId={activeOrgUuid} />
      </div>
    </div>
  );
}
