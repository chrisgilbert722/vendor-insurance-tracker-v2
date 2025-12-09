// components/onboarding/AiWizardPanel.js
// AI Onboarding Wizard V5 — Step Router
// Receives: { orgId, step, stepIndex, totalSteps, wizardState, setWizardState }

import VendorsUploadStep from "./VendorsUploadStep";

export default function AiWizardPanel({
  orgId,
  step,
  stepIndex,
  totalSteps,
  wizardState,
  setWizardState,
}) {
  if (!step) {
    return null;
  }

  // Route to the correct step component based on step.id from ai-wizard.js
  switch (step.id) {
    case "vendors-upload":
      return (
        <VendorsUploadStep
          orgId={orgId}
          wizardState={wizardState}
          setWizardState={setWizardState}
        />
      );

    // You can add more cases here later:
    // case "vendors-map":
    // case "vendors-analyze":
    // case "contracts-upload":
    // case "rules-generate":
    // etc.

    default:
      // Temporary placeholder for steps not wired yet
      return (
        <div
          style={{
            padding: 18,
            borderRadius: 18,
            background: "rgba(15,23,42,0.94)",
            border: "1px solid rgba(51,65,85,0.9)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.55)",
            fontSize: 13,
            color: "#9ca3af",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              fontSize: 18,
              fontWeight: 600,
              color: "#e5e7eb",
            }}
          >
            {step.title || step.label}
          </h2>
          <p style={{ marginTop: 6 }}>
            This wizard step ({step.id}) has not been fully wired yet. You can
            continue through the wizard while we hook in the detailed UI.
          </p>
        </div>
      );
  }
}
