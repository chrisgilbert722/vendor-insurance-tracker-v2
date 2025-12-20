// pages/onboarding/ai-wizard.js
// AI Onboarding Wizard V5 — AUTOPILOT SHELL (UUID-CORRECT)

import { useEffect, useState } from "react";
import AiWizardPanel from "../../components/onboarding/AiWizardPanel";

export default function AiOnboardingWizardPage() {
  const [orgUuid, setOrgUuid] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🔑 Fetch canonical org object (contains UUID)
  useEffect(() => {
    let mounted = true;

    async function loadOrg() {
      try {
        const res = await fetch("/organization.json");
        const json = await res.json();

        if (mounted && json?.uuid) {
          setOrgUuid(json.uuid);
        }
      } catch (_) {
        // noop
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadOrg();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 40, color: "#9ca3af" }}>
        Loading organization…
      </div>
    );
  }

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
        {/* 🔒 AUTOPILOT WIZARD (UUID ONLY) */}
        <AiWizardPanel orgId={orgUuid} />
      </div>
    </div>
  );
}
